import { describe, expect, it } from 'vitest';
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';

import { isValidEncryptedPayload } from '../src/routes/messages';

describe('isValidEncryptedPayload', () => {
  it('accepts legacy nacl-box envelope', () => {
    const payload = JSON.stringify({
      v: 1,
      alg: 'nacl-box',
      senderExchangeKey: encodeBase64(nacl.randomBytes(32)),
      ciphertext: encodeBase64(nacl.randomBytes(64)),
      nonce: encodeBase64(nacl.randomBytes(nacl.box.nonceLength)),
      timestamp: Date.now(),
    });

    expect(isValidEncryptedPayload(payload)).toBe(true);
  });

  it('accepts ratchet envelope with optional X3DH block', () => {
    const key = encodeBase64(nacl.randomBytes(32));
    const payload = JSON.stringify({
      v: 2,
      alg: 'lume-ratchet',
      header: { publicKey: key, previousChainLength: 0, messageNumber: 1 },
      ciphertext: encodeBase64(nacl.randomBytes(96)),
      nonce: encodeBase64(nacl.randomBytes(nacl.secretbox.nonceLength)),
      timestamp: Date.now(),
      x3dh: {
        senderIdentityKey: key,
        senderEphemeralKey: key,
        recipientOneTimePreKey: key,
      },
    });

    expect(isValidEncryptedPayload(payload)).toBe(true);
  });

  it('rejects malformed payloads', () => {
    expect(isValidEncryptedPayload('')).toBe(false);
    expect(isValidEncryptedPayload('{}')).toBe(false);
    const badNonce = JSON.stringify({
      v: 2,
      alg: 'lume-ratchet',
      header: { publicKey: encodeBase64(nacl.randomBytes(32)), previousChainLength: 0, messageNumber: 1 },
      ciphertext: encodeBase64(nacl.randomBytes(96)),
      nonce: encodeBase64(nacl.randomBytes(8)), // wrong length
      timestamp: Date.now(),
    });
    expect(isValidEncryptedPayload(badNonce)).toBe(false);
  });
});
