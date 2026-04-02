"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

function OnboardingSection({
  children,
  className,
  immediate,
}: {
  children: React.ReactNode;
  className?: string;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(immediate ?? false);

  useEffect(() => {
    if (immediate) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [immediate]);

  return (
    <section
      ref={ref}
      className={`onboarding-section min-h-[100dvh] flex flex-col items-center justify-center px-8 text-center
        transition-all duration-700 ease-out
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
        ${className ?? ""}`}
    >
      {children}
    </section>
  );
}

function LockIcon() {
  return (
    <svg
      className="w-12 h-12 sm:w-16 sm:h-16"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="11"
        width="18"
        height="11"
        rx="2"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 11V7a5 5 0 0 1 10 0v4"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      className="w-12 h-12 sm:w-16 sm:h-16"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("lume:onboarding-complete")) {
      router.replace("/");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- gate render until redirect check completes
    setReady(true);
  }, [router]);

  const handleNavigate = useCallback(
    (path: string) => {
      localStorage.setItem("lume:onboarding-complete", "true");
      router.push(path);
    },
    [router],
  );

  if (!ready) return null;

  return (
    <main
      className="overflow-y-auto"
      style={{ background: "var(--background)", color: "var(--text-primary)" }}
    >
      {/* Section 1 — First impression */}
      <OnboardingSection immediate>
        <h1 className="stagger-1 text-3xl sm:text-5xl font-semibold uppercase tracking-[0.28em]">
          L U M E
        </h1>
        <p className="stagger-2 mt-4 text-xs sm:text-sm uppercase tracking-[0.28em] text-[var(--text-secondary)]">
          Your messages. Your keys. Your rules.
        </p>
      </OnboardingSection>

      {/* Section 2 — No identity */}
      <OnboardingSection>
        <div className="text-[var(--text-primary)]">
          <ShieldIcon />
        </div>
        <h2 className="mt-6 text-2xl sm:text-3xl font-semibold uppercase tracking-[0.08em]">
          No identity required
        </h2>
        <p className="mt-4 text-sm sm:text-base text-[var(--text-secondary)] max-w-md leading-relaxed">
          No phone number. No email. No password.
          <br />
          Your account is a cryptographic key pair — nothing more.
        </p>
      </OnboardingSection>

      {/* Section 3 — Zero access */}
      <OnboardingSection>
        <div className="text-[var(--text-primary)]">
          <LockIcon />
        </div>
        <h2 className="mt-6 text-2xl sm:text-3xl font-semibold uppercase tracking-[0.08em]">
          Zero access
        </h2>
        <p className="mt-4 text-sm sm:text-base text-[var(--text-secondary)] max-w-md leading-relaxed">
          Messages are encrypted on your device before they leave it.
          <br />
          The server is a blind relay — it cannot read, decrypt, or store
          anything.
        </p>
      </OnboardingSection>

      {/* Section 4 — Start */}
      <OnboardingSection>
        <h2 className="text-2xl sm:text-3xl font-semibold uppercase tracking-[0.08em]">
          Ready when you are
        </h2>
        <p className="mt-4 text-sm sm:text-base text-[var(--text-secondary)] max-w-md">
          Everything stays on your device. Always.
        </p>
        <div className="mt-10 w-full max-w-xs space-y-3">
          <button
            onClick={() => handleNavigate("/setup")}
            className="w-full apple-button"
            aria-label="Create account"
          >
            Create Account
          </button>
          <button
            onClick={() => handleNavigate("/unlock")}
            className="w-full apple-button-secondary"
            aria-label="I have an account"
          >
            I Have an Account
          </button>
        </div>
      </OnboardingSection>
    </main>
  );
}
