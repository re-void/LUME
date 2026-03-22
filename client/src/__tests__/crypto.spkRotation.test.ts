/**
 * Tests for crypto/spkRotation.ts
 * Covers: rotation when expired, no rotation when fresh, grace period cleanup,
 * backfillSpkCreatedAt.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { clear } from 'idb-keyval';

import {
  checkAndRotateSpk,
  backfillSpkCreatedAt,
  SPK_ROTATION_INTERVAL_MS,
  PREVIOUS_SPK_GRACE_PERIOD_MS,
} from '@/crypto/spkRotation';
import {
  savePreKeyMaterial,
  loadPreKeyMaterial,
  type LocalPreKeyMaterial,
  clearCachedMasterKey,
  deriveMasterKeyFromPin,
} from '@/crypto/storage';
import { generateIdentityKeys, generateExchangeKeyPair } from '@/crypto/keys';

// Mock authApi so we don't make real HTTP calls
vi.mock('@/lib/api', () => ({
  authApi: {
    updateSignedPrekey: vi.fn().mockResolvedValue({ error: null }),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFreshMaterial(spkAge: number = 0): LocalPreKeyMaterial {
  const now = Date.now();
  return {
    signedPreKey: generateExchangeKeyPair(),
    oneTimePreKeys: [generateExchangeKeyPair()],
    updatedAt: now,
    spkCreatedAt: now - spkAge,
  };
}

let masterKey: Uint8Array;
const identityKeys = generateIdentityKeys();
const userId = 'test-user-id';

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  clearCachedMasterKey();
  await clear();
  masterKey = await deriveMasterKeyFromPin('test-pin');
  vi.clearAllMocks();
});

// ── checkAndRotateSpk ────────────────────────────────────────────────────────

describe('checkAndRotateSpk', () => {
  it('does NOT rotate when SPK is fresh', async () => {
    const material = makeFreshMaterial(0); // just created
    await savePreKeyMaterial(material, masterKey);

    const result = await checkAndRotateSpk(masterKey, userId, identityKeys);

    expect(result.rotated).toBe(false);
    expect(result.error).toBeUndefined();

    // SPK should be unchanged
    const loaded = await loadPreKeyMaterial(masterKey);
    expect(loaded!.signedPreKey.publicKey).toBe(material.signedPreKey.publicKey);
  });

  it('rotates when SPK is older than SPK_ROTATION_INTERVAL_MS', async () => {
    const oldSpkPubKey = generateExchangeKeyPair().publicKey;
    const material = makeFreshMaterial(SPK_ROTATION_INTERVAL_MS + 1000);
    material.signedPreKey = { publicKey: oldSpkPubKey, secretKey: 'old_secret' };
    await savePreKeyMaterial(material, masterKey);

    const result = await checkAndRotateSpk(masterKey, userId, identityKeys);

    expect(result.rotated).toBe(true);

    // Verify the SPK was actually changed
    const loaded = await loadPreKeyMaterial(masterKey);
    expect(loaded!.signedPreKey.publicKey).not.toBe(oldSpkPubKey);

    // Previous SPK should be saved for grace period
    expect(loaded!.previousSignedPreKey).toBeDefined();
    expect(loaded!.previousSignedPreKey!.publicKey).toBe(oldSpkPubKey);
    expect(loaded!.previousSpkRetiredAt).toBeDefined();
  });

  it('rotates when spkCreatedAt is undefined (infinity age)', async () => {
    const material = makeFreshMaterial(0);
    material.spkCreatedAt = undefined;
    await savePreKeyMaterial(material, masterKey);

    const result = await checkAndRotateSpk(masterKey, userId, identityKeys);
    expect(result.rotated).toBe(true);
  });

  it('cleans up previous SPK after grace period expires', async () => {
    const now = Date.now();
    const material = makeFreshMaterial(0); // fresh SPK — no rotation needed
    // But there's an old previous SPK that has exceeded the grace period
    material.previousSignedPreKey = generateExchangeKeyPair();
    material.previousSpkRetiredAt = now - PREVIOUS_SPK_GRACE_PERIOD_MS - 1000;
    await savePreKeyMaterial(material, masterKey);

    const result = await checkAndRotateSpk(masterKey, userId, identityKeys);

    expect(result.rotated).toBe(false);

    // Previous SPK should be cleaned up
    const loaded = await loadPreKeyMaterial(masterKey);
    expect(loaded!.previousSignedPreKey).toBeUndefined();
    expect(loaded!.previousSpkRetiredAt).toBeUndefined();
  });

  it('keeps previous SPK within grace period', async () => {
    const now = Date.now();
    const material = makeFreshMaterial(0);
    material.previousSignedPreKey = generateExchangeKeyPair();
    material.previousSpkRetiredAt = now - 1000; // just retired, within grace
    await savePreKeyMaterial(material, masterKey);

    await checkAndRotateSpk(masterKey, userId, identityKeys);

    const loaded = await loadPreKeyMaterial(masterKey);
    expect(loaded!.previousSignedPreKey).toBeDefined();
  });

  it('returns error when no prekey material found', async () => {
    // Don't save any material
    const result = await checkAndRotateSpk(masterKey, userId, identityKeys);
    expect(result.rotated).toBe(false);
    expect(result.error).toBe('No prekey material found');
  });

  it('reports upload error but still persists locally', async () => {
    const { authApi } = await import('@/lib/api');
    (authApi.updateSignedPrekey as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      error: 'Network error',
    });

    const material = makeFreshMaterial(SPK_ROTATION_INTERVAL_MS + 1000);
    await savePreKeyMaterial(material, masterKey);

    const result = await checkAndRotateSpk(masterKey, userId, identityKeys);

    expect(result.rotated).toBe(true);
    expect(result.error).toContain('SPK upload failed');

    // Local state should still be updated
    const loaded = await loadPreKeyMaterial(masterKey);
    expect(loaded!.signedPreKey.publicKey).not.toBe(material.signedPreKey.publicKey);
  });
});

// ── backfillSpkCreatedAt ─────────────────────────────────────────────────────

describe('backfillSpkCreatedAt', () => {
  it('sets spkCreatedAt to updatedAt when undefined', () => {
    const material: LocalPreKeyMaterial = {
      signedPreKey: generateExchangeKeyPair(),
      oneTimePreKeys: [],
      updatedAt: 1700000000000,
      spkCreatedAt: undefined,
    };

    const result = backfillSpkCreatedAt(material);
    expect(result.spkCreatedAt).toBe(1700000000000);
  });

  it('does not overwrite existing spkCreatedAt', () => {
    const material: LocalPreKeyMaterial = {
      signedPreKey: generateExchangeKeyPair(),
      oneTimePreKeys: [],
      updatedAt: 1700000000000,
      spkCreatedAt: 1690000000000,
    };

    const result = backfillSpkCreatedAt(material);
    expect(result.spkCreatedAt).toBe(1690000000000);
  });
});
