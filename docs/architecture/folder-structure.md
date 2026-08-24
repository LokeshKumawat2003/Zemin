# Project Folder Structure Reference

## Mobile App (React Native)

```
Zemin-mobile/src/
├── api/           → HTTP client, endpoint modules (auth, post, live, chat, wallet)
├── assets/        → Images, Lottie animations, fonts, icons
├── components/    → Reusable UI (common, feed, live, chat, wallet, creator)
├── hooks/         → Custom hooks (useAuth, useSocket, useLiveStream)
├── navigation/    → React Navigation stacks and tab navigators
├── redux/         → Redux Toolkit store and slices
├── screens/       → Screen components organized by module
├── services/      → Business services (storage, media, payment, analytics)
├── socket/        → Socket.IO client and event handlers
├── theme/         → Colors, typography, spacing tokens
├── utils/         → Formatters, validators, helpers
├── constants/     → API URLs, app constants, route names
└── types/         → TypeScript type definitions
```

## Backend (Node.js)

```
backend/
├── config/        → Database, Redis, payment, LiveKit, Firebase configs
├── controllers/   → HTTP request handlers (thin, delegate to services)
├── middleware/    → Auth, RBAC, validation, rate limiting, error handling
├── models/        → Mongoose schemas (32 collections)
├── routes/        → Express route definitions
├── services/      → Business logic layer
├── sockets/       → Socket.IO event handlers (live, chat, notifications)
├── utils/         → JWT, bcrypt, pagination, response helpers, validators
├── uploads/       → Temporary file upload directory
├── jobs/          → Background jobs (Bull queue)
├── tests/         → Unit, API, integration, load tests
├── server.js      → Entry point
└── app.js         → Express app configuration
```

## Admin Panel (React)

```
admin/src/
├── api/           → Admin API client
├── components/    → Shared UI components (MUI-based)
├── pages/         → Dashboard, Users, Creators, Reports, Payments, etc.
├── hooks/         → Custom hooks
├── store/         → State management
├── utils/         → Helpers
├── theme/         → MUI theme customization
└── App.tsx        → Root component with routing
```

## Documentation

```
docs/
├── README.md                          → Master index
├── SRS/
│   ├── Volume-01-Product-Requirements.md
│   ├── Volume-02-UI-UX-Design.md
│   ├── Volume-03-Backend-API.md
│   ├── Volume-04-Database-Design.md
│   ├── Volume-05-React-Native-Architecture.md
│   ├── Volume-06-Backend-Architecture.md
│   ├── Volume-07-Live-Streaming-System.md
│   ├── Volume-08-Payment-System.md
│   ├── Volume-09-Admin-Panel.md
│   ├── Volume-10-Deployment.md
│   ├── Volume-11-Security.md
│   └── Volume-12-Testing.md
├── api/                               → Detailed API endpoint specs
├── database/                          → Collection schema details
├── diagrams/                          → Architecture diagrams (Mermaid)
└── architecture/                      → Folder structure reference
```

## Screen Count Estimate

| Module | Screens |
|--------|---------|
| Auth & Onboarding | 8 |
| Home & Feed | 15 |
| Discover & Search | 12 |
| Creator Profile | 10 |
| Content Creation | 15 |
| Stories & Reels | 8 |
| Chat & Messaging | 10 |
| Live Streaming | 20 |
| Wallet & Payments | 12 |
| Gifts | 5 |
| Subscriptions | 8 |
| Notifications | 5 |
| Settings & Profile | 15 |
| Creator Dashboard | 20 |
| Admin Panel | 60+ |
| **Total** | **~223+** |
