"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { Contact } from "@/crypto/storage";
import { Avatar } from "@/components/ui";
import { formatTimerLabel, TIMER_OPTIONS } from "./chatUtils";

interface ChatHeaderProps {
  contact: Contact;
  avatarUrl?: string | null;
  isTyping: boolean;
  selfDestructTime: number | null;
  showOptions: boolean;
  onBack: () => void;
  onOpenProfile: () => void;
  onToggleOptions: () => void;
  onSelectTimer: (value: number | null) => void;
}

export default function ChatHeader({
  contact,
  avatarUrl,
  isTyping,
  selfDestructTime,
  showOptions,
  onBack,
  onOpenProfile,
  onToggleOptions,
  onSelectTimer,
}: ChatHeaderProps) {
  const timerContainerRef = useRef<HTMLDivElement>(null);
  const [timerIndicator, setTimerIndicator] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>({ left: 0, top: 0, width: 0, height: 0 });
  const [timerReady, setTimerReady] = useState(false);

  const updateTimerIndicator = useCallback(() => {
    const container = timerContainerRef.current;
    if (!container || !showOptions) {
      setTimerReady(false);
      return;
    }
    const activeIndex = TIMER_OPTIONS.findIndex(
      (opt) => opt.value === selfDestructTime,
    );
    if (activeIndex < 0) {
      setTimerReady(false);
      return;
    }
    const buttons = container.querySelectorAll<HTMLButtonElement>(
      "[data-timer-option]",
    );
    const activeBtn = buttons[activeIndex];
    if (!activeBtn) return;
    setTimerIndicator({
      left: activeBtn.offsetLeft,
      top: activeBtn.offsetTop,
      width: activeBtn.offsetWidth,
      height: activeBtn.offsetHeight,
    });
    setTimerReady(true);
  }, [selfDestructTime, showOptions]);

  useEffect(() => {
    updateTimerIndicator();
  }, [updateTimerIndicator]);

  return (
    <header className="px-3 sm:px-5 md:px-6 py-3 sm:py-4 border-b border-[var(--border)]/70">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            className="lume-icon-btn md:hidden"
            aria-label="Back"
            title="Back"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-3 min-w-0 hover:bg-[var(--surface-alt)] rounded-[18px] px-2 py-1.5 transition-colors"
          >
            <div className="w-11 h-11 rounded-full border border-[var(--border)] flex-shrink-0 overflow-hidden">
              <Avatar src={avatarUrl} username={contact.username} size="lg" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--text-primary)] truncate">
                @{contact.username}
              </p>
              <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                {isTyping ? (
                  <span className="lume-badge">Typing...</span>
                ) : selfDestructTime ? (
                  <span className="lume-badge">
                    Auto-delete {formatTimerLabel(selfDestructTime)}
                  </span>
                ) : (
                  <span className="text-[12px] text-[var(--text-muted)] flex items-center gap-1.5">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Encrypted chat
                  </span>
                )}
              </div>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onToggleOptions}
            className="lume-icon-btn"
            aria-label="Options"
            title="Options"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6v.01M12 12v.01M12 18v.01"
              />
            </svg>
          </button>
        </div>
      </div>

      {showOptions ? (
        <div className="mt-4 flex items-center gap-2 flex-wrap animate-fade-in-up">
          <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Auto-delete
          </span>
          <div ref={timerContainerRef} className="relative flex items-center gap-2 flex-wrap">
            {timerReady && (
              <div
                className="absolute rounded-full z-0 bg-[var(--accent)]"
                style={{
                  left: timerIndicator.left,
                  top: timerIndicator.top,
                  width: timerIndicator.width,
                  height: timerIndicator.height,
                  transition:
                    "left 0.2s cubic-bezier(0.4, 0, 0.2, 1), top 0.2s cubic-bezier(0.4, 0, 0.2, 1), width 0.2s cubic-bezier(0.4, 0, 0.2, 1), height 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            )}
            {TIMER_OPTIONS.map((opt) => (
              <button
                key={opt.value ?? "off"}
                type="button"
                data-timer-option
                onClick={() => onSelectTimer(opt.value)}
                className={`
                  relative z-[1] px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors
                  ${
                    selfDestructTime === opt.value
                      ? "text-[var(--accent-contrast)] border-transparent"
                      : "bg-[var(--surface-strong)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-alt)]"
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
