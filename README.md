# Zemin

Creator monetization platform — live streaming, subscriptions, gifts, and exclusive content.

## Project Structure

```
Zemin/
├── backend/          Node.js + Express + MongoDB API
├── Zemin-mobile/     React Native mobile app
└── docs/             Full SRS documentation (12 volumes)
```

## Quick Start — Backend

### Prerequisites

- Node.js 18+
- Docker (recommended for MongoDB + Redis)

### Setup

```bash
# Start MongoDB + Redis
docker compose up -d

cd backend
copy .env.example .env
npm install
npm run seed
npm run dev
```

API: `http://localhost:3000`  
Health: `http://localhost:3000/health`

### Demo Accounts (after seed)

| Role | Username | Password |
|------|----------|----------|
| Creator | democreator | DemoPass123 |
| Fan | demofan | DemoPass123 |

## Quick Start — Mobile

```bash
cd Zemin-mobile
npm install
npm start
# In another terminal:
npm run android   # or npm run ios
```

Set API URL in `Zemin-mobile/src/constants/api.constants.ts` (use `10.0.2.2:3000` for Android emulator).

## API Endpoints (Phase 1)

| Module | Base Path |
|--------|-----------|
| Auth | `/api/v1/auth` |
| Feed | `/api/v1/feed` |
| Posts | `/api/v1/post` |
| Creators | `/api/v1/creator` |
| Wallet | `/api/v1/wallet` |
| Coins | `/api/v1/coin` |
| Gifts | `/api/v1/gift` |
| Live | `/api/v1/live` |
| Chat | `/api/v1/chat` |
| Notifications | `/api/v1/notifications` |
| Search | `/api/v1/search` |
| User / Settings | `/api/v1/user` |
| Subscriptions | `/api/v1/subscription` |
| Upload | `/api/v1/upload` |
| Report | `/api/v1/report` |

## Documentation

See [docs/README.md](./docs/README.md) for the complete 12-volume SRS.

## Tech Stack

- **Mobile:** React Native, TypeScript, Redux Toolkit, React Navigation
- **Backend:** Node.js, Express, MongoDB, Socket.IO, JWT
- **Payments:** Razorpay + Stripe (Phase 2)
- **Live:** LiveKit WebRTC (Phase 2)
