# LUME Roadmap

Updated: 2026-03-09

## Rules

- Single source of truth for active development priorities.
- Completed items → move to Done with date.
- After each task: add `ready-for-check` entry to `CI_HANDOFF.md`.
- Push only to `origin` (GitLab) — GitHub mirrors automatically.

---

## Now (In Progress)

_Nothing in progress._

---

## Next (High Priority)

- [ ] Deploy to production — fly.io (server) + Vercel (client)
- [ ] Group chats / multi-user conversations
- [ ] Message search

---

## Backlog

- [ ] Voice messages (Web Audio API recording)
- [ ] File / image attachments (E2E encrypted)
- [ ] Push notifications (PWA / service worker)
- [ ] Message reactions (emoji)
- [ ] Typing indicators
- [ ] Self-destruct per individual message (not only per chat)
- [ ] Multi-device support (key sync across devices)
- [ ] Admin / moderation panel (for hosted version)

---

## Done

### 2026-03-09 — Security Hardening Complete

All 16 security findings from the audit are now resolved.

**HIGH (sessions 03-07, 03-09):**

- [x] CRITICAL-01: PIN removed from Zustand store, replaced with masterKey derived in-session only
- [x] HIGH-01: Hidden chat PIN hardened to PBKDF2 600k iterations, format `salt:iterations:hash`, legacy migration
- [x] HIGH-02: Confirmed `requireSignature` middleware on `/auth/user/:username` (already implemented)
- [x] HIGH-03: CSP nonce-based middleware confirmed; Referrer-Policy updated to `strict-origin-when-cross-origin`
- [x] HIGH-04: Custom HMAC-SHA-512/HKDF replaced with `@noble/hashes` (SHA-256) in Double Ratchet
- [x] HIGH-05: X3DH SPK signature verification added

**MEDIUM (session 03-09):**

- [x] M-01: `.env` in git history — CLOSED (not applicable; no secrets were committed)
- [x] M-03: `Math.random` → CSPRNG — CLOSED (not applicable; no `Math.random` used in security contexts)
- [x] M-04: WS messageIds validation — CLOSED (not applicable; already validated server-side)
- [x] M-05: SPK periodic rotation — 7-day interval + 48-hour grace period implemented
- [x] M-06: Backup PIN strengthened to PBKDF2 600k iterations with v2 envelope
- [x] M-07: panicWipe completeness — SW cache clear, all Zustand stores reset, bfcache prevention

**LOW (session 03-09):**

- [x] L-01: `dangerouslySetInnerHTML` CSP hash — CLOSED (acceptable risk; content is sanitized)
- [x] L-02: Username enumeration rate limit — CLOSED (mitigated by existing rate limiting)
- [x] L-03: Server stack traces sanitized — 22 `console.error` calls cleaned up for production
- [x] L-04: `npm audit` fix + audit CI stage added to `.gitlab-ci.yml`

### 2026-03-07

- [x] Mobile swipeable panel navigation — `MobileSwipeShell`, Profile ↔ Messages swipe on mobile, dot indicators
- [x] Full mobile responsive layout — all pages (chats, chat view, settings, auth flows)
- [x] Settings page split into 5 focused components — AppearanceSection, NotificationsSection, PrivacySection, SecuritySection, DangerZoneSection
- [x] Post-restore consistency checks — reconcile hidden chats + settings integrity after backup import
- [x] Hidden Chats settings sync on route navigation — reload on window focus / visibilitychange
- [x] Integration tests: account deletion + panic wipe lifecycle — 11 new tests, 33 total passing
- [x] server `.prettierrc` added to pin formatting config for CI

### 2026-02-26

- [x] Server source files formatted with Prettier (formatting only, no logic changes)

### 2026-02-24

- [x] CI migrated to GitLab — project-specific `.gitlab-ci.yml`, GitHub Actions archived to manual-only

### 2026-02-21

- [x] Hidden Chats core flow — PIN setup in Settings, lock/unlock in chat list, hide/unhide from chat profile
- [x] Blocked users sync — server endpoint + client boot-time merge with local blocked IDs
- [x] Desktop notifications runtime gating aligned with Settings toggle
- [x] Sound preference initialization fix — always resyncs from storage on re-auth in same tab
- [x] Client-side settings consistency harness on bootstrap (hidden chats state reconciliation)
- [x] `POST /auth/block` returns `404` for unknown `blockedId` (was 500)
- [x] Integration tests: block / blocked endpoint negative paths

### 2026-02-16

- [x] Reply / quote messages with inline quote block
- [x] Sound notifications — Web Audio API two-tone chime, no external audio file
- [x] Contact blocking — server `blocked_users` table + client block/unblock UI
- [x] Fix: infinite loop (Maximum update depth exceeded) on chat open

### 2026-02-15

- [x] Settings page — theme, notifications, self-destruct, hidden chats, Change PIN, Delete Account
- [x] Security hardening (12 fixes) — constant-time PIN verify, brute-force lockout, CSPRNG nonce, prekey cap 1000, account deletion order, WebSocket logout split
- [x] Read receipts + desktop notifications + message / contact deletion
- [x] Refactor: remove dead code, extract shared hooks (useContactActions, usePanic)

### 2026-02-14

- [x] Initial project setup — client (Next.js 16 + React 19 + Tailwind 4) + server (Express + WebSocket + SQLite) + GitLab CI
