# Testing and Troubleshooting

## Available checks

From `backend/`:

```powershell
npm test
npm run dev
```

The repository includes tests for role middleware, wallet services, and LiveKit service behavior. The API has no separate route-level test script, so use the health checks and Postman collection for HTTP smoke testing.

## Smoke test

```powershell
Invoke-RestMethod http://localhost:3000/health
Invoke-RestMethod http://localhost:3000/health/livekit
```

Expected API health includes `status: ok`, `service: Zemin-api`, and an ISO timestamp. LiveKit health returns `503` when it is not configured; that is expected for local development.

## Common failures

| Symptom | Likely cause | Check |
|---|---|---|
| Server exits before listening | MongoDB connection failed | `MONGODB_URI` and `MONGODB_AUTH_URI`, then database availability |
| `401 TOKEN_MISSING` | Missing Bearer header | Send `Authorization: Bearer <access-token>` |
| `401 TOKEN_EXPIRED` | Access token expired | Exchange the refresh token |
| `403 ACCOUNT_BANNED` | Account is suspended | Check the user status in the auth database |
| `403 FORBIDDEN` on admin route | Token user is not admin | Use an admin account and fresh token |
| `429 RATE_LIMITED` | Global or auth limiter reached | Retry after the response headers indicate the window |
| Empty push delivery | Firebase not configured or disabled | Check Firebase credentials and `NOTIFICATION_PUSH_ENABLED` |
| LiveKit `503` | Missing or invalid credentials | Set LiveKit variables and inspect `/health/livekit` |
| Upload cannot be opened | Wrong path or non-persistent directory | Check `UPLOAD_DIR` and `/uploads/<filename>` |

## Error contract

All handled failures use:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

Unexpected server errors are logged by the central error handler and returned as `INTERNAL_ERROR`. Do not expose stack traces to clients.

## Release verification

1. Run `npm test`.
2. Start the server with production environment values.
3. Check `/health` and the configured integration health endpoints.
4. Verify regular login, token refresh, one protected user request, and admin login.
5. Exercise one payment verification, media upload, notification, and live-room flow in a staging environment.
6. Confirm backups, logs, CORS, TLS, and persistent uploads before promotion.
