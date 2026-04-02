/**
 * Invite resolution page.
 * Resolves an invite token and allows adding the user as a contact.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { inviteApi } from "@/lib/api";
import { saveContacts, type Contact } from "@/crypto/storage";
import {
  useAuthStore,
  useContactsStore,
  useChatsStore,
} from "@/stores";

type InviteState =
  | { status: "loading" }
  | { status: "resolved"; user: ResolvedUser }
  | { status: "error"; message: string }
  | { status: "added"; chatId: string };

interface ResolvedUser {
  id: string;
  username: string;
  identityKey: string;
  exchangeKey: string;
  signedPrekey: string;
  signedPrekeySignature: string;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const identityKeys = useAuthStore((s) => s.identityKeys);
  const masterKey = useAuthStore((s) => s.masterKey);
  const username = useAuthStore((s) => s.username);

  const [state, setState] = useState<InviteState>({ status: "loading" });
  const [adding, setAdding] = useState(false);

  // Resolve the invite token
  useEffect(() => {
    if (!isAuthenticated || !identityKeys) {
      // Store token for after login
      sessionStorage.setItem("lume:pending-invite", token);
      router.push("/");
      return;
    }

    let cancelled = false;

    async function resolve() {
      const result = await inviteApi.resolveToken(token, identityKeys!);
      if (cancelled) return;

      if (result.error) {
        setState({ status: "error", message: result.error });
        return;
      }

      if (!result.data) {
        setState({ status: "error", message: "Invalid invite link" });
        return;
      }

      setState({
        status: "resolved",
        user: {
          id: result.data.id,
          username: result.data.username,
          identityKey: result.data.identityKey,
          exchangeKey:
            result.data.exchangeIdentityKey ||
            result.data.exchangeKey ||
            result.data.signedPrekey,
          signedPrekey: result.data.signedPrekey,
          signedPrekeySignature: result.data.signedPrekeySignature,
        },
      });
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [token, isAuthenticated, identityKeys, router]);

  const handleAddContact = useCallback(async () => {
    if (state.status !== "resolved") return;
    setAdding(true);

    try {
      const { user } = state;

      if (user.username === username) {
        setState({ status: "error", message: "Cannot add yourself" });
        return;
      }

      const existingContacts = useContactsStore.getState().contacts;
      if (existingContacts.some((c) => c.id === user.id)) {
        // Already a contact — just open chat
        const existingChat = useChatsStore
          .getState()
          .chats.find((c) => c.contactId === user.id);
        if (existingChat) {
          router.push(`/chat/${existingChat.id}`);
        } else {
          const chatId = uuidv4();
          useChatsStore.getState().addChat({
            id: chatId,
            contactId: user.id,
            messages: [],
            unreadCount: 0,
            isHidden: false,
          });
          useChatsStore.getState().setActiveChat(chatId);
          router.push(`/chat/${chatId}`);
        }
        return;
      }

      const newContact: Contact = {
        id: user.id,
        username: user.username,
        publicKey: user.identityKey,
        exchangeKey: user.exchangeKey,
        addedAt: Date.now(),
      };

      useContactsStore.getState().addContact(newContact);
      const updatedContacts = useContactsStore.getState().contacts;

      if (masterKey) {
        await saveContacts(updatedContacts, masterKey);
      }

      const chatId = uuidv4();
      useChatsStore.getState().addChat({
        id: chatId,
        contactId: user.id,
        messages: [],
        unreadCount: 0,
        isHidden: false,
      });
      useChatsStore.getState().setActiveChat(chatId);

      setState({ status: "added", chatId });
    } catch {
      setState({ status: "error", message: "Failed to add contact" });
    } finally {
      setAdding(false);
    }
  }, [state, username, masterKey, router]);

  return (
    <main className="auth-shell">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md px-0 relative z-10">
        <div className="auth-card lume-panel p-5 sm:p-8 animate-fade-in-scale">
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-semibold uppercase tracking-[0.28em] text-[var(--text-primary)]">
              L U M E
            </h1>
            <p className="mt-3 text-[11px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">
              Invite link
            </p>
          </div>

          {state.status === "loading" && (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 mono-spinner rounded-full animate-spin" />
            </div>
          )}

          {state.status === "error" && (
            <div className="space-y-4 text-center">
              <p className="text-[13px] text-red-500">{state.message}</p>
              <Button onClick={() => router.push("/chats")} className="w-full">
                Go to Chats
              </Button>
            </div>
          )}

          {state.status === "resolved" && (
            <div className="space-y-5 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center">
                <span className="text-2xl font-semibold text-[var(--text-primary)]">
                  {state.user.username[0]?.toUpperCase()}
                </span>
              </div>

              <div>
                <p className="text-[15px] font-medium text-[var(--text-primary)]">
                  {state.user.username}
                </p>
                <p className="text-[12px] text-[var(--text-muted)] mt-1">
                  wants to connect with you
                </p>
              </div>

              <Button
                onClick={() => void handleAddContact()}
                disabled={adding}
                className="w-full"
              >
                {adding ? "Adding..." : "Add Contact & Chat"}
              </Button>

              <button
                type="button"
                onClick={() => router.push("/chats")}
                className="w-full text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Skip
              </button>
            </div>
          )}

          {state.status === "added" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-[13px] text-[var(--text-primary)]">
                Contact added successfully
              </p>
              <Button
                onClick={() => router.push(`/chat/${state.chatId}`)}
                className="w-full"
              >
                Open Chat
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
