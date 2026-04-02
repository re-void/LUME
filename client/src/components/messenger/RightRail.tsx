'use client';

import React from 'react';
import type { Chat } from '@/stores';
import { useUIStore } from '@/stores';
import type { Contact } from '@/crypto/storage';
import { Avatar } from '@/components/ui';

function AvatarButton({
  contact,
  active,
  onClick,
  avatarUrl,
}: {
  contact: Contact;
  active?: boolean;
  onClick: () => void;
  avatarUrl?: string | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-12 h-12 rounded-full border flex items-center justify-center transition-colors overflow-hidden
        bg-[var(--surface)] border-[var(--border)]
        hover:bg-[var(--surface-alt)] shadow-[var(--shadow-sm)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]
        ${active ? 'ring-2 ring-[var(--accent)]' : ''}
      `}
      title={contact.username}
      aria-label={contact.username}
    >
      <Avatar src={avatarUrl} username={contact.username} size="md" />
    </button>
  );
}

export default function RightRail({
  contacts,
  chats,
  activeChatId,
  onOpenContact,
  avatarMap,
}: {
  contacts: Contact[];
  chats: Chat[];
  activeChatId: string | null;
  onOpenContact: (contactId: string) => void;
  avatarMap?: Record<string, string>;
}) {
  const collapsed = useUIStore((s) => s.contactsPanelCollapsed);
  const setCollapsed = useUIStore((s) => s.setContactsPanelCollapsed);

  const contactOrder = [...contacts].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));

  const activeContactId = activeChatId
    ? chats.find((c) => c.id === activeChatId)?.contactId ?? null
    : null;

  return (
    <div
      className="lume-panel h-full min-h-0 rounded-[var(--radius-lg)] border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden"
      style={{ transition: 'width 0.2s ease', width: collapsed ? '48px' : undefined }}
    >
      <div className="h-full flex flex-col items-center px-3 pt-4 pb-4">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="lume-icon-btn w-8 h-8 mb-2 flex-shrink-0"
          aria-label={collapsed ? 'Expand contacts' : 'Collapse contacts'}
          title={collapsed ? 'Expand contacts' : 'Collapse contacts'}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? (
              <path d="M9 18l6-6-6-6" />
            ) : (
              <path d="M15 18l-6-6 6-6" />
            )}
          </svg>
        </button>
        {!collapsed && (
          <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3 flex-shrink-0">Contacts</p>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto w-full flex flex-col items-center gap-3 pt-1">
          {contactOrder.map((c) => (
            <AvatarButton
              key={c.id}
              contact={c}
              active={activeContactId === c.id}
              onClick={() => onOpenContact(c.id)}
              avatarUrl={collapsed ? undefined : avatarMap?.[c.id]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
