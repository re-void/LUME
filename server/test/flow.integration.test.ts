process.env.DB_PATH = ':memory:';
process.env.WS_JWT_SECRET = 'x'.repeat(40);

import request from 'supertest';
import express from 'express';
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';
import { describe, it, expect } from 'vitest';

import authRoutes from '../src/routes/auth';
import messageRoutes from '../src/routes/messages';

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/messages', messageRoutes);
  app.use((_req, res) => res.sendStatus(404));
  return app;
}

function signHeaders(method: string, path: string, body: unknown, keyPair: nacl.SignKeyPair) {
  const timestamp = Date.now().toString();
  const nonce = `test-${Math.random().toString(36).slice(2)}`;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const bodyString = body && Object.keys(body as object).length > 0 ? JSON.stringify(body) : '';
  const msg = `${timestamp}.${nonce}.${method.toUpperCase()}.${normalizedPath}.${bodyString}`;
  const sig = nacl.sign.detached(new TextEncoder().encode(msg), keyPair.secretKey);
  return {
    'X-Lume-Identity-Key': encodeBase64(keyPair.publicKey),
    'X-Lume-Signature': encodeBase64(sig),
    'X-Lume-Timestamp': timestamp,
    'X-Lume-Nonce': nonce,
    'X-Lume-Path': normalizedPath,
  };
}

function makeUser(username: string) {
  const idKey = nacl.sign.keyPair();
  const spk = nacl.sign.keyPair();
  const signedPrekeySig = nacl.sign.detached(spk.publicKey, idKey.secretKey);
  return {
    username,
    idKey,
    idPublic: encodeBase64(idKey.publicKey),
    signedPrekey: encodeBase64(spk.publicKey),
    signedPrekeySignature: encodeBase64(signedPrekeySig),
  };
}

describe('integration: auth + messages flow', () => {
  const app = buildApp();

  it('register -> bundle -> send -> pending -> ack', async () => {
    const alice = makeUser('alice_' + Math.random().toString(16).slice(2, 6));
    const bob = makeUser('bob_' + Math.random().toString(16).slice(2, 6));

    let res = await request(app).post('/api/auth/register').send({
      username: alice.username,
      identityKey: alice.idPublic,
      signedPrekey: alice.signedPrekey,
      signedPrekeySignature: alice.signedPrekeySignature,
      oneTimePrekeys: [],
    });
    expect([201, 409]).toContain(res.status);
    const aliceId = res.body.id || res.body?.userId || res.body?.message || 'alice-id';

    res = await request(app).post('/api/auth/register').send({
      username: bob.username,
      identityKey: bob.idPublic,
      signedPrekey: bob.signedPrekey,
      signedPrekeySignature: bob.signedPrekeySignature,
      oneTimePrekeys: [],
    });
    expect([201, 409]).toContain(res.status);
    const bobId = res.body.id || res.body?.userId || res.body?.message || 'bob-id';

    const bundleHeaders = signHeaders('POST', '/auth/bundle', { username: bob.username }, bob.idKey);
    res = await request(app).post('/api/auth/bundle').set(bundleHeaders).send({ username: bob.username });
    expect(res.status).toBe(200);

    const payload = JSON.stringify({
      v: 1,
      alg: 'nacl-box',
      senderExchangeKey: encodeBase64(nacl.randomBytes(32)),
      ciphertext: encodeBase64(nacl.randomBytes(48)),
      nonce: encodeBase64(nacl.randomBytes(nacl.box.nonceLength)),
      timestamp: Date.now(),
    });
    const sendBody = { senderId: aliceId, recipientUsername: bob.username, encryptedPayload: payload };
    const sendHeaders = signHeaders('POST', '/messages/send', sendBody, alice.idKey);
    res = await request(app).post('/api/messages/send').set(sendHeaders).send(sendBody);
    expect(res.status).toBe(201);
    const messageId = res.body.messageId;

    const pendingHeaders = signHeaders('GET', `/messages/pending/${bobId}`, {}, bob.idKey);
    res = await request(app).get(`/api/messages/pending/${bobId}`).set(pendingHeaders);
    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBeGreaterThan(0);

    const ackHeaders = signHeaders('DELETE', `/messages/${messageId}`, {}, bob.idKey);
    res = await request(app).delete(`/api/messages/${messageId}`).set(ackHeaders);
    expect(res.status).toBe(200);
  });
});
