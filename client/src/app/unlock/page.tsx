"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { errorFeedback, successFeedback } from "@/lib/haptics";
import {
  loadIdentityKeys,
  loadSettings,
  saveSettings,
  hasAccount,
  loadPreKeyMaterial,
  savePreKeyMaterial,
  deriveMasterKeyFromPin,
  checkPinLockout,
  recordPinFailure,
  resetPinFailures,
} from "@/crypto/storage";
import { useAuthStore } from "@/stores";
import { vaultSetAuth, vaultClear } from "@/crypto/keyVault";
import { authApi, profileApi } from "@/lib/api";
import { generatePreKeyBundle } from "@/crypto/keys";
import { checkAndRotateSpk, backfillSpkCreatedAt } from "@/crypto/spkRotation";

export default function UnlockPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const PIN_LENGTH = 6;

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [bouncingDot, setBouncingDot] = useState<number | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const focusHiddenInput = useCallback(() => {
    hiddenInputRef.current?.focus();
  }, []);

  const handlePinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
    if (value.length > pin.length) {
      setBouncingDot(value.length - 1);
    }
    setPin(value);
  }, [pin.length]);

  useEffect(() => {
    async function check() {
      const exists = await hasAccount();
      if (!exists) {
        router.push("/");
      }
    }

    check();
  }, [router]);

  const handleUnlock = async () => {
    setError("");
    setLoading(true);

    try {
      // Check persistent lockout before attempting
      await checkPinLockout();

      // Derive the master key from the entered PIN — PIN is discarded after this
      const masterKey = await deriveMasterKeyFromPin(pin);
      const identity = await loadIdentityKeys(masterKey, pin);

      if (!identity) {
        await recordPinFailure();
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        errorFeedback();
        setShaking(true);
        if (nextAttempts >= 5) {
          setError("Too many attempts");
          return;
        }
        setError("Invalid PIN");
        return;
      }

      await resetPinFailures();

      // Set vault keys early so API calls (which sign via vault) work
      vaultSetAuth(identity, masterKey);

      const settings = await loadSettings();
      let resolvedUserId = settings.userId;
      let resolvedUsername = settings.username?.replace(/^@+/, "").trim();

      // Always try to reconcile stored userId with the server's current record.
      // This prevents "User not found" loops after DB resets or stale local settings.
      if (resolvedUsername) {
        const { data: serverUser, error: serverError } = await authApi.getUser(
          resolvedUsername,
        );

        if (serverUser) {
          if (serverUser.identityKey !== identity.signing.publicKey) {
            vaultClear();
            errorFeedback();
            setShaking(true);
            setError(
              "This username belongs to a different identity on the server.",
            );
            return;
          }

          resolvedUserId = serverUser.id;
          resolvedUsername = serverUser.username;

          if (
            resolvedUserId !== settings.userId ||
            resolvedUsername !== settings.username
          ) {
            await saveSettings({
              ...settings,
              userId: resolvedUserId,
              username: resolvedUsername,
            });
          }
        } else if (serverError === "User not found") {
          // Server DB reset — rebind silently. Vault still holds keys from
          // vaultSetAuth above, so authApi.register will auto-sign.
          const bundle = generatePreKeyBundle(identity.exchange, identity.signing, 20);
          const { data: rebound, error: rebindError } = await authApi.register({
            username: resolvedUsername,
            identityKey: identity.signing.publicKey,
            exchangeIdentityKey: identity.exchange.publicKey,
            signedPrekey: bundle.signedPreKey.publicKey,
            signedPrekeySignature: bundle.signature,
            oneTimePrekeys: bundle.oneTimePreKeys.map((key, i) => ({
              id: `${resolvedUsername}-prekey-${Date.now()}-${i}`,
              publicKey: key.publicKey,
            })),
          });
          if (!rebound || rebindError) {
            vaultClear();
            errorFeedback();
            setShaking(true);
            setError("Could not reach server. Try again or recover with phrase.");
            return;
          }
          await savePreKeyMaterial(
            {
              signedPreKey: bundle.signedPreKey,
              oneTimePreKeys: bundle.oneTimePreKeys,
              updatedAt: Date.now(),
            },
            masterKey,
          );
          resolvedUserId = rebound.id;
          resolvedUsername = rebound.username;
          await saveSettings({ ...settings, userId: resolvedUserId, username: resolvedUsername });
          // fall through to the existing success path (SPK rotation, setAuth, etc.)
        }
      }

      if (!resolvedUserId || !resolvedUsername) {
        vaultClear();
        errorFeedback();
        setShaking(true);
        setError("Profile missing. Recover account with phrase.");
        return;
      }

      // Backfill spkCreatedAt for prekey material created before rotation feature
      const existingMaterial = await loadPreKeyMaterial(masterKey);
      if (existingMaterial) {
        const backfilled = backfillSpkCreatedAt(existingMaterial);
        if (backfilled !== existingMaterial) {
          await savePreKeyMaterial(backfilled, masterKey);
        }
      }

      // Rotate SPK only if older than the rotation interval (7 days)
      const spkResult = await checkAndRotateSpk(
        masterKey,
        resolvedUserId,
      );
      if (spkResult.error) {
        if (process.env.NODE_ENV !== "production")
          console.warn("SPK rotation issue during unlock:", spkResult.error);
      }

      successFeedback();
      setAuth(resolvedUserId, resolvedUsername);

      // Fetch discoverable state
      void profileApi.get(resolvedUserId).then((profileResult) => {
        if (profileResult.data?.discoverable !== undefined) {
          useAuthStore.getState().setDiscoverable(profileResult.data.discoverable);
        }
      });

      const pendingInvite = sessionStorage.getItem("lume:pending-invite");
      if (pendingInvite) {
        sessionStorage.removeItem("lume:pending-invite");
        router.push(`/invite/${pendingInvite}`);
      } else {
        router.push("/chats");
      }
    } catch (unlockError) {
      if (process.env.NODE_ENV !== "production")
        console.error("Unlock error:", unlockError);
      errorFeedback();
      setShaking(true);
      const msg =
        unlockError instanceof Error ? unlockError.message : "Unlock error";
      setError(msg.startsWith("Too many") ? msg : "Unlock error");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && pin.length >= 4) {
      handleUnlock();
    }
  };

  return (
    <main className="auth-shell">
      <div className="w-full max-w-md px-0">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-[0.28em] uppercase text-[var(--text-primary)]">
            L U M E
          </h1>
          <p className="auth-subtle mt-2">Enter PIN to continue.</p>
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            <span className="lume-badge">Unlock</span>
            <span className="lume-badge">Local PIN</span>
          </div>
        </div>

        <div className="auth-card lume-panel p-6 sm:p-8 animate-fade-in-scale">
          <div className="mb-6">
            <label
              htmlFor="unlock-pin"
              className="block apple-label mb-2 text-center"
            >
              PIN
            </label>

            {/* Hidden input captures keyboard/autofill input */}
            <input
              ref={hiddenInputRef}
              id="unlock-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="current-password"
              value={pin}
              onChange={handlePinChange}
              onKeyDown={handleKeyDown}
              autoFocus
              className="sr-only"
              aria-label="Enter PIN"
              maxLength={PIN_LENGTH}
            />

            {/* Visual PIN dots */}
            <button
              type="button"
              onClick={focusHiddenInput}
              className={`flex items-center justify-center gap-3 w-full py-4 cursor-text${shaking ? " pin-shake" : ""}`}
              onAnimationEnd={() => setShaking(false)}
              aria-hidden="true"
              tabIndex={-1}
            >
              {Array.from({ length: PIN_LENGTH }, (_, i) => (
                <span
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors duration-150 ${
                    i < pin.length
                      ? "bg-[var(--accent)]"
                      : "bg-[var(--border)]"
                  }${bouncingDot === i ? " pin-dot-bounce" : ""}`}
                  onAnimationEnd={() => setBouncingDot(null)}
                />
              ))}
            </button>

            {error && (
              <p className="mt-3 text-sm text-[var(--text-secondary)] text-center">
                {error}
              </p>
            )}
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
                "Log In"
              )}
            </button>

            <button
              onClick={() => router.push("/recover")}
              className="w-full apple-button-secondary"
            >
              Recover with Phrase
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/")}
            className="text-sm apple-link"
          >
            Back to home
          </button>
        </div>
      </div>

    </main>
  );
}
