/**
 * Shared hook: panic wipe logic.
 * Eliminates copy-paste between chats/page.tsx and chat/[id]/page.tsx.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useUIStore } from "@/stores";
import { wsClient } from "@/lib/websocket";
import { panicWipe } from "@/crypto/storage";

export function usePanic() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const { isPanicMode, setPanicMode } = useUIStore();

  const [showPanicConfirm, setShowPanicConfirm] = useState(false);

  const executePanic = useCallback(async () => {
    setPanicMode(true);
    wsClient.disconnect();
    await panicWipe();
    clearAuth();
    router.push("/");
  }, [setPanicMode, clearAuth, router]);

  return {
    isPanicMode,
    showPanicConfirm,
    setShowPanicConfirm,
    executePanic,
  };
}
