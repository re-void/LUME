/**
 * Settings — Danger Zone section (delete account).
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui";
import { panicWipe } from "@/crypto/storage";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores";
import { SectionHeading } from "./shared";

export default function DangerZoneSection() {
  const router = useRouter();
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const handleDeleteAccount = async () => {
    const keys = useAuthStore.getState().identityKeys;
    const uid = useAuthStore.getState().userId;
    if (keys && uid) {
      try {
        await authApi.deleteAccount(uid, keys);
      } catch {
        // Best effort.
      }
    }

    await panicWipe();
    useAuthStore.getState().clearAuth();
    router.push("/");
  };

  return (
    <>
      <section>
        <SectionHeading>Danger Zone</SectionHeading>
        <button
          type="button"
          onClick={() => setShowDeleteAccount(true)}
          className="w-full py-3 px-4 rounded-[var(--radius-md)] border border-red-500/30 text-red-500 text-[13px] font-semibold uppercase tracking-[0.1em] hover:bg-red-500/5 transition-colors"
        >
          Delete Account & Wipe Data
        </button>
      </section>

      <Modal
        isOpen={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        title="Delete Account"
      >
        <div className="space-y-4">
          <p className="text-[13px] text-[var(--text-secondary)] text-center">
            This will permanently erase all local data including keys,
            contacts, and messages. This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteAccount(false)}
              className="apple-button-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteAccount()}
              className="flex-1 py-3 px-4 rounded-[var(--radius-md)] bg-red-500 text-white text-[13px] font-semibold uppercase tracking-[0.1em] hover:bg-red-600 transition-colors"
            >
              Delete Everything
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
