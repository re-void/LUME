"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createAccountWithMnemonic,
  getMnemonicWords,
} from "@/crypto/mnemonic";
import {
  saveIdentityKeys,
  saveSettings,
  loadSettings,
  savePreKeyMaterial,
  deriveMasterKeyFromPin,
  savePinHash,
} from "@/crypto/storage";
import { generatePreKeyBundle } from "@/crypto/keys";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores";
import type { IdentityKeys } from "@/crypto/keys";

type Step = "username" | "pin" | "generate" | "save-seed" | "complete";

export default function SetupPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep] = useState<Step>("username");
  const [mnemonic, setMnemonic] = useState<string>("");
  const [identity, setIdentity] = useState<IdentityKeys | null>(null);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const usernameCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    if (step === "save-seed") {
      setCanProceed(false);
      const timer = setTimeout(() => setCanProceed(true), 3000);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [step]);

  const handleCopyMnemonic = async () => {
    await navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // Auto-clear clipboard after 15 seconds to prevent lingering mnemonic
    setTimeout(() => navigator.clipboard.writeText("").catch(() => {}), 15000);
  };

  const handleDownloadRecovery = () => {
    const blob = new Blob([mnemonic], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lume-recovery.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const checkUsername = (value: string) => {
    const normalized = value.replace(/^@+/, "");
    setUsername(normalized);
    setUsernameError("");

    if (usernameCheckTimerRef.current) {
      clearTimeout(usernameCheckTimerRef.current);
      usernameCheckTimerRef.current = null;
    }

    if (normalized.length < 3) {
      setUsernameError("Minimum 3 characters");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(normalized)) {
      setUsernameError("Only letters, numbers and underscore");
      return;
    }

    usernameCheckTimerRef.current = setTimeout(async () => {
      const { data } = await authApi.checkUsername(normalized);
      if (data && !data.available) {
        setUsernameError("Username taken");
      }
    }, 400);
  };

  const handleSetPin = () => {
    if (pin.length < 4) {
      setPinError("Minimum 4 characters");
      return;
    }
    if (pin !== pinConfirm) {
      setPinError("PINs do not match");
      return;
    }

    setPinError("");
    setStep("generate");
    void handleGenerate();
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await createAccountWithMnemonic(128);
      const generatedIdentity = result.identity;
      setMnemonic(result.mnemonic);
      setIdentity(generatedIdentity);

      const preKeyBundle = generatePreKeyBundle(
        generatedIdentity.exchange,
        generatedIdentity.signing,
        20,
      );

      const { data, error } = await authApi.register({
        username,
        identityKey: generatedIdentity.signing.publicKey,
        exchangeIdentityKey: generatedIdentity.exchange.publicKey,
        signedPrekey: preKeyBundle.signedPreKey.publicKey,
        signedPrekeySignature: preKeyBundle.signature,
        oneTimePrekeys: preKeyBundle.oneTimePreKeys.map((key, i) => ({
          id: `${username}-prekey-${i}`,
          publicKey: key.publicKey,
        })),
      });

      if (error) {
        setUsernameError(error);
        setStep("username");
        return;
      }

      // Derive master key from PIN — PIN is only used here, never stored
      const masterKey = await deriveMasterKeyFromPin(pin);

      // Store signed prekey + OPKs locally (encrypted) so we can respond to X3DH and consume OPKs.
      await savePreKeyMaterial(
        {
          signedPreKey: preKeyBundle.signedPreKey,
          oneTimePreKeys: preKeyBundle.oneTimePreKeys,
          updatedAt: Date.now(),
        },
        masterKey,
      );

      await saveIdentityKeys(generatedIdentity, masterKey);
      await savePinHash(pin);
      const existingSettings = await loadSettings();
      await saveSettings({
        ...existingSettings,
        username,
        userId: data!.id,
      });
      setAuth(data!.id, username, generatedIdentity, masterKey);
      setStep("save-seed");
    } catch (registrationError) {
      if (process.env.NODE_ENV !== "production")
        console.error("Registration error:", registrationError);
      setUsernameError("Registration error");
      setStep("username");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSeedContinue = () => {
    setMnemonic("");
    setStep("complete");
    setTimeout(() => {
      const pendingInvite = sessionStorage.getItem("lume:pending-invite");
      if (pendingInvite) {
        sessionStorage.removeItem("lume:pending-invite");
        router.push(`/invite/${pendingInvite}`);
      } else {
        router.push("/chats");
      }
    }, 1800);
  };

  const words = getMnemonicWords(mnemonic);
  const steps = ["username", "pin", "generate", "save-seed"] as const;
  const currentStepIndex = steps.indexOf(step as (typeof steps)[number]);

  return (
    <main className="auth-shell">
      <div className="w-full max-w-xl px-0">
        <div className="text-center mb-8">
          <h1 className="stagger-1 text-2xl font-semibold tracking-[0.28em] uppercase text-[var(--text-primary)]">
            L U M E
          </h1>
          <p className="stagger-2 auth-subtle mt-2">Secure registration</p>
          <div className="stagger-3 mt-4 flex items-center justify-center gap-2 flex-wrap">
            <span className="lume-badge">Create account</span>
          </div>
        </div>

        <div className="stagger-4 auth-card lume-panel p-5 sm:p-8">
          {step !== "generate" && step !== "complete" && (
            <div className="mb-8">
              <div className="h-1.5 bg-[var(--surface-alt)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all duration-700"
                  style={{
                    width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {step === "username" && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2 uppercase tracking-[0.04em]">
                  Username
                </h2>
                <p className="text-[var(--text-secondary)] text-sm">
                  Choose your public identifier.
                </p>
              </div>

              <div className="mb-8">
                <label
                  htmlFor="setup-username"
                  className="block apple-label mb-2"
                >
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                    @
                  </span>
                  <input
                    id="setup-username"
                    type="text"
                    value={username}
                    onChange={(e) => checkUsername(e.target.value)}
                    placeholder="username"
                    className="apple-input apple-input-icon"
                  />
                </div>
                {usernameError && (
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">
                    {usernameError}
                  </p>
                )}
              </div>

              <button
                onClick={() => setStep("pin")}
                disabled={!username || !!usernameError || username.length < 3}
                className="w-full apple-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          )}

          {step === "pin" && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2 uppercase tracking-[0.04em]">
                  PIN Code
                </h2>
                <p className="text-[var(--text-secondary)] text-sm">
                  Protects access on this device.
                </p>
              </div>

              <div className="space-y-5 mb-8">
                <div>
                  <label htmlFor="setup-pin" className="block apple-label mb-2">
                    PIN
                  </label>
                  <input
                    id="setup-pin"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="...."
                    className="apple-input text-center text-[20px] sm:text-[22px] tracking-[0.36em]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="setup-pin-confirm"
                    className="block apple-label mb-2"
                  >
                    Repeat PIN
                  </label>
                  <input
                    id="setup-pin-confirm"
                    type="password"
                    value={pinConfirm}
                    onChange={(e) => setPinConfirm(e.target.value)}
                    placeholder="...."
                    className="apple-input text-center text-[20px] sm:text-[22px] tracking-[0.36em]"
                  />
                  {pinError && (
                    <p className="mt-3 text-sm text-[var(--text-secondary)] text-center">
                      {pinError}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handleSetPin}
                disabled={!pin || !pinConfirm}
                className="w-full apple-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          )}

          {step === "generate" && (
            <div className="text-center py-10" aria-busy="true">
              <div className="w-10 h-10 mx-auto mb-6 border-2 mono-spinner rounded-full animate-spin" />
              <p className="text-[var(--text-secondary)] text-sm">
                Creating account...
              </p>
            </div>
          )}

          {step === "save-seed" && (
            <div className="page-enter">
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2 uppercase tracking-[0.04em]">
                  Save your recovery key
                </h2>
                <p className="text-[var(--text-secondary)] text-sm">
                  Without it, account recovery is impossible.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
                {words.map((word, index) => (
                  <div
                    key={word + index}
                    className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-center shadow-[0_6px_14px_rgba(0,0,0,0.06)]"
                  >
                    <span className="text-[11px] text-[var(--text-muted)] mr-1">
                      {index + 1}.
                    </span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {word}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleDownloadRecovery}
                    className="apple-button-secondary"
                    aria-label="Download recovery phrase as text file"
                  >
                    Download
                  </button>
                  <button
                    onClick={handleCopyMnemonic}
                    className={`apple-button-secondary ${copied ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : ""}`}
                    aria-label="Copy recovery phrase to clipboard"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <button
                  onClick={handleSaveSeedContinue}
                  disabled={!canProceed}
                  className="w-full apple-button disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  I saved it
                </button>
              </div>
            </div>
          )}

          {step === "complete" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-5 rounded-full border border-[var(--border)] bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1 uppercase tracking-[0.04em]">
                Account Created
              </h2>
              <p className="text-[var(--text-secondary)] text-sm">
                @{username}
              </p>
            </div>
          )}
        </div>

        {(step === "username" || step === "pin") && (
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push("/")}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
