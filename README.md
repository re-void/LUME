![LUME](docs/logo.png)

<p align="center">
  <strong>Anonymous end-to-end encrypted messenger.</strong><br>
  X3DH key agreement &middot; Double Ratchet &middot; Zero plaintext on server
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-AGPL--3.0-black?style=flat-square&logo=gnu&logoColor=white" alt="License">
  <img src="https://img.shields.io/badge/encryption-E2E-black?style=flat-square&logo=letsencrypt&logoColor=white" alt="E2E">
  <img src="https://img.shields.io/badge/platform-PWA-black?style=flat-square&logo=pwa&logoColor=white" alt="PWA">
  <img src="https://img.shields.io/badge/protocol-X3DH-black?style=flat-square&logo=signal&logoColor=white" alt="X3DH">
  <img src="https://img.shields.io/badge/ratchet-Double-black?style=flat-square&logo=signal&logoColor=white" alt="Double Ratchet">
</p>

---

### What is LUME?

A messenger where the server is a blind relay. It stores and forwards encrypted blobs — it cannot read messages, decrypt files, or access keys. All crypto runs on the client.

---

### Features

<table>
<tr>
<td align="center"><strong>Privacy</strong></td>
<td align="center"><strong>Communication</strong></td>
<td align="center"><strong>Security</strong></td>
</tr>
<tr>
<td>

![](https://img.shields.io/badge/E2E_encrypted-messages-black?style=flat-square)
![](https://img.shields.io/badge/forward-secrecy-black?style=flat-square)
![](https://img.shields.io/badge/hidden_chats-PIN-black?style=flat-square)
![](https://img.shields.io/badge/panic-wipe-black?style=flat-square)
![](https://img.shields.io/badge/self--destruct-messages-black?style=flat-square)
![](https://img.shields.io/badge/seed_phrase-recovery-black?style=flat-square)

</td>
<td>

![](https://img.shields.io/badge/1--to--1_&_group-chats-black?style=flat-square)
![](https://img.shields.io/badge/file_attachments-5_MB-black?style=flat-square)
![](https://img.shields.io/badge/typing-indicators-black?style=flat-square)
![](https://img.shields.io/badge/read-receipts-black?style=flat-square)
![](https://img.shields.io/badge/push-notifications-black?style=flat-square)
![](https://img.shields.io/badge/dark_/_light-theme-black?style=flat-square)

</td>
<td>

![](https://img.shields.io/badge/Ed25519-signing-black?style=flat-square)
![](https://img.shields.io/badge/replay-protection-black?style=flat-square)
![](https://img.shields.io/badge/PBKDF2-600K_iter-black?style=flat-square)
![](https://img.shields.io/badge/safety_number-verification-black?style=flat-square)
![](https://img.shields.io/badge/prekey-rotation-black?style=flat-square)
![](https://img.shields.io/badge/rate-limiting-black?style=flat-square)

</td>
</tr>
</table>

---

### Stack

<p>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19-black?style=flat-square&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/Tailwind-CSS-black?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind">
  <img src="https://img.shields.io/badge/Zustand-state-black?style=flat-square" alt="Zustand">
  <img src="https://img.shields.io/badge/TweetNaCl-crypto-black?style=flat-square" alt="TweetNaCl">
</p>
<p>
  <img src="https://img.shields.io/badge/Express-server-black?style=flat-square&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/WebSocket-ws-black?style=flat-square" alt="WebSocket">
  <img src="https://img.shields.io/badge/SQLite-database-black?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/TypeScript-strict-black?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
</p>
<p>
  <img src="https://img.shields.io/badge/Vercel-client-black?style=flat-square&logo=vercel&logoColor=white" alt="Vercel">
  <img src="https://img.shields.io/badge/Render-server-black?style=flat-square&logo=render&logoColor=white" alt="Render">
  <img src="https://img.shields.io/badge/GitHub_Actions-CI-black?style=flat-square&logo=githubactions&logoColor=white" alt="CI">
  <img src="https://img.shields.io/badge/Docker-deploy-black?style=flat-square&logo=docker&logoColor=white" alt="Docker">
</p>

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

<p align="center">
  <a href="docs/PROTOCOL.md"><img src="https://img.shields.io/badge/Protocol_&_API-docs-black?style=flat-square&logo=gitbook&logoColor=white" alt="Docs"></a>
  <a href="SECURITY.md"><img src="https://img.shields.io/badge/Security-policy-black?style=flat-square&logo=hackthebox&logoColor=white" alt="Security"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-black?style=flat-square&logo=gnu&logoColor=white" alt="License"></a>
</p>
