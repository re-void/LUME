# Contributing to LUME

Thanks for your interest in contributing. This guide will help you get started.

## Getting started

1. Fork the repository
2. Clone your fork
   ```bash
   git clone https://github.com/<your-username>/LUME.git
   cd LUME
   ```
3. Create a branch from `dev`
   ```bash
   git checkout -b feat/your-feature dev
   ```
4. Install dependencies
   ```bash
   cd server && npm i && cd ../client && npm i
   ```

## Branch naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/short-description` | `feat/voice-messages` |
| Bug fix | `fix/short-description` | `fix/reconnect-loop` |
| Chore | `chore/short-description` | `chore/update-deps` |

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add voice message support
fix: resolve WebSocket reconnect loop
chore: update dependencies
docs: improve setup instructions
```

## Pull requests

- All PRs target the `dev` branch
- Keep PRs focused — one feature or fix per PR
- All CI checks must pass before merge
- Fill in the PR template

## Code style

- TypeScript strict mode — no `any`
- Zod validation on every boundary
- Immutable state updates only
- No hardcoded colors — use CSS variables

## Security rules

These are non-negotiable:

- **Never** log or store plaintext messages on the server
- **Never** use `eval()`, string SQL, or `dangerouslySetInnerHTML`
- **Always** validate input with Zod before processing
- **Always** use parameterized queries for database access

## Testing

Run before submitting a PR:

```bash
# type check
npm run validate

# server tests
cd server && npx vitest run

# client tests
cd client && npx vitest run

# e2e
cd client && npx playwright test
```

## Reporting bugs

Open an issue with:
- Steps to reproduce
- Expected vs actual behavior
- Browser / OS version

## Security vulnerabilities

See [SECURITY.md](SECURITY.md) for responsible disclosure.
