import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';

const API_URL = 'http://localhost:3001/api';

async function testSecurity() {
  console.log('--- Testing Security Fixes ---');

  const keyPair = nacl.sign.keyPair();
  const identityKey = encodeBase64(keyPair.publicKey);

  // 1. Unauthenticated Request (Should FAIL)
  console.log('\n1. Testing Unauthenticated Request...');
  try {
    const res = await fetch(`${API_URL}/auth/prekeys`, {
      method: 'POST',
      body: JSON.stringify({ userId: 'fake', prekeys: [] }),
      headers: { 'Content-Type': 'application/json' },
    });
    console.log(`Status: ${res.status} (Expected 401)`);
  } catch (e) {
    console.log('Error:', (e as Error).message);
  }

  // 2. Authenticated Request with Wrong Key (Should FAIL)
  console.log('\n2. Testing Request with Invalid Signature...');
  const method = 'POST';
  const path = '/auth/prekeys';
  const timestamp = Date.now().toString();
  const nonce = `${Date.now()}-${crypto.randomUUID()}`;
  const body = { userId: 'fake', prekeys: [] };
  const bodyString = JSON.stringify(body);
  const message = `${timestamp}.${nonce}.${method}.${path}.${bodyString}`;
  const messageBytes = new TextEncoder().encode(message);
  // Sign with random key, not the one in header (simulating attack)
  const fakeKeyPair = nacl.sign.keyPair();
  const signature = encodeBase64(nacl.sign.detached(messageBytes, fakeKeyPair.secretKey));

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      body: bodyString,
      headers: {
        'Content-Type': 'application/json',
        'X-Lume-Identity-Key': identityKey,
        'X-Lume-Signature': signature,
        'X-Lume-Timestamp': timestamp,
        'X-Lume-Nonce': nonce,
        'X-Lume-Path': path,
      },
    });
    console.log(`Status: ${res.status} (Expected 403 or 401)`);
  } catch (e) {
    console.log('Error:', (e as Error).message);
  }
}

testSecurity();
