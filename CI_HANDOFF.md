# CI/CD Handoff — LUME

Use this file to pass changes from the developer to the DevOps engineer.
Push only to `origin` (GitLab). GitHub mirrors automatically via push-mirror.

---

## Entry Template

```
## YYYY-MM-DD — type(scope): short description

Status: ready-for-check | pushed | blocked
Commit: `hash`

Summary:
- change 1
- change 2

Changed files:
- path/to/file

Checks: server (type-check, lint, test, build) | client (lint, build)
Notes: any risks or migration notes
```

## Rules

1. `ready-for-check` — DevOps runs checks and pushes if green.
2. `blocked` — checks failed; includes reason.
3. `pushed` — committed and pushed to GitLab; commit ref recorded.

---

## 2026-03-09 — security: complete security hardening (all findings resolved)

Status: ready-for-check
Commit: pending (multiple commits across sessions 03-07, 03-09)

Summary:
- CRITICAL-01: PIN removed from Zustand store, replaced with in-session masterKey
- HIGH-01: Hidden chat PIN → PBKDF2 600k iterations, legacy migration
- HIGH-02: Confirmed requireSignature middleware on /auth/user/:username
- HIGH-03: CSP nonce-based confirmed; Referrer-Policy → strict-origin-when-cross-origin
- HIGH-04: Custom HMAC-SHA-512/HKDF → @noble/hashes SHA-256 in Double Ratchet
- HIGH-05: X3DH SPK signature verification
- M-05: SPK periodic rotation (7-day interval + 48h grace period)
- M-06: Backup PIN strengthened to 600k PBKDF2 with v2 envelope
- M-07: panicWipe completeness (SW cache, all Zustand stores, bfcache clear)
- L-03: Server stack traces sanitized (22 console.error calls)
- L-04: npm audit fix + audit CI stage added
- M-01, M-03, M-04 closed as not applicable
- L-01, L-02 closed as acceptable/mitigated

Changed files (client):
- client/src/crypto/ratchet.ts
- client/src/crypto/storage.ts
- client/src/crypto/x3dh.ts
- client/src/stores/index.ts
- client/src/components/messenger/ChatListPanel.tsx
- client/src/app/settings/page.tsx
- client/src/app/settings/components/SecuritySection.tsx
- client/src/app/settings/components/DangerZoneSection.tsx
- client/src/middleware.ts
- client/next.config.ts
- client/src/lib/settingsConsistency.ts
- client/src/__tests__/crypto.ratchet.test.ts

Changed files (server):
- server/src/index.ts
- server/src/routes/auth.ts
- server/src/routes/messages.ts
- server/src/middleware/auth.ts
- server/src/websocket/handler.ts
- server/src/utils/validators.ts
- server/src/db/database.ts
- .gitlab-ci.yml

Checks: run `npx vitest run` in client AND server before push. All tests must pass.
Notes:
- Tests have NOT been run yet on the security changes — must pass before push
- .gitlab-ci.yml updated with `audit` stage — verify pipeline runs correctly
- @noble/hashes is a new dependency in client — verify it's in package.json
- No database migrations required
- Breaking change: PIN storage format changed (v1 → v2 with salt:iterations:hash), but legacy migration is included

---

## 2026-03-07 — chore(server): add .prettierrc to fix CI format:check

Status: pushed
Commit: `6ca2c4e`

Summary:
- added `server/.prettierrc` with pinned formatting config
- fixes CI `format:check` failure caused by missing config in pipeline environment

Changed files:
- server/.prettierrc (new)

Checks: server type-check ✅, lint ✅, format:check ✅, test (33 passed) ✅, build ✅ | client lint ✅, build ✅

---

## 2026-03-07 — feat(client): add mobile swipeable panel navigation

Status: pushed
Commit: `7cc230d`

Summary:
- new `MobileSwipeShell` component — swipe between Profile (LeftRail) and Messages (ChatListPanel)
- Profile panel shown by default on mobile
- swipe left → Messages, swipe right → Profile
- dot indicators at bottom, clickable
- desktop layout (MessengerShell) unchanged
- no external libraries — native touch events only; vertical scroll inside panels unaffected

Changed files:
- client/src/components/messenger/MobileSwipeShell.tsx (new)
- client/src/app/chats/page.tsx

Checks: server type-check ✅, lint ✅, test (33 passed) ✅, build ✅ | client lint ✅, build ✅

---

## 2026-03-07 — feat(client): make all pages responsive for mobile

Status: pushed
Commit: `0df35b6`

Summary:
- mobile-first layout across all routes: chat, chats, settings, auth flows
- Settings: full-screen mobile view with Back button (was hidden in MessengerShell on mobile)
- Modal: bottom-sheet on mobile (rounded-t-2xl, max-h scroll)
- MessageBubble: max-width 85% on mobile (was 78%)
- iOS Safari: 16px font-size on all inputs/textareas prevents auto-zoom
- Touch targets: min-height 44px on buttons, lume-icon-btn 44×44px
- html overflow-x hidden — no horizontal scroll on any page

Changed files:
- client/src/app/globals.css
- client/src/app/page.tsx
- client/src/app/unlock/page.tsx
- client/src/app/setup/page.tsx
- client/src/app/recover/page.tsx
- client/src/app/chats/page.tsx
- client/src/app/chat/[id]/page.tsx
- client/src/app/settings/page.tsx
- client/src/components/messenger/ChatListPanel.tsx
- client/src/components/ui/Modal.tsx

Checks: server type-check ✅, lint ✅, test (33 passed) ✅, build ✅ | client lint ✅, build ✅
Notes: eslint-disable-next-line added for react-hooks/set-state-in-effect in ChatListPanel and settings/page (async initial load pattern, pre-existing)

---

## 2026-03-07 — test(server): account deletion + panic wipe lifecycle tests

Status: pushed
Commit: `3aa35ad`

Summary:
- 11 new integration tests for `DELETE /auth/user/:userId`
- covers: successful deletion, post-deletion access denials (session, messages, prekey bundle), username reuse, cross-user rejection, malformed input, unauthenticated request, full panic wipe server invariant
- panic wipe is client-side only; tests validate server-side invariants via account deletion path

Changed files:
- server/test/flow.integration.test.ts

Checks: server type-check ✅, lint ✅, test (33 passed) ✅, build ✅ | client lint ✅, build ✅

---

## 2026-03-07 — refactor(settings): split page into focused section components

Status: pushed
Commit: `6d18872`

Summary:
- settings/page.tsx (741 lines) split into 5 focused components + shared primitives
- AppearanceSection, NotificationsSection, PrivacySection, SecuritySection, DangerZoneSection
- main page.tsx reduced to ~160 lines thin orchestrator
- no functional changes, pure structural refactor

Changed files:
- client/src/app/settings/page.tsx
- client/src/app/settings/components/shared.tsx (new)
- client/src/app/settings/components/AppearanceSection.tsx (new)
- client/src/app/settings/components/NotificationsSection.tsx (new)
- client/src/app/settings/components/PrivacySection.tsx (new)
- client/src/app/settings/components/SecuritySection.tsx (new)
- client/src/app/settings/components/DangerZoneSection.tsx (new)

Checks: server type-check ✅, lint ✅, test (33 passed) ✅, build ✅ | client lint ✅, build ✅

---

## 2026-03-07 — fix(restore): reconcile state after backup import

Status: pushed
Commit: `06f2f25`

Summary:
- added `reconcileRestoreConsistency()` in settingsConsistency.ts
- runs after `importEncryptedBackup`: reconciles hidden chats, validates theme/selfDestructDefault, fixes PIN inconsistencies
- called in chat/[id]/page.tsx after successful restore

Changed files:
- client/src/lib/settingsConsistency.ts
- client/src/app/chat/[id]/page.tsx

Checks: server type-check ✅, lint ✅, test (33 passed) ✅, build ✅ | client lint ✅, build ✅

---

## 2026-03-07 — fix(chat-list): reload settings on focus

Status: pushed
Commit: `df29c15`

Summary:
- ChatListPanel was not reloading settings after navigating /settings → /chats
- added window focus + visibilitychange listeners to re-read settings from idb-keyval
- hidden chats toggle now takes effect without full page reload

Changed files:
- client/src/components/messenger/ChatListPanel.tsx

Checks: server type-check ✅, lint ✅, test (33 passed) ✅, build ✅ | client lint ✅, build ✅

---

## 2026-02-26 — chore(server): apply prettier formatting to all source files

Status: pushed
Commit: `(see git log 2026-02-26)`

Summary:
- prettier --write on all 9 server source files
- formatting only, no logic changes

Changed files:
- server/src/db/database.ts
- server/src/index.ts
- server/src/middleware/auth.ts
- server/src/routes/auth.ts
- server/src/routes/messages.ts
- server/src/utils/originAllowlist.ts
- server/src/utils/validators.ts
- server/src/websocket/handler.ts
- server/src/websocket/index.ts

Checks: server type-check ✅, lint ✅, format:check ✅, test (21 passed) ✅, build ✅ | client lint ✅, build ✅

---

## 2026-02-24 — ci(gitlab): finalize pipeline ownership

Status: pushed
Commit: `7242687`

Summary:
- migrated active CI to GitLab with project-specific .gitlab-ci.yml
- always-on pipeline smoke job added
- GitHub Actions archived to manual-only mode

Changed files:
- .gitlab-ci.yml
- .github/workflows/ci.yml
- README.md

Checks: GitLab pipeline ✅, server test ✅, client lint ✅

---

## 2026-02-21 — fix(hidden-chats): stability batch

Status: pushed
Commit: `8bed3d1`

Summary:
- stabilized Hidden Chats PIN flows (setup/change/reset) in settings
- hide/unhide controls in ChatListPanel with hidden mode handling
- settings consistency harness on bootstrap (reconcile hidden chats state)
- sound preference init always resyncs with persisted storage
- POST /auth/block returns 404 for unknown blockedId (was 500)
- integration tests: block/blocked endpoint negative paths

Changed files:
- client/src/app/settings/page.tsx
- client/src/components/messenger/ChatListPanel.tsx
- client/src/hooks/useMessengerSync.ts
- client/src/lib/settingsConsistency.ts
- client/src/app/chat/[id]/page.tsx
- client/src/lib/sounds.ts
- server/src/routes/auth.ts
- server/test/flow.integration.test.ts
- ROADMAP.md

Checks: server type-check ✅, lint ✅, test ✅, build ✅ | client lint ✅, build ✅

---

## 2026-02-21 — feat(hidden-chats): core flow + blocked sync + notifications

Status: pushed
Commit: `5dd8115`

Summary:
- Hidden Chats end-to-end: PIN setup in Settings, lock/unlock in chat list, hide/unhide from chat profile
- blocked users sync endpoint (server) + client boot-time merge with local blocked IDs
- desktop notifications runtime gating aligned with Settings toggle

Changed files:
- client/src/stores/index.ts
- client/src/components/messenger/ChatListPanel.tsx
- client/src/app/chat/[id]/page.tsx
- client/src/app/settings/page.tsx
- client/src/components/OnlineStatus.tsx
- client/src/hooks/useMessengerSync.ts
- client/src/lib/api.ts
- server/src/routes/auth.ts
- server/test/flow.integration.test.ts

Checks: server type-check ✅, lint ✅, test ✅, build ✅ | client lint ✅, build ✅

---

## 2026-02-16 — feat: reply/quote, sound notifications, contact blocking

Status: pushed
Commit: `b39c68d`

Summary:
- reply/quote messages with inline quote block
- sound notifications via Web Audio API (C5→E5 chime, no external file)
- contact blocking: server blocked_users table + client block/unblock UI + silent drop on send

Changed files:
- client/src/stores/index.ts
- client/src/app/chat/[id]/page.tsx
- client/src/lib/sounds.ts
- client/src/hooks/useMessengerSync.ts
- client/src/app/settings/page.tsx
- server/src/db/database.ts
- server/src/routes/auth.ts
- server/src/routes/messages.ts

Checks: server type-check ✅, lint ✅, test ✅, build ✅ | client lint ✅, build ✅

---

## 2026-02-16 — fix: infinite loop on chat open

Status: pushed
Commit: `11f02a7`

Summary:
- markAsRead() bail-out: skip state update when unreadCount already 0
- removed reactive chat object from useEffect dep array in chat/[id]/page.tsx

Changed files:
- client/src/stores/index.ts
- client/src/app/chat/[id]/page.tsx

Checks: server ✅ | client ✅

---

## 2026-02-15 — feat+security: settings page, security hardening, read receipts

Status: pushed
Commit: `dcd2cfe`

Summary:
- full Settings page (theme, notifications, self-destruct, hidden chats, Change PIN, Delete Account)
- 12 security fixes: constant-time PIN, brute-force lockout, CSPRNG nonce, prekey cap 1000, account deletion server call before panic wipe, WebSocket disconnect/logout split
- read receipts UI, desktop notifications, message/contact deletion

Changed files:
- client/src/app/settings/page.tsx (new)
- client/src/components/ui/Skeleton.tsx (new)
- client/src/lib/theme.ts (new)
- + 13 other files

Checks: server type-check ✅, lint ✅, test ✅, build ✅ | client lint ✅, build ✅

---

## 2026-02-15 — feat: read receipts, desktop notifications, message/contact deletion

Status: pushed
Commit: `cd5ead0`

Summary:
- WebSocket read receipt forwarding (server)
- Desktop Notifications API (client)
- sendReadReceipt on chat open and message receive
- per-message delete button + Delete Contact with confirmation

Changed files:
- server/src/websocket/handler.ts
- client/src/lib/notifications.ts
- client/src/lib/websocket.ts
- client/src/hooks/useMessengerSync.ts
- client/src/app/chat/[id]/page.tsx

Checks: server ✅ | client ✅

---

## 2026-02-15 — fix+refactor: bugs, dead code, shared hooks

Status: pushed
Commit: `9538bcc`

Summary:
- prekey exhaustion protection: bundleRateLimit (10 req/min), self-request block
- cached getUsersByIds prepared statements by arity
- smart auto-scroll (only within 120px of bottom)
- extracted useContactActions and usePanic shared hooks

Changed files:
- server/src/routes/auth.ts
- server/src/db/database.ts
- client/src/app/chat/[id]/page.tsx
- client/src/hooks/useContactActions.ts (new)
- client/src/hooks/usePanic.ts (new)

Checks: server ✅ | client ✅

---

## 2026-02-14 — feat: initial project setup

Status: pushed
Commit: `2831d86`

Summary:
- full client + server codebase
- GitLab CI: server (type-check, lint, format-check, tests, build) + client (lint, build)
- Docker: server/Dockerfile, server/fly.toml

Checks: server ✅ | client ✅
