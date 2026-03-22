/**
 * Tests for lib/messagePayload.ts
 * Covers: encrypt/decrypt roundtrip, selfDestruct inside encrypted payload,
 * backward compatibility with legacy envelope, invalid ciphertext handling.
 */

import { describe, it, expect } from 'vitest';
import {
  encodeMessagePayload,
  decodeMessagePayload,
  getSenderExchangeKeyFromPayload,
  type DecodedMessagePayload,
} from '@/lib/messagePayload';
import { generateExchangeKeyPair } from '@/crypto/keys';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeKeyPairs() {
  const sender = generateExchangeKeyPair();
  const recipient = generateExchangeKeyPair();
  return { sender, recipient };
}

// ── encodeMessagePayload / decodeMessagePayload roundtrip ────────────────────

describe('encodeMessagePayload / decodeMessagePayload', () => {
  it('roundtrip: encrypt then decrypt returns original content', () => {
    const { sender, recipient } = makeKeyPairs();
    const content = 'Hello, secure world!';
    const timestamp = Date.now();

    const payload = encodeMessagePayload(
      content,
      timestamp,
      null,
      sender.publicKey,
      sender.secretKey,
      recipient.publicKey,
    );

    const decoded = decodeMessagePayload(
      payload,
      recipient.secretKey,
      sender.publicKey,
    );

    expect(decoded).not.toBeNull();
    expect(decoded!.content).toBe(content);
    expect(decoded!.timestamp).toBe(timestamp);
    expect(decoded!.selfDestruct).toBeNull();
  });

  it('preserves selfDestruct timer inside encrypted payload', () => {
    const { sender, recipient } = makeKeyPairs();
    const content = 'Ephemeral message';
    const timestamp = Date.now();
    const selfDestruct = 30;

    const payload = encodeMessagePayload(
      content,
      timestamp,
      selfDestruct,
      sender.publicKey,
      sender.secretKey,
      recipient.publicKey,
    );

    // Verify selfDestruct is NOT in the outer envelope
    const envelope = JSON.parse(payload);
    expect(envelope.selfDestruct).toBeUndefined();
    // Envelope should have: v, alg, senderExchangeKey, ciphertext, nonce, timestamp
    expect(envelope.v).toBe(1);
    expect(envelope.alg).toBe('nacl-box');

    // But decryption should recover selfDestruct
    const decoded = decodeMessagePayload(
      payload,
      recipient.secretKey,
      sender.publicKey,
    );

    expect(decoded).not.toBeNull();
    expect(decoded!.selfDestruct).toBe(selfDestruct);
    expect(decoded!.content).toBe(content);
  });

  it('handles undefined selfDestruct (encodes as null)', () => {
    const { sender, recipient } = makeKeyPairs();

    const payload = encodeMessagePayload(
      'test',
      Date.now(),
      undefined,
      sender.publicKey,
      sender.secretKey,
      recipient.publicKey,
    );

    const decoded = decodeMessagePayload(
      payload,
      recipient.secretKey,
      sender.publicKey,
    );

    expect(decoded).not.toBeNull();
    expect(decoded!.selfDestruct).toBeNull();
  });

  it('decodes using senderExchangeKey from envelope when not provided explicitly', () => {
    const { sender, recipient } = makeKeyPairs();

    const payload = encodeMessagePayload(
      'auto-key',
      Date.now(),
      null,
      sender.publicKey,
      sender.secretKey,
      recipient.publicKey,
    );

    // Don't pass sender public key — should extract from envelope
    const decoded = decodeMessagePayload(payload, recipient.secretKey);

    expect(decoded).not.toBeNull();
    expect(decoded!.content).toBe('auto-key');
  });

  it('handles unicode content correctly', () => {
    const { sender, recipient } = makeKeyPairs();
    const content = 'Привет мир! 日本語 العربية';

    const payload = encodeMessagePayload(
      content,
      Date.now(),
      null,
      sender.publicKey,
      sender.secretKey,
      recipient.publicKey,
    );

    const decoded = decodeMessagePayload(
      payload,
      recipient.secretKey,
      sender.publicKey,
    );

    expect(decoded!.content).toBe(content);
  });

  it('handles empty string content', () => {
    const { sender, recipient } = makeKeyPairs();

    const payload = encodeMessagePayload(
      '',
      Date.now(),
      null,
      sender.publicKey,
      sender.secretKey,
      recipient.publicKey,
    );

    const decoded = decodeMessagePayload(
      payload,
      recipient.secretKey,
      sender.publicKey,
    );

    expect(decoded).not.toBeNull();
    expect(decoded!.content).toBe('');
  });
});

// ── Backward compatibility: legacy envelope ──────────────────────────────────

describe('backward compatibility — legacy envelope', () => {
  it('decodes legacy plaintext envelope with content field', () => {
    const legacy = JSON.stringify({
      content: 'Old message format',
      timestamp: 1700000000000,
      selfDestruct: 60,
    });

    const decoded = decodeMessagePayload(legacy, 'unused_key');

    expect(decoded).not.toBeNull();
    expect(decoded!.content).toBe('Old message format');
    expect(decoded!.timestamp).toBe(1700000000000);
    expect(decoded!.selfDestruct).toBe(60);
  });

  it('decodes legacy envelope without timestamp', () => {
    const legacy = JSON.stringify({ content: 'No timestamp' });

    const decoded = decodeMessagePayload(legacy, 'unused_key');

    expect(decoded).not.toBeNull();
    expect(decoded!.content).toBe('No timestamp');
    expect(decoded!.timestamp).toBeGreaterThan(0); // defaults to Date.now()
  });

  it('reads selfDestruct from old envelope.selfDestruct for backward compat', () => {
    // In old format, selfDestruct was on the outer envelope, not inside encrypted payload
    const { sender, recipient } = makeKeyPairs();

    // Create a v1 envelope but with selfDestruct on the outside (old behavior)
    // The current encodeMessagePayload puts it inside, but a receiver should
    // handle both locations
    const oldEnvelope = JSON.stringify({
      content: 'legacy self-destruct',
      timestamp: Date.now(),
      selfDestruct: 120,
    });

    const decoded = decodeMessagePayload(oldEnvelope, recipient.secretKey);
    expect(decoded).not.toBeNull();
    expect(decoded!.selfDestruct).toBe(120);
  });
});

// ── Invalid input handling ───────────────────────────────────────────────────

describe('invalid input handling', () => {
  it('returns null for non-JSON payload', () => {
    const decoded = decodeMessagePayload('not-json', 'key');
    expect(decoded).toBeNull();
  });

  it('returns null for JSON without content field', () => {
    const decoded = decodeMessagePayload('{"foo":"bar"}', 'key');
    expect(decoded).toBeNull();
  });

  it('returns null for encrypted envelope with wrong recipient key', () => {
    const { sender, recipient } = makeKeyPairs();
    const wrongRecipient = generateExchangeKeyPair();

    const payload = encodeMessagePayload(
      'secret',
      Date.now(),
      null,
      sender.publicKey,
      sender.secretKey,
      recipient.publicKey,
    );

    const decoded = decodeMessagePayload(
      payload,
      wrongRecipient.secretKey,
      sender.publicKey,
    );

    expect(decoded).toBeNull();
  });

  it('returns null for encrypted envelope with tampered ciphertext', () => {
    const { sender, recipient } = makeKeyPairs();

    const payload = encodeMessagePayload(
      'secret',
      Date.now(),
      null,
      sender.publicKey,
      sender.secretKey,
      recipient.publicKey,
    );

    const envelope = JSON.parse(payload);
    // Tamper with ciphertext
    envelope.ciphertext = envelope.ciphertext.slice(0, -4) + 'AAAA';

    const decoded = decodeMessagePayload(
      JSON.stringify(envelope),
      recipient.secretKey,
      sender.publicKey,
    );

    expect(decoded).toBeNull();
  });

  it('returns null for empty string payload', () => {
    const decoded = decodeMessagePayload('', 'key');
    expect(decoded).toBeNull();
  });
});

// ── getSenderExchangeKeyFromPayload ──────────────────────────────────────────

describe('getSenderExchangeKeyFromPayload', () => {
  it('extracts sender exchange key from encrypted envelope', () => {
    const { sender, recipient } = makeKeyPairs();

    const payload = encodeMessagePayload(
      'test',
      Date.now(),
      null,
      sender.publicKey,
      sender.secretKey,
      recipient.publicKey,
    );

    const key = getSenderExchangeKeyFromPayload(payload);
    expect(key).toBe(sender.publicKey);
  });

  it('returns null for legacy envelope without senderExchangeKey', () => {
    const legacy = JSON.stringify({ content: 'old' });
    expect(getSenderExchangeKeyFromPayload(legacy)).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(getSenderExchangeKeyFromPayload('not-json')).toBeNull();
  });
});
