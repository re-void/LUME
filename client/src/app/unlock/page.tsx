'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadIdentityKeys, loadSettings, saveSettings, hasAccount, loadPreKeyMaterial, savePreKeyMaterial } from '@/crypto/storage';
import { useAuthStore } from '@/stores';
import { authApi } from '@/lib/api';
import { generatePreKeyBundle } from '@/crypto/keys';

export default function UnlockPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    async function check() {
      const exists = await hasAccount();
      if (!exists) {
        router.push('/');
      }
    }

    check();
  }, [router]);

  const handleUnlock = async () => {
    setError('');
    setLoading(true);

    try {
      const identity = await loadIdentityKeys(pin);

      if (!identity) {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        if (nextAttempts >= 5) {
          setError('Too many attempts');
          return;
        }
        setError('Invalid PIN');
        return;
      }

      const settings = await loadSettings();
      let resolvedUserId = settings.userId;
      let resolvedUsername = settings.username?.replace(/^@+/, '').trim();

      // Always try to reconcile stored userId with the server's current record.
      // This prevents "User not found" loops after DB resets or stale local settings.
      if (resolvedUsername) {
        const { data: serverUser, error: serverError } = await authApi.getUser(resolvedUsername);

        if (serverUser) {
          if (serverUser.identityKey !== identity.signing.publicKey) {
            setError('This username belongs to a different identity on the server.');
            return;
          }

          resolvedUserId = serverUser.id;
          resolvedUsername = serverUser.username;

          if (resolvedUserId !== settings.userId || resolvedUsername !== settings.username) {
            await saveSettings({
              ...settings,
              userId: resolvedUserId,
              username: resolvedUsername,
            });
          }
        } else if (serverError === 'User not found') {
          // Server DB was reset or the account was deleted. Re-create the server-side record
          // using the existing local identity (so the user keeps access to local history).
          const bootstrapBundle = generatePreKeyBundle(identity.exchange, identity.signing, 20);
          const { data: created, error: createError } = await authApi.register({
            username: resolvedUsername,
            identityKey: identity.signing.publicKey,
            exchangeIdentityKey: identity.exchange.publicKey,
            signedPrekey: bootstrapBundle.signedPreKey.publicKey,
            signedPrekeySignature: bootstrapBundle.signature,
            oneTimePrekeys: bootstrapBundle.oneTimePreKeys.map((key, i) => ({
              id: `${resolvedUsername}-prekey-${i}`,
              publicKey: key.publicKey,
            })),
          });

          if (!created || createError) {
            setError('Account not found on server. Create a new account or restore access.');
            return;
          }

          await savePreKeyMaterial(
            {
              signedPreKey: bootstrapBundle.signedPreKey,
              oneTimePreKeys: bootstrapBundle.oneTimePreKeys,
              updatedAt: Date.now(),
            },
            pin
          );

          await saveSettings({
            ...settings,
            userId: created.id,
            username: created.username,
          });

          setAuth(created.id, created.username, identity, pin);
          router.push('/chats');
          return;
        }
      }

      if (!resolvedUserId || !resolvedUsername) {
        setError('Profile missing. Recover account with phrase.');
        return;
      }

      const preKeyBundle = generatePreKeyBundle(identity.exchange, identity.signing, 0);
      // Keep a local copy of the rotated signed prekey so we can respond to X3DH.
      const existingMaterial = await loadPreKeyMaterial(pin);
      await savePreKeyMaterial(
        {
          signedPreKey: preKeyBundle.signedPreKey,
          oneTimePreKeys: existingMaterial?.oneTimePreKeys ?? [],
          updatedAt: Date.now(),
        },
        pin
      );
      const { error: rotateError } = await authApi.updateSignedPrekey(
        resolvedUserId,
        preKeyBundle.signedPreKey.publicKey,
        preKeyBundle.signature,
        identity
      );
      if (rotateError) {
        console.warn('Signed prekey rotation skipped during unlock:', rotateError);
      }

      setAuth(resolvedUserId, resolvedUsername, identity, pin);
      router.push('/chats');
    } catch (unlockError) {
      console.error('Unlock error:', unlockError);
      setError('Unlock error');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin.length >= 4) {
      handleUnlock();
    }
  };

  return (
    <main className="auth-shell">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-[0.28em] uppercase text-[var(--text-primary)]">L U M E</h1>
          <p className="auth-subtle mt-2">Enter PIN to continue.</p>
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            <span className="lume-badge">Unlock</span>
            <span className="lume-badge">Local PIN</span>
          </div>
        </div>

        <div className="auth-card lume-panel p-6 sm:p-8">
          <div className="mb-6">
            <label className="block apple-label mb-2 text-center">PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="...."
              autoFocus
              className="apple-input text-center text-2xl tracking-[0.42em]"
            />
            {error && <p className="mt-3 text-sm text-[var(--text-secondary)] text-center">{error}</p>}
          </div>

          <div className="space-y-3">
            <button
              onClick={handleUnlock}
              disabled={pin.length < 4 || loading}
              className="w-full apple-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 mono-spinner rounded-full animate-spin" />
                  Checking...
                </span>
              ) : (
                'Log In'
              )}
            </button>

            <button onClick={() => router.push('/recover')} className="w-full apple-button-secondary">
              Recover with Phrase
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button onClick={() => router.push('/')} className="text-sm apple-link">
            Back to home
          </button>
        </div>
      </div>
    </main>
  );
}
