# Changelog

All notable changes to the LUME project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project is pre-release and uses date-based sections until a formal versioning scheme is adopted.

## [Unreleased]

## [0.1.0-dev] - 2026-03-09

### Added

- Initial project setup: Next.js 16 + React 19 + Tailwind 4 client, Express + WebSocket + SQLite server, GitLab CI pipeline (2026-02-14)
- Read receipts over WebSocket (2026-02-15)
- Desktop notifications with gating controls (2026-02-15)
- Message and contact deletion (2026-02-15)
- Settings page: theme selection, notification preferences, self-destruct, hidden chats, Change PIN, Delete Account (2026-02-15)
- Reply/quote messages with inline quote block (2026-02-16)
- Sound notifications via Web Audio API two-tone chime (2026-02-16)
- Contact blocking with server-side `blocked_users` table, client UI, and silent message drop (2026-02-16)
- Hidden chats with PIN setup, lock/unlock, and hide/unhide flows (2026-02-21)
- Blocked users sync across sessions (2026-02-21)
- Mobile swipeable panel navigation via MobileSwipeShell, full mobile responsive layout (2026-03-07)
- 11 new integration tests for account deletion and panic wipe, bringing the total to 33 (2026-03-07)

### Changed

- Extracted `useContactActions` and `usePanic` hooks for cleaner component logic (2026-02-15)
- Cached prepared SQL statements for improved server performance (2026-02-15)
- Smart auto-scroll behavior in chat view (2026-02-15)
- Migrated CI to GitLab with a project-specific pipeline; GitHub Actions archived (2026-02-24)
- Settings page refactored into 5 focused section components (2026-03-07)
- Server files formatted with Prettier (2026-02-26, 2026-03-09)
- Added `.prettierrc` for CI `format:check` consistency (2026-03-07)

### Fixed

- Prekey exhaustion protection to prevent signal protocol failures (2026-02-15)
- Infinite loop (`Maximum update depth exceeded`) on chat open caused by `markAsRead()` re-triggering (2026-02-16)
- Hidden chats PIN flow stability and settings consistency (2026-02-21)
- Sound preference initial sync on load (2026-02-21)
- `POST /auth/block` now returns 404 for unknown users instead of 500 (2026-02-21)
- Chat list settings reload on focus when hidden chats toggle changes (2026-03-07)
- Settings and hidden chat state reconciliation after backup import (2026-03-07)

### Security

- Constant-time PIN verification to prevent timing attacks (2026-02-15)
- Brute-force lockout on PIN entry persisted in IndexedDB (2026-02-15)
- CSPRNG-generated nonces for all cryptographic operations (2026-02-15)
- Prekey cap set to 1,000 per user to limit key material exposure (2026-02-15)
- Corrected account deletion order to prevent orphaned server state (2026-02-15)
- WebSocket disconnect and logout split into separate flows (2026-02-15)
- Complete security hardening — all 16 audit findings resolved (2026-03-09):
  - **Critical:** PIN removed from client-side Zustand store, replaced with in-session masterKey
  - **High:** PBKDF2 iteration count raised to 600,000; `requireSignature` middleware enforced; CSP nonce-based headers; migrated to `@noble/hashes` SHA-256 in Double Ratchet; X3DH signed prekey verification
  - **Medium:** Signed prekey rotation at 7-day interval with 48-hour grace; backup PIN strengthened to PBKDF2 600k with v2 envelope; `panicWipe` completeness (SW cache, all stores, bfcache)
  - **Low:** Server stack traces sanitized for production; `npm audit` added as CI stage
