/**
 * Messenger: active chat view inside the dashboard shell (desktop).
 * Mobile shows chat only with a back button.
 */

'use client';

import { useEffect, useRef, useState, use, memo } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import MessengerShell from '@/components/messenger/MessengerShell';
import LeftRail from '@/components/messenger/LeftRail';
import ChatListPanel from '@/components/messenger/ChatListPanel';
import RightRail from '@/components/messenger/RightRail';
import { Button, Input, Modal } from '@/components/ui';
import { useMessengerSync } from '@/hooks/useMessengerSync';
import { useAuthStore, useContactsStore, useChatsStore, useSessionsStore, useUIStore, useTypingStore, type Message } from '@/stores';
import { authApi, messagesApi } from '@/lib/api';
import { wsClient } from '@/lib/websocket';
import { panicWipe, saveContacts, type Contact } from '@/crypto/storage';
import { decodeBase64 } from 'tweetnacl-util';
import { verify } from '@/crypto/keys';
import { encodeRatchetEnvelope } from '@/lib/ratchetPayload';
import {
  deserializeSession,
  initSenderSession,
  ratchetEncrypt,
  serializeSession,
  x3dhInitiate,
} from '@/crypto/ratchet';
import { computeSafetyNumber } from '@/crypto/safetyNumber';

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

function StatusIcon({ status }: { status: Message['status'] }) {
  const base = 'w-4 h-4';

  if (status === 'sending') {
    return <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin inline-block" />;
  }

  if (status === 'failed') {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v4" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 17h.01" />
      </svg>
    );
  }

  if (status === 'sent') {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12l4 4L19 6" />
      </svg>
    );
  }

  if (status === 'delivered' || status === 'read') {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l4 4L17 6" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l4 4L21 6" />
      </svg>
    );
  }

  return null;
}

function MessageBubble({ message, isMine }: { message: Message; isMine: boolean }) {
  const timeLabel = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[78%] px-4 py-2.5 ${isMine ? 'message-bubble-sent' : 'message-bubble-received'}`}>
        <p className="break-words text-[15px] leading-relaxed">{message.content}</p>
        <div className={`flex items-center justify-end gap-1.5 mt-1 ${isMine ? 'opacity-80' : 'text-[var(--text-muted)]'}`}>
          <span className="text-[11px] uppercase tracking-[0.06em]">{timeLabel}</span>
          {isMine ? <StatusIcon status={message.status} /> : null}
          {message.selfDestructAt ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v5l3 2" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const MessageBubbleMemo = memo(
  MessageBubble,
  (prev, next) =>
    prev.isMine === next.isMine &&
    prev.message.id === next.message.id &&
    prev.message.status === next.message.status &&
    prev.message.content === next.message.content &&
    prev.message.timestamp === next.message.timestamp &&
    prev.message.selfDestructAt === next.message.selfDestructAt
);

export default function ChatPage({ params }: ChatPageProps) {
  const { id: chatId } = use(params);
  const router = useRouter();
  const { hydrated } = useMessengerSync();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStateRef = useRef(false);

  const { userId, identityKeys, pin, username, clearAuth } = useAuthStore();
  const { contacts, addContact } = useContactsStore();
  const { upsertSession } = useSessionsStore();
  const { chats, addChat, addMessage, updateMessage, markAsRead, setSelfDestructTimer, activeChatId, setActiveChat } =
    useChatsStore();
  const { isPanicMode, setPanicMode, setCryptoBanner, clearCryptoBanner } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactUsername, setNewContactUsername] = useState('');
  const [addContactError, setAddContactError] = useState('');
  const [addContactLoading, setAddContactLoading] = useState(false);
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [selfDestructTime, setSelfDestructTime] = useState<number | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [copiedSafety, setCopiedSafety] = useState(false);

  const chat = chats.find((c) => c.id === chatId);
  const contact = contacts.find((c) => c.id === chat?.contactId);
  const contactId = contact?.id;
  const isTyping = useTypingStore((s) => contactId ? s.typingUsers[contactId] ?? false : false);
  const safetyNumber = identityKeys && contact
    ? computeSafetyNumber({
      mySigningPublicKey: identityKeys.signing.publicKey,
      myExchangeIdentityPublicKey: identityKeys.exchange.publicKey,
      theirSigningPublicKey: contact.publicKey,
      theirExchangeIdentityPublicKey: contact.exchangeKey,
    })
    : null;

  useEffect(() => {
    if (hydrated) {
      setActiveChat(chatId);
      markAsRead(chatId);
    }
  }, [hydrated, chatId, markAsRead, setActiveChat]);

  useEffect(() => {
    if (!chat) return;
    if (selfDestructTime === null && typeof chat.selfDestructTimer === 'number') {
      setSelfDestructTime(chat.selfDestructTimer);
    }
  }, [chat, selfDestructTime]);

  useEffect(() => {
    if (!hydrated) return;
    if (!userId || !identityKeys) {
      router.push('/unlock');
    }
  }, [hydrated, userId, identityKeys, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [chat?.messages.length]);

  // Reduce WS traffic: send typing=true once when user starts typing,
  // then typing=false after a short inactivity window.
  useEffect(() => {
    if (!contactId) return undefined;

    const isTypingNow = messageText.trim().length > 0;

    if (!isTypingNow) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (typingStateRef.current) {
        typingStateRef.current = false;
        wsClient.sendTyping(contactId, false);
      }
      return undefined;
    }

    if (!typingStateRef.current) {
      typingStateRef.current = true;
      wsClient.sendTyping(contactId, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
      if (typingStateRef.current) {
        typingStateRef.current = false;
        wsClient.sendTyping(contactId, false);
      }
    }, 1200);

    return undefined;
  }, [messageText, contactId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (contactId && typingStateRef.current) {
        typingStateRef.current = false;
        wsClient.sendTyping(contactId, false);
      }
    };
  }, [contactId]);

  const openChatForContact = (contactId: string) => {
    const existing = useChatsStore.getState().chats.find((c) => c.contactId === contactId);
    let nextChatId = existing?.id;
    if (!nextChatId) {
      nextChatId = uuidv4();
      addChat({
        id: nextChatId,
        contactId,
        messages: [],
        unreadCount: 0,
        isHidden: false,
      });
    }
    setActiveChat(nextChatId);
    router.push(`/chat/${nextChatId}`);
  };

  const handleAddContact = async () => {
    setAddContactError('');
    setAddContactLoading(true);

    try {
      const normalized = newContactUsername.trim();
      const { data, error } = await authApi.getUser(normalized);
      if (error || !data) {
        setAddContactError('User not found');
        return;
      }

      if (data.username === username) {
        setAddContactError('Cannot add yourself');
        return;
      }

      if (useContactsStore.getState().contacts.some((c) => c.username === data.username)) {
        setAddContactError('Contact already added');
        return;
      }

      const newContact: Contact = {
        id: data.id,
        username: data.username,
        publicKey: data.identityKey,
        exchangeKey: data.exchangeIdentityKey || data.exchangeKey || data.signedPrekey,
        addedAt: Date.now(),
      };

      const latestContacts = useContactsStore.getState().contacts;
      addContact(newContact);
      if (pin) {
        await saveContacts([...latestContacts, newContact], pin);
      }

      setShowAddContact(false);
      setNewContactUsername('');

      openChatForContact(data.id);
    } catch (e) {
      console.error('Add contact error:', e);
      setAddContactError('Error adding contact');
    } finally {
      setAddContactLoading(false);
    }
  };

  const executePanic = async () => {
    setPanicMode(true);
    wsClient.disconnect();
    await panicWipe();
    clearAuth();
    router.push('/');
  };

  const handleSend = async () => {
    if (!messageText.trim() || !contact || !userId || !identityKeys) return;

    setSending(true);

    const messageId = uuidv4();
    const timestamp = Date.now();
    const outgoingText = messageText;

    const message: Message = {
      id: messageId,
      chatId,
      senderId: userId,
      content: outgoingText,
      type: 'text',
      timestamp,
      status: 'sending',
      selfDestructAt: selfDestructTime ? timestamp + selfDestructTime * 1000 : undefined,
    };

    addMessage(chatId, message);
    setMessageText('');

    try {
      const plaintext = JSON.stringify({
        content: outgoingText,
        timestamp,
        selfDestruct: selfDestructTime ?? null,
      });
      const plaintextBytes = new TextEncoder().encode(plaintext);

      const sessions = useSessionsStore.getState().sessions;
      const existing = contactId ? sessions[contactId] : undefined;

      let session = existing ? deserializeSession(existing) : null;
      let x3dhInit: { senderIdentityKey: string; senderEphemeralKey: string; recipientOneTimePreKey?: string | null } | undefined;

      if (!session) {
        // First message to this contact: do X3DH (bundle is signed) and start a ratchet session.
        const { data: bundle, error: bundleError } = await authApi.getBundle(contact.username, identityKeys);
        if (bundleError || !bundle) {
          throw new Error(bundleError || 'Failed to fetch bundle');
        }

        const ok = verify(
          decodeBase64(bundle.signedPrekey),
          decodeBase64(bundle.signedPrekeySignature),
          bundle.identityKey
        );
        if (!ok) {
          throw new Error('Invalid signed prekey signature');
        }

        const recipientIk = bundle.exchangeIdentityKey || bundle.exchangeKey;
        if (!recipientIk) {
          throw new Error('Recipient bundle missing exchange identity key');
        }

        const { sharedSecret, ephemeralPublicKey } = x3dhInitiate(identityKeys.exchange, {
          identityKey: recipientIk,
          signedPreKey: bundle.signedPrekey,
          signature: bundle.signedPrekeySignature,
          oneTimePreKey: bundle.oneTimePrekey,
        });

        session = initSenderSession(sharedSecret, bundle.signedPrekey);
        x3dhInit = {
          senderIdentityKey: identityKeys.exchange.publicKey,
          senderEphemeralKey: ephemeralPublicKey,
          recipientOneTimePreKey: bundle.oneTimePrekey ?? null,
        };
      }

      const encrypted = ratchetEncrypt(session, plaintextBytes);
      const encryptedPayload = encodeRatchetEnvelope({
        encrypted,
        timestamp,
        selfDestruct: selfDestructTime,
        ...(x3dhInit ? { x3dh: x3dhInit } : {}),
      });

      if (contactId) {
        upsertSession(contactId, serializeSession(session));
      }

      const { data, error } = await messagesApi.send(
        {
          senderId: userId,
          recipientUsername: contact.username,
          encryptedPayload,
        },
        identityKeys
      );

      if (error) {
        updateMessage(chatId, messageId, { status: 'failed' });
      } else {
        clearCryptoBanner();
        updateMessage(chatId, messageId, { status: data?.delivered ? 'delivered' : 'sent' });
      }
    } catch (sendError) {
      console.error('Send message error:', sendError);
      const msg = sendError instanceof Error ? sendError.message : String(sendError);
      if (
        msg.includes('bundle') ||
        msg.includes('signed prekey') ||
        msg.includes('signature') ||
        msg.includes('exchange identity') ||
        msg.includes('Sending chain')
      ) {
        setCryptoBanner({ level: 'warning', message: 'Cannot establish secure session with this contact.' });
      }
      updateMessage(chatId, messageId, { status: 'failed' });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const timerOptions = [
    { value: null, label: 'Off' },
    { value: 5, label: '5s' },
    { value: 30, label: '30s' },
    { value: 60, label: '1m' },
    { value: 300, label: '5m' },
  ];

  if (!hydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-8 h-8 border-2 mono-spinner rounded-full animate-spin" />
      </div>
    );
  }
  if (isPanicMode) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--text-secondary)] uppercase tracking-[0.18em] text-sm">No messages</p>
      </div>
    );
  }

  if (!chat || !contact) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-secondary)] uppercase tracking-[0.18em] text-sm">Chat not found</p>
          <button onClick={() => router.push('/chats')} className="mt-4 apple-button-secondary px-6">
            Back
          </button>
        </div>
      </div>
    );
  }

  const chatListNode = (
    <ChatListPanel
      chats={chats}
      contacts={contacts}
      selectedChatId={chatId}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onSelectChat={(id) => {
        setActiveChat(id);
        router.push(`/chat/${id}`);
      }}
      onNewChat={() => setShowAddContact(true)}
    />
  );

  const chatViewNode = (
    <div className="lume-panel h-full min-h-0 rounded-[var(--radius-lg)] border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden flex flex-col">
      <header className="px-5 sm:px-6 py-4 border-b border-[var(--border)]/70">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push('/chats')}
              className="lume-icon-btn md:hidden"
              aria-label="Back"
              title="Back"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-3 min-w-0 hover:bg-[var(--surface-alt)] rounded-[18px] px-2 py-1.5 transition-colors"
            >
              <div className="w-11 h-11 rounded-full border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] p-[2px] flex-shrink-0">
                <div className="lume-avatar w-full h-full rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)] text-[16px] font-semibold">
                  {contact.username[0].toUpperCase()}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--text-primary)] truncate">
                  @{contact.username}
                </p>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {isTyping ? <span className="lume-badge">Typing...</span> : null}
                  {selfDestructTime ? <span className="lume-badge">Auto-delete {selfDestructTime}s</span> : null}
                </div>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOptions((v) => !v)}
              className="lume-icon-btn"
              aria-label="Options"
              title="Options"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v.01M12 12v.01M12 18v.01" />
              </svg>
            </button>
          </div>
        </div>

        {showOptions ? (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Auto-delete</span>
            {timerOptions.map((opt) => (
              <button
                key={opt.value ?? 'off'}
                type="button"
                onClick={() => {
                  setSelfDestructTime(opt.value);
                  setSelfDestructTimer(chatId, opt.value ?? undefined);
                }}
                className={`
                  px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors
                  ${
                    selfDestructTime === opt.value
                      ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                      : 'bg-[var(--surface-strong)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-alt)]'
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 space-y-2">
        {chat.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] flex items-center justify-center text-[var(--text-muted)]">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4v8z" />
              </svg>
            </div>
            <p className="mt-4 text-[13px] font-semibold text-[var(--text-primary)]">No messages yet</p>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">Send the first message.</p>
          </div>
        ) : (
          <>
            {chat.messages.map((m) => (
              <MessageBubbleMemo key={m.id} message={m} isMine={m.senderId === userId} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </main>

      <footer className="px-5 sm:px-6 py-4 border-t border-[var(--border)]/70">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type message..."
              rows={1}
              className="w-full px-4 py-3 bg-[var(--surface-strong)] rounded-full border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] resize-none shadow-[var(--shadow-sm)]"
              style={{ minHeight: '48px', maxHeight: '140px' }}
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!messageText.trim() || sending}
            className="w-12 h-12 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] border border-[var(--border)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-sm)]"
            aria-label="Send"
            title="Send"
          >
            {sending ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>

        {selfDestructTime ? (
          <div className="mt-2 text-center">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Auto-delete in {selfDestructTime}s
            </span>
          </div>
        ) : null}
      </footer>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full overflow-hidden">
      {/* Mobile: chat only */}
      <div className="md:hidden h-full min-h-0 p-3 sm:p-5">{chatViewNode}</div>

      {/* Desktop: dashboard shell */}
      <div className="hidden md:block h-full min-h-0">
        <MessengerShell
          leftRail={<LeftRail onPanic={() => setShowPanicConfirm(true)} />}
          chatList={chatListNode}
          main={chatViewNode}
          rightRail={
            contacts.length > 0 ? (
              <RightRail
                contacts={contacts}
                chats={chats}
                activeChatId={activeChatId}
                onOpenContact={openChatForContact}
              />
            ) : undefined
          }
        />
      </div>

      <Modal
        isOpen={showAddContact}
        onClose={() => {
          setShowAddContact(false);
          setNewContactUsername('');
          setAddContactError('');
        }}
        title="Start Chat"
      >
        <div className="space-y-4">
          <Input
            label="Recipient Username"
            value={newContactUsername}
            onChange={(e) => setNewContactUsername(e.target.value.replace(/^@+/, ''))}
            placeholder="username"
            error={addContactError}
            icon={<span className="text-[var(--text-muted)]">@</span>}
          />
          <Button fullWidth onClick={handleAddContact} loading={addContactLoading} disabled={!newContactUsername}>
            Start
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showPanicConfirm} onClose={() => setShowPanicConfirm(false)} title="Wipe Data?">
        <div className="space-y-6">
          <p className="text-[var(--text-secondary)]">
            This will delete all local keys, contacts and messages on this device. It cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowPanicConfirm(false)} className="flex-1 apple-button-secondary">
              Cancel
            </button>
            <button onClick={executePanic} className="flex-1 apple-button">
              Wipe
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showProfile} onClose={() => setShowProfile(false)} title="Contact Profile">
        <div className="flex flex-col items-center pt-2 pb-6">
          <div className="w-24 h-24 bg-[var(--surface-strong)] rounded-full flex items-center justify-center text-[var(--text-primary)] text-4xl font-semibold mb-4 border border-[var(--border)]">
            {contact.username[0].toUpperCase()}
          </div>
          <h2 className="text-[14px] font-semibold uppercase tracking-[0.14em] text-[var(--text-primary)] mb-1">
            @{contact.username}
          </h2>
          <p className="text-[12px] text-[var(--text-muted)] mb-6">LUME User</p>

          {identityKeys ? (
            <div className="w-full bg-[var(--surface-alt)] rounded-[var(--radius-md)] p-5 border border-[var(--border)] text-center">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Safety number</p>
              <p className="mt-3 text-[14px] font-semibold tracking-[0.12em] text-[var(--text-primary)] leading-relaxed">
                {safetyNumber}
              </p>

              <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  className="apple-button-secondary px-4"
                  onClick={async () => {
                    if (!safetyNumber) return;
                    await navigator.clipboard.writeText(safetyNumber);
                    setCopiedSafety(true);
                    setTimeout(() => setCopiedSafety(false), 1200);
                  }}
                >
                  {copiedSafety ? 'Copied' : 'Copy'}
                </button>

                <button
                  type="button"
                  className={`px-4 py-3 rounded-full border transition-colors text-[12px] font-semibold uppercase tracking-[0.08em] ${
                    contact.verified
                      ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--border)]'
                      : 'bg-[var(--surface-strong)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface)]'
                  }`}
                  onClick={async () => {
                    const nextVerified = !contact.verified;
                    useContactsStore.getState().updateContact(contact.id, {
                      verified: nextVerified,
                      verifiedAt: nextVerified ? Date.now() : undefined,
                    });
                  }}
                >
                  {contact.verified ? 'Verified' : 'Mark verified'}
                </button>
              </div>

              <p className="mt-4 text-[12px] text-[var(--text-muted)]">
                Compare this number with your contact out of band. If it matches, mark verified.
              </p>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
