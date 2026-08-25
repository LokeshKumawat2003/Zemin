# Configuration and Deployment

## Local startup

```powershell
cd backend
copy .env.example .env
npm install
npm run seed
npm run dev
```

The default server is `http://localhost:3000`. Confirm it with `GET /health`.

## Environment variables

| Variable | Purpose | Required |
|---|---|---|
| `NODE_ENV` | Runtime mode | No |
| `PORT` | HTTP port, default `3000` | No |
| `MONGODB_URI` | Main application database | Yes |
| `MONGODB_AUTH_URI` | Auth database; defaults to `Zemin-Auth` locally | Yes in production |
| `JWT_ACCESS_SECRET` | Access-token signing secret | Yes in production |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret | Yes in production |
| `JWT_ACCESS_EXPIRES` | Access-token lifetime | No |
| `JWT_REFRESH_EXPIRES` | Refresh-token lifetime | No |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | Yes in production |
| `UPLOAD_DIR` | Persistent upload directory | Yes for media |
| `ADMIN_SECRET_KEY` | Admin registration secret | Yes for admin setup |
| `LIVEKIT_PUBLIC_URL` | Client-facing LiveKit URL | Optional |
| `LIVEKIT_URL` | LiveKit service URL | Optional |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | LiveKit credentials | Optional |
| `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS` | Push credentials | Optional |
| `NOTIFICATION_PUSH_ENABLED` | Enables push delivery; default true | No |

Never use the development JWT defaults or a weak admin secret in production. Keep `.env` and service-account credentials out of source control.

## Runtime dependencies

The server connects to both MongoDB databases before listening, initializes Socket.IO on the same HTTP server, and verifies LiveKit credentials when configured. The upload directory is created automatically and served at `/uploads`.

Behind a reverse proxy, forward the original client IP because Express trusts one proxy hop for rate limiting. Persist `UPLOAD_DIR` on a volume and configure TLS at the proxy.

## Production checklist

- Use Node.js 18 or newer.
- Set strong, unique JWT and admin secrets.
- Use separate least-privilege MongoDB credentials for auth and application data.
- Set explicit CORS origins.
- Configure LiveKit, Razorpay, and Firebase only when those features are enabled.
- Back up both databases and the upload volume.
- Monitor `/health`, `/health/livekit`, process logs, 429 responses, and failed payment verification.
