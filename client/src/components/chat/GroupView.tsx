"use client";

import { useState } from "react";
import { groupsApi } from "@/lib/api";
import type { GroupData } from "@/lib/api";
import { useAuthStore, useGroupsStore } from "@/stores";
import { Button } from "@/components/ui";
import AddMemberModal from "@/components/modals/AddMemberModal";

interface GroupViewProps {
  group: GroupData;
}

export default function GroupView({ group }: GroupViewProps) {
  const userId = useAuthStore((s) => s.userId);
  const identityKeys = useAuthStore((s) => s.identityKeys);
  const updateGroup = useGroupsStore((s) => s.updateGroup);
  const removeGroup = useGroupsStore((s) => s.removeGroup);
  const setActiveGroup = useGroupsStore((s) => s.setActiveGroup);

  const [showAddMember, setShowAddMember] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [error, setError] = useState("");

  const currentMember = group.members.find((m) => m.user_id === userId);
  const isAdmin = currentMember?.role === "admin";

  const handleRemoveMember = async (memberUserId: string) => {
    if (!identityKeys) return;

    setRemovingId(memberUserId);
    setError("");

    const result = await groupsApi.removeMember(group.id, memberUserId, identityKeys);

    if (result.error) {
      setError(result.error);
      setRemovingId(null);
      return;
    }

    updateGroup(group.id, {
      members: group.members.filter((m) => m.user_id !== memberUserId),
    });
    setRemovingId(null);
  };

  const handleLeaveGroup = async () => {
    if (!identityKeys || !userId) return;

    setLeavingGroup(true);
    setError("");

    const result = await groupsApi.removeMember(group.id, userId, identityKeys);

    if (result.error) {
      setError(result.error);
      setLeavingGroup(false);
      return;
    }

    setActiveGroup(null);
    removeGroup(group.id);
  };

  return (
    <div className="lume-panel h-full min-h-0 rounded-[var(--radius-lg)] border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)]/70 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setActiveGroup(null)}
            className="lume-icon-btn md:hidden flex-shrink-0"
            aria-label="Back to groups"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-10 h-10 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] flex items-center justify-center text-[var(--text-muted)] flex-shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
              <circle cx="9" cy="7" r="4" strokeWidth="1.8" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M23 21v-2a4 4 0 00-3-3.87" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
              {group.name}
            </h2>
            <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.1em]">
              {group.members.length} {group.members.length === 1 ? "member" : "members"}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)]">
            <p className="text-[12px] text-[var(--text-secondary)]">{error}</p>
          </div>
        )}

        {/* Members section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Members
            </h3>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAddMember(true)}
                className="lume-icon-btn"
                aria-label="Add member"
                title="Add member"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
                  <circle cx="8.5" cy="7" r="4" strokeWidth="1.8" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20 8v6M23 11h-6" />
                </svg>
              </button>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] overflow-hidden">
            {group.members.map((member) => {
              const isSelf = member.user_id === userId;
              const memberIsAdmin = member.role === "admin";
              const canRemove = isAdmin && !memberIsAdmin && !isSelf;
              const isRemoving = removingId === member.user_id;

              return (
                <div
                  key={member.user_id}
                  className="px-4 py-3 flex items-center gap-3 border-b border-[var(--border)]/40 last:border-b-0"
                >
                  <div className="w-9 h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-[12px] font-semibold flex-shrink-0">
                    {member.username[0]!.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[var(--text-primary)] truncate">
                        @{member.username}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.1em]">
                          you
                        </span>
                      )}
                    </div>
                    {memberIsAdmin && (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                        Admin
                      </span>
                    )}
                  </div>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => void handleRemoveMember(member.user_id)}
                      disabled={isRemoving}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
                      aria-label={`Remove ${member.username}`}
                      title={`Remove ${member.username}`}
                    >
                      {isRemoving ? (
                        <div className="w-4 h-4 border-2 mono-spinner rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Group info */}
        <div className="mb-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] mb-3">
            Info
          </h3>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[var(--text-muted)]">Created</span>
              <span className="text-[12px] text-[var(--text-secondary)]">
                {new Date(group.created_at).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Leave group */}
        <Button
          variant="danger"
          fullWidth
          onClick={() => void handleLeaveGroup()}
          loading={leavingGroup}
        >
          Leave Group
        </Button>
      </div>

      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        group={group}
      />
    </div>
  );
}
