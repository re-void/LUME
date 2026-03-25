"use client";

import { useState, useMemo } from "react";
import { Modal, Button, Input } from "@/components/ui";
import { groupsApi } from "@/lib/api";
import type { GroupData } from "@/lib/api";
import { useAuthStore, useContactsStore, useGroupsStore } from "@/stores";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_MEMBERS = 50;

export default function CreateGroupModal({
  isOpen,
  onClose,
}: CreateGroupModalProps) {
  const identityKeys = useAuthStore((s) => s.identityKeys);
  const contacts = useContactsStore((s) => s.contacts);
  const addGroup = useGroupsStore((s) => s.addGroup);

  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.username.toLowerCase().includes(q));
  }, [contacts, search]);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_MEMBERS) return prev;
        next.add(id);
      }
      return next;
    });
  };

  const resetAndClose = () => {
    setGroupName("");
    setSelectedIds(new Set());
    setSearch("");
    setError("");
    setLoading(false);
    onClose();
  };

  const handleCreate = async () => {
    const name = groupName.trim();
    if (!name) {
      setError("Group name is required");
      return;
    }
    if (selectedIds.size < 1) {
      setError("Select at least 1 member");
      return;
    }
    if (!identityKeys) {
      setError("Authentication required");
      return;
    }

    setError("");
    setLoading(true);

    const result = await groupsApi.create(
      name,
      Array.from(selectedIds),
      identityKeys
    );

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.data) {
      addGroup(result.data as GroupData);
    }

    setLoading(false);
    resetAndClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="New Group">
      <div className="space-y-4">
        <Input
          label="Group Name"
          value={groupName}
          onChange={(e) => {
            setGroupName(e.target.value.slice(0, 64));
            if (error) setError("");
          }}
          placeholder="Enter group name"
          error={error || undefined}
          autoFocus
        />

        <div>
          <p className="block apple-label mb-1.5">
            Members ({selectedIds.size}/{MAX_MEMBERS})
          </p>

          {contacts.length > 5 && (
            <div className="relative mb-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts..."
                className="apple-input apple-input-icon"
                aria-label="Search contacts"
              />
            </div>
          )}

          <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-strong)]">
            {filteredContacts.length === 0 ? (
              <p className="px-4 py-3 text-[12px] text-[var(--text-muted)] text-center">
                {contacts.length === 0 ? "No contacts yet" : "No matches"}
              </p>
            ) : (
              filteredContacts.map((contact) => {
                const checked = selectedIds.has(contact.id);
                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => toggleMember(contact.id)}
                    className={`
                      w-full px-4 py-2.5 text-left flex items-center gap-3
                      border-b border-[var(--border)]/40 last:border-b-0
                      transition-colors
                      ${checked ? "bg-[var(--surface-alt)]" : "hover:bg-[var(--surface-alt)]"}
                    `}
                  >
                    <div
                      className={`
                        w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors
                        ${checked ? "bg-[var(--accent)] border-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface)]"}
                      `}
                    >
                      {checked && (
                        <svg className="w-3 h-3 text-[var(--accent-contrast)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div
                      className="w-8 h-8 rounded-full border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-[12px] font-semibold flex-shrink-0"
                    >
                      {contact.username[0]!.toUpperCase()}
                    </div>
                    <span className="text-[13px] text-[var(--text-primary)] truncate">
                      @{contact.username}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <Button
          fullWidth
          onClick={() => void handleCreate()}
          loading={loading}
          disabled={!groupName.trim() || selectedIds.size < 1}
        >
          Create Group
        </Button>
      </div>
    </Modal>
  );
}
