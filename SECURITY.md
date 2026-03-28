# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in LUME, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

1. **Email**: Send details to the maintainers via the contact information in the repository
2. **GitHub Private Advisory**: Use [GitHub Security Advisories](https://github.com/umaiw/LUME/security/advisories/new) to report privately

### What to Include

- Description of the vulnerability
- Steps to reproduce or proof of concept
- Affected component (client, server, crypto, WebSocket, etc.)
- Potential impact and severity estimate
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 5 business days
- **Fix and disclosure**: Coordinated with reporter, typically within 30 days

### Scope

The following are in scope:

- Authentication bypass or signature forgery
- Cryptographic weaknesses (X3DH, Double Ratchet, key management)
- SQL injection, XSS, path traversal
- Unauthorized access to messages, files, or user data
- WebSocket authentication or authorization bypass
- Denial of service vulnerabilities
- Private key or plaintext message exposure

### Out of Scope

- Attacks requiring physical access to a user's device
- Social engineering attacks
- Vulnerabilities in third-party dependencies (report upstream, but notify us)
- Rate limiting bypass that doesn't lead to meaningful impact

## Security Architecture

LUME is an end-to-end encrypted messenger. Key security properties:

- **Server is a blind relay** — never sees plaintext messages
- **Ed25519 signature-based auth** — no passwords, no sessions
- **X3DH + Double Ratchet** — forward secrecy on every message
- **Client-side encryption** — all crypto happens in the browser
- **Private keys encrypted at rest** — IndexedDB with derived master key

For implementation details, see `CLAUDE.md`.
