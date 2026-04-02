<p align="center">
  <img src="docs/logo.png" alt="LUME" width="360">
</p>

<p align="center">
  <strong>Anonymous end-to-end encrypted messenger.</strong><br>
  X3DH key agreement &middot; Double Ratchet &middot; Zero plaintext on server
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-AGPL--3.0-black?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/platform-PWA-black?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/encryption-E2E-black?style=flat-square" alt="E2E">
</p>

---

### What is LUME?

A messenger where the server is a blind relay. It stores and forwards encrypted blobs — it cannot read messages, decrypt files, or access keys. All crypto runs on the client.

---

### Features

| Privacy | Communication | Security |
|:--------|:-------------|:---------|
| E2E encrypted messages | 1-to-1 & group chats | Ed25519 request signing |
| Forward secrecy | File attachments (5 MB) | Replay protection |
| Hidden chats (PIN) | Typing indicators | PBKDF2 key encryption (600K) |
| Panic wipe | Read receipts | Safety number verification |
| Self-destruct messages | Push notifications | Signed prekey rotation |
| Seed phrase recovery | Dark / light theme | Rate limiting on all endpoints |

---

### Stack

```
Client    Next.js 16 · React 19 · Tailwind · Zustand · TweetNaCl
Server    Express · WebSocket (ws) · SQLite (better-sqlite3)
Infra     Vercel · Render · GitHub Actions CI
```

---

### Quick start

```bash
git clone https://github.com/umaiw/LUME.git && cd LUME

# server
cd server && cp .env.example .env && npm i && npm run dev

# client (new terminal)
cd client && cp .env.local.example .env.local && npm i && npm run dev
```

Or with Docker:

```bash
WS_JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
```

---

### Docs

[Protocol & API](docs/PROTOCOL.md) &middot; [Security policy](SECURITY.md) &middot; [License](LICENSE)
