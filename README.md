<p align="center">
  <br>
  <strong>Your messages. Your keys. Your rules.</strong>
  <br>
  <sub>End-to-end encrypted anonymous messenger. The server is a blind relay — zero plaintext, zero metadata, zero trust.</sub>
  <br><br>
  <a href="LICENSE"><img src="https://img.shields.io/badge/AGPL--3.0-000?style=for-the-badge" alt="License"></a>&nbsp;
  <a href="docs/PROTOCOL.md"><img src="https://img.shields.io/badge/PROTOCOL-000?style=for-the-badge" alt="Protocol"></a>&nbsp;
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/CONTRIBUTE-000?style=for-the-badge" alt="Contribute"></a>&nbsp;
  <a href="SECURITY.md"><img src="https://img.shields.io/badge/SECURITY-000?style=for-the-badge" alt="Security"></a>
</p>

<br>

```
X3DH key agreement  ·  Double Ratchet  ·  Forward secrecy  ·  E2E file transfer
```

<br>

> **The server never sees your messages.**
> It stores encrypted blobs and forwards them. No plaintext. No decryption keys. No logs.

<br>

<details>
<summary><strong>Features</strong></summary>
<br>

**Privacy** — E2E encryption, forward secrecy, hidden chats with PIN, panic wipe, self-destructing messages, seed phrase recovery

**Communication** — 1-to-1 & group chats, file attachments, typing indicators, read receipts, push notifications, dark/light theme

**Security** — Ed25519 signing, replay protection, PBKDF2 (600K iterations), safety numbers, prekey rotation, rate limiting

</details>

<details>
<summary><strong>Stack</strong></summary>
<br>

| | |
|:--|:--|
| **Client** | Next.js 16 · React 19 · Tailwind · Zustand · TweetNaCl |
| **Server** | Express · WebSocket · SQLite |
| **Infra** | Vercel · Render · GitHub Actions · Docker |

</details>

<details>
<summary><strong>Quick start</strong></summary>
<br>

```bash
git clone https://github.com/umaiw/LUME.git && cd LUME

# server
cd server && cp .env.example .env && npm i && npm run dev

# client (new terminal)
cd client && cp .env.local.example .env.local && npm i && npm run dev
```

**Docker:**

```bash
WS_JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
```

</details>

<br>

<p align="center">
  <sub>Built with cryptography, not trust.</sub>
</p>
