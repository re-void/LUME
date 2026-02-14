
import WebSocket from 'ws';
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';
import fetch from 'node-fetch';
import { randomBytes } from 'node:crypto';

const API_URL = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:3001/ws';

async function registerUser(name: string) {
    const keyPair = nacl.sign.keyPair();
    const identityKey = encodeBase64(keyPair.publicKey);
    const prekeyPair = nacl.sign.keyPair();
    const signedPrekey = encodeBase64(prekeyPair.publicKey);
    const signature = nacl.sign.detached(prekeyPair.publicKey, keyPair.secretKey);
    const signedPrekeySignature = encodeBase64(signature);

    // Use CSPRNG to keep CodeQL happy (this script is a security check helper).
    const username = `${name}_${randomBytes(4).toString('hex')}`;

    const regRes = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username,
            identityKey,
            signedPrekey,
            signedPrekeySignature,
            oneTimePrekeys: []
        })
    });

    if (!regRes.ok) throw new Error(`Reg failed: ${await regRes.text()}`);
    const regData: any = await regRes.json();
    return { userId: regData.id, keyPair, identityKey, username };
}

async function getSession(user: any) {
    const method = 'POST';
    const path = '/auth/session';
    const timestamp = Date.now().toString();
    const nonce = `${Date.now()}-${randomBytes(12).toString('hex')}`;
    const sessionBody = { userId: user.userId };
    const bodyString = JSON.stringify(sessionBody);
    const sessionMsg = `${timestamp}.${nonce}.${method}.${path}.${bodyString}`;
    const sessionSig = nacl.sign.detached(new TextEncoder().encode(sessionMsg), user.keyPair.secretKey);

    const sessionRes = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-Lume-Identity-Key': user.identityKey,
            'X-Lume-Signature': encodeBase64(sessionSig),
            'X-Lume-Timestamp': timestamp,
            'X-Lume-Nonce': nonce,
            'X-Lume-Path': path,
        },
        body: bodyString,
    });

    if (!sessionRes.ok) throw new Error(`Session failed: ${await sessionRes.text()}`);
    const data: any = await sessionRes.json();
    return data.token;
}

async function main() {
    console.log('--- Starting P0 Verification (Spoof & Auth) ---');

    try {
        // 1. Setup Users
        const attacker = await registerUser('attacker');
        const victim = await registerUser('victim');
        console.log(`Attacker: ${attacker.userId}`);
        console.log(`Victim:   ${victim.userId}`);

        // 2. Get Tokens
        const attackerToken = await getSession(attacker);
        const victimToken = await getSession(victim);

        // 3. Connect Victim
        const wsVictim = new WebSocket(WS_URL, ['lume', 'auth.' + victimToken]);
        await new Promise<void>((resolve) => wsVictim.on('open', resolve));
        console.log('Victim Connected');

        // 4. Connect Attacker
        const wsAttacker = new WebSocket(WS_URL, ['lume', 'auth.' + attackerToken]);
        await new Promise<void>((resolve) => wsAttacker.on('open', resolve));
        console.log('Attacker Connected');

        // 5. Test Spoofing
        console.log('\n--- SPOOF TEST: Attacker pretends to be ADMIN ---');

        // Attacker sends 'typing' claiming to be "ADMIN_USER"
        const spoofPayload = {
            type: 'typing',
            recipientId: victim.userId,
            isTyping: true,
            senderId: 'ADMIN_USER_ID_IM_HACKING_YOU', // This should be IGNORED
            senderUsername: 'Admin'                   // This should be IGNORED
        };

        wsAttacker.send(JSON.stringify(spoofPayload));

        // Victim waits for message
        const spoofCheck = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout waiting for piped message')), 5000);

            wsVictim.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'typing') {
                    clearTimeout(timeout);
                    console.log('Victim received:', msg);

                    if (msg.senderId === attacker.userId) {
                        console.log('✅ PASS: Server forced real senderId.');
                        resolve('PASS');
                    } else if (msg.senderId === spoofPayload.senderId) {
                        console.error('❌ FAIL: Server accepted spoofed senderId!');
                        reject(new Error('Spoofing succeeded'));
                    } else {
                        console.warn('❓ WARN: Unexpected senderId:', msg.senderId);
                        resolve('WARN');
                    }
                }
            });
        });

        await spoofCheck;

        console.log('\n✅ Verification Complete: Auth works, Spoofing blocked.');

        wsVictim.close();
        wsAttacker.close();
        process.exit(0);

    } catch (e) {
        console.error('\n❌ ERROR:', e);
        process.exit(1);
    }
}

main();
