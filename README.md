# [LUME](https://github.com/umaiw/LUME) – End-to-End Encrypted Messenger

This is the complete source code and build instructions for the LUME messenger, an anonymous end-to-end encrypted communication platform based on the [X3DH][x3dh] key agreement protocol and the [Double Ratchet][doubleratchet] algorithm.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)

<p align="center">
  <img src="docs/logo.png" alt="LUME" width="400">
</p>

The source code is published under AGPLv3, the license is available [here][license].

## Supported platforms

The latest version is available as a Progressive Web App for any modern browser:

* Chrome / Chromium 90+
* Firefox 90+
* Safari 15+
* Edge 90+

Installable as a PWA on desktop and mobile with offline support.

## Features

* 1-to-1 encrypted messaging with forward secrecy
* Double Ratchet with out-of-order message handling
* Encrypted file attachments (up to 5 MB)
* Group chats with role-based member management
* Real-time delivery via WebSocket
* Typing indicators and read receipts
* Self-destructing messages (up to 7 days)
* Profile avatars and display names
* Contact blocking (invisible to the blocked party)
* Hidden chats with separate PIN protection
* Panic wipe — erase all local data instantly
* Mnemonic seed phrase backup and recovery
* Signed prekey rotation (7-day cycle with grace period)
* Safety number verification
* Offline message queue (30-day TTL)
* Push notifications (Web Push API)
* Dark / light / system theme

## Architecture

```
┌─────────────┐         ┌─────────────┐
│   Client A  │◄──E2E──►│   Client B  │
│  (Next.js)  │         │  (Next.js)  │
└──────┬──────┘         └──────┬──────┘
       │  Encrypted blobs only │
       └──────────┬────────────┘
                  │
          ┌───────▼───────┐
          │    Server     │
          │  (Express)    │
          │               │
          │  Blind relay  │
          │  No plaintext │
          │  No decryption│
          └───────┬───────┘
                  │
          ┌───────▼───────┐
          │    SQLite     │
          │  (WAL mode)   │
          └───────────────┘
```

The server stores and forwards encrypted payloads. It cannot read message content, decrypt files, or access private keys. All cryptographic operations happen exclusively on the client.

## Security

* All messages are end-to-end encrypted — the server never sees plaintext
* Private keys stored in IndexedDB, encrypted with PBKDF2-derived master key (600K iterations)
* Ed25519 request signing with replay protection (nonce + 60s timestamp window)
* Rate limiting on all endpoints
* Zod schema validation on every API boundary
* No `eval()`, no string-concatenated SQL, no `dangerouslySetInnerHTML`
* CSP headers in production

To report a security vulnerability, see [SECURITY.md](SECURITY.md).

## Third-party

* Next.js 16 ([MIT License](https://github.com/vercel/next.js/blob/canary/license.md))
* React 19 ([MIT License](https://github.com/facebook/react/blob/main/LICENSE))
* Tailwind CSS ([MIT License](https://github.com/tailwindlabs/tailwindcss/blob/master/LICENSE))
* Zustand ([MIT License](https://github.com/pmndrs/zustand/blob/main/LICENSE))
* TweetNaCl.js ([Unlicense](https://github.com/nickchan2/tweetnacl-js/blob/master/UNLICENSE))
* Express ([MIT License](https://github.com/expressjs/express/blob/master/LICENSE))
* ws ([MIT License](https://github.com/websockets/ws/blob/master/LICENSE))
* better-sqlite3 ([MIT License](https://github.com/WiseLibs/better-sqlite3/blob/master/LICENSE))
* Zod ([MIT License](https://github.com/colinhacks/zod/blob/main/LICENSE))
* TypeScript ([Apache License 2.0](https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt))

## Quick start

```bash
# Clone
git clone https://github.com/umaiw/LUME.git
cd LUME

# Server
cd server
cp .env.example .env
# Edit .env — set WS_JWT_SECRET to a random 32+ byte string
npm install
npm run dev

# Client (new terminal)
cd client
cp .env.local.example .env.local
npm install
npm run dev
```

Server runs on `http://localhost:3001`, client on `http://localhost:3000`.

## Docker

```bash
export WS_JWT_SECRET=$(openssl rand -hex 32)
export CLIENT_ORIGIN=http://localhost:3000

docker compose up --build
```

## Build instructions

* [Environment variables](docs/PROTOCOL.md)
* [Docker deployment](docker-compose.yml)
* [API & protocol reference](docs/PROTOCOL.md)

## Testing

```bash
# Server tests
cd server && npx vitest run

# Client tests
cd client && npx vitest run

# E2E tests
cd client && npx playwright test

# Type checking
npm run validate
```

[//]: # (LINKS)
[x3dh]: https://signal.org/docs/specifications/x3dh/
[doubleratchet]: https://signal.org/docs/specifications/doubleratchet/
[license]: LICENSE
