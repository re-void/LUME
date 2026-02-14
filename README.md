# LUME

Secure end-to-end encrypted messaging platform with WebSocket real-time communication.

## 🏗️ Architecture

- **Client**: Next.js 16 + React 19 + TypeScript + TailwindCSS
- **Server**: Express + WebSocket + SQLite + JWT Authentication
- **Security**: E2E encryption with TweetNaCl, QR code device pairing

## 📁 Project Structure

```
LUME/
├── client/          # Next.js frontend application
│   ├── src/         # Source code
│   ├── public/      # Static assets
│   └── scripts/     # Build scripts
├── server/          # Express + WebSocket backend
│   ├── src/         # Source code
│   ├── test/        # Vitest tests
│   └── data/        # SQLite database (gitignored)
└── DESIGN/          # Logo and branding assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

#### Server Setup
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

#### Client Setup
```bash
cd client
npm install
cp .env.local.example .env.local
# Edit .env.local with your configuration
npm run dev
```

## 🧪 Testing

### Server Tests
```bash
cd server
npm run test          # Run tests once
npm run test:watch    # Watch mode
```

### Linting
```bash
# Server
cd server
npm run lint
npm run format:check

# Client
cd client
npm run lint
```

## 🏭 Production Build

### Server
```bash
cd server
npm run build
npm start
```

### Client
```bash
cd client
npm run build
npm start
```

## 🐳 Docker Deployment

### Build & Run Server
```bash
cd server
docker build -t lume-server .
docker run -p 3001:3001 -v lume_data:/app/data lume-server
```

## ☁️ Fly.io Deployment

### Prerequisites
- Install Fly CLI: `https://fly.io/docs/hands-on/install-flyctl/`
- Login: `fly auth login`

### Deploy Server
```bash
cd server
fly launch  # First time only
fly deploy  # Subsequent deploys
```

### Environment Variables
Set secrets in Fly.io:
```bash
fly secrets set JWT_SECRET=your-secret-here
fly secrets set ALLOWED_ORIGINS=https://your-client-domain.com
```

## 🔐 Environment Variables

### Server (.env)
```env
PORT=3001
JWT_SECRET=your-jwt-secret-key
ALLOWED_ORIGINS=http://localhost:3000,https://your-production-domain.com
NODE_ENV=development
DB_PATH=./data/lume.db
```

### Client (.env.local)
```env
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📝 Scripts

### Server
- `npm run dev` - Development server with hot reload
- `npm run build` - TypeScript compilation
- `npm run start` - Production server
- `npm run lint` - ESLint check
- `npm run lint:fix` - Auto-fix linting issues
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests

### Client
- `npm run dev` - Next.js dev server
- `npm run build` - Production build
- `npm run start` - Production server
- `npm run lint` - ESLint check

## 🛡️ Security Features

- End-to-end encryption with TweetNaCl
- JWT-based authentication
- Rate limiting
- Helmet security headers
- CORS protection
- QR code device pairing

## 📄 License

Private project - All rights reserved

## 🤝 Contributing

This is a private project. Contact the maintainer for access.
