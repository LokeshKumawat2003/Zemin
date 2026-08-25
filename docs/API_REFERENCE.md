# Zemin API Reference

## 1. Conventions

### Base paths

All application endpoints use `http://localhost:3000/api/v1` unless configured otherwise. The two aliases below expose the same handlers:

- `/feed` and `/post` map to post routes.
- `/wallet` and `/coin` map to wallet routes.

### Auth markers

- `Public`: no token required.
- `Optional`: works anonymously; a valid token adds personalized behavior.
- `User`: `Authorization: Bearer <access-token>` required.
- `Creator`: authenticated user with `role=creator`, `isCreator=true`, or admin access.
- `Admin`: authenticated user with `role=admin`.
- `Rate`: auth limiter applies in addition to the global API limiter.

The API limiter allows 100 requests per minute per client. Auth endpoints use a 10-request-per-minute limiter. Errors use the shape below:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

## 2. Health and Static Media

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | API health and timestamp |
| GET | `/health/livekit` | Public | LiveKit configuration and credential health |
| GET | `/uploads/<filename>` | Public | Serves uploaded media files |

## 3. Authentication

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/auth/check-username` | Public | Check username availability |
| POST | `/auth/register` | Public, Rate | Register a regular user |
| POST | `/auth/verify-otp` | Public, Rate | Verify registration OTP |
| POST | `/auth/login` | Public, Rate | Log in a regular user |
| POST | `/auth/forgot-password` | Public, Rate | Request password reset OTP |
| POST | `/auth/reset-password` | Public, Rate | Reset password with OTP |
| POST | `/auth/refresh-token` | Public | Exchange refresh token for access token |
| POST | `/auth/logout` | User | Revoke the current session/token |
| GET | `/auth/me` | User | Return the current user |
| POST | `/auth/admin/login` | Public, Rate | Log in an admin |
| POST | `/auth/admin/register` | Public, Rate | Register an admin using the configured admin secret |
| POST | `/auth/admin/verify-otp` | Public, Rate | Verify an admin OTP |

Validated auth bodies include registration, login, OTP verification, refresh token, forgot-password, and reset-password fields. See `backend/utils/validators/auth.validator.js` for the authoritative schema.

## 4. Feed and Posts

Use either `/feed` or `/post` as the route prefix.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/feed/following` | User | Personalized following feed |
| GET | `/feed/for-you` | Optional | Discovery feed |
| POST | `/feed/create` | Creator | Create a post |
| POST | `/feed/purchase-ppv` | User | Purchase pay-per-view access |
| GET | `/feed/:postId` | Optional | Get one post |
| GET | `/feed/:postId/comments` | Optional | List post comments |
| POST | `/feed/comment` | User | Add a comment |
| POST | `/feed/like` | User | Like a post |
| POST | `/feed/unlike` | User | Remove a post like |

The equivalent `/post/...` paths are also available.

## 5. Creators

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/creator/follow` | User | Follow a creator |
| POST | `/creator/unfollow` | User | Unfollow a creator |
| POST | `/creator/apply` | User | Apply to become a creator |
| GET | `/creator/:username` | Optional | Get creator profile |
| GET | `/creator/:username/followers` | Optional | List creator followers |
| GET | `/creator/:username/following` | Optional | List accounts followed by creator |
| GET | `/creator/:username/posts` | Optional | List creator posts |

## 6. Wallet, Coins, Gifts, and Payments

The wallet handlers are also mounted under `/coin`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/wallet/balance` | User | Get wallet balance |
| GET | `/wallet/transactions` | User | List wallet transactions |
| GET | `/wallet/payment-methods` | User | List saved payment methods |
| GET | `/wallet/packages` | User | List coin packages |
| POST | `/wallet/purchase` | User | Purchase coins |
| POST | `/wallet/withdraw` | Creator | Request earnings withdrawal |
| DELETE | `/wallet/payment-methods/:id` | User | Delete a saved payment method |
| GET | `/gift/catalog` | Public | List available gifts |
| POST | `/gift/send` | User | Send a gift |
| POST | `/payment/create-order` | User | Create a payment order |
| POST | `/payment/verify` | User | Verify a payment result |

Equivalent wallet paths are available under `/coin/...`.

## 7. Live Streaming

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/live/active` | Public | List active live rooms |
| GET | `/live/vip` | Public | List VIP rooms |
| GET | `/live/:roomId` | Public | Get room details |
| POST | `/live/create` | User | Create a live room |
| POST | `/live/create-vip` | User | Create a VIP live room |
| POST | `/live/start` | User | Start a live room |
| POST | `/live/join` | User | Join a live room |
| POST | `/live/leave` | User | Leave a live room |
| POST | `/live/end` | User | End a live room |

When LiveKit is configured, the live service verifies credentials at startup and exposes its public URL through the health endpoint.

## 8. Chat and Notifications

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/chat/conversations` | User | List conversations |
| POST | `/chat/start` | User | Start a conversation |
| GET | `/chat/messages/:conversationId` | User | List conversation messages |
| POST | `/chat/send` | User | Send a message |
| GET | `/notifications/` | User | List current-user notifications |
| GET | `/notifications/unread-count` | User | Count unread notifications |
| PUT | `/notifications/read-all` | User | Mark all notifications read |
| PUT | `/notifications/:id/read` | User | Mark one notification read |
| POST | `/notifications/broadcast` | Admin | Broadcast a notification |

## 9. Search, User, Subscriptions, Uploads, and Reports

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/search/` | Optional | Search platform content and users |
| GET | `/user/getAccountDetail` | Admin | Get account details by admin workflow |
| PUT | `/user/profile` | User | Update own profile |
| GET | `/user/posts` | User | List own posts |
| GET | `/user/settings` | User | Get own settings |
| PUT | `/user/settings` | User | Update own settings |
| POST | `/user/push-token` | User | Register a push notification token |
| GET | `/subscription/tiers/:username` | Public | List creator subscription tiers |
| POST | `/subscription/tier/create` | Creator | Create a subscription tier |
| POST | `/subscription/create` | User | Subscribe to a creator |
| POST | `/subscription/cancel` | User | Cancel a subscription |
| GET | `/subscription/my-subscriptions` | User | List current subscriptions |
| POST | `/upload/media` | User | Upload media; use multipart form data |
| POST | `/report/` | User | Create a report |

## 10. Admin API

Every route below requires `User` plus `Admin` authorization. The correct runtime prefix is `/api/v1/admin`.

### Identity and users

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/isLoggedIn` | Check admin session |
| GET | `/admin/me` | Check admin session; same handler |
| GET | `/admin/users` | List and filter users |
| GET | `/admin/users/:userId` | Get user details |
| GET | `/admin/users/:userId/payment-methods` | List user payment methods |
| DELETE | `/admin/users/:userId/payment-methods/:paymentMethodId` | Delete a user payment method |
| PATCH | `/admin/users/:userId/ban` | Ban a user |
| PATCH | `/admin/users/:userId/unban` | Unban a user |
| PATCH | `/admin/users/:userId/role` | Change a user role |

### Creators and content

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/creators` | List creators/applications |
| GET | `/admin/creators/:creatorId` | Get creator details |
| PATCH | `/admin/creators/:creatorId/approve` | Approve creator |
| PATCH | `/admin/creators/:creatorId/reject` | Reject creator |
| PATCH | `/admin/creators/:creatorId/suspend` | Suspend creator |
| GET | `/admin/content/posts` | List posts for moderation |
| GET | `/admin/content/posts/:postId` | Get post details |
| PATCH | `/admin/content/posts/:postId/hide` | Hide a post |
| PATCH | `/admin/content/posts/:postId/restore` | Restore a post |
| DELETE | `/admin/content/posts/:postId` | Delete a post |
| GET | `/admin/content/comments` | List comments for moderation |
| GET | `/admin/content/comments/:commentId` | Get comment details |
| PATCH | `/admin/content/comments/:commentId/restore` | Restore a comment |
| DELETE | `/admin/content/comments/:commentId` | Delete a comment |
| DELETE | `/admin/content/live/:liveId` | Delete a live stream |

### Operations

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/activity` | View admin activity |
| GET | `/admin/notifications` | List admin notifications |
| GET | `/admin/notifications/unread-count` | Count unread admin notifications |
| GET | `/admin/notifications/:notificationId` | Get notification details |
| PUT | `/admin/notifications/:notificationId/read` | Mark notification read |
| PUT | `/admin/notifications/read-all` | Mark all admin notifications read |
| POST | `/admin/notifications/send` | Send notification to one user |
| POST | `/admin/notifications/broadcast` | Broadcast notification |
| GET | `/admin/chats` | List conversations |
| GET | `/admin/chats/:conversationId` | Get conversation details |
| GET | `/admin/chats/:conversationId/messages` | Get conversation messages |

### Finance, reports, and analytics

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/payments` | List payments |
| GET | `/admin/payments/:paymentId` | Get payment details |
| GET | `/admin/payouts` | List payouts |
| GET | `/admin/payouts/:payoutId` | Get payout details |
| PATCH | `/admin/payouts/:payoutId/approve` | Approve payout |
| PATCH | `/admin/payouts/:payoutId/reject` | Reject payout |
| GET | `/admin/reports` | List reports |
| GET | `/admin/reports/:reportId` | Get report details |
| PATCH | `/admin/reports/:reportId/resolve` | Resolve report |
| PATCH | `/admin/reports/:reportId/dismiss` | Dismiss report |
| GET | `/admin/stats/dashboard` | Dashboard metrics |
| GET | `/admin/stats/users` | User metrics |
| GET | `/admin/stats/reports` | Report metrics |
| GET | `/admin/stats/financial` | Financial metrics |
| GET | `/admin/logs/moderation` | Moderation audit log |

### Live moderation

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/live` | List live streams |
| GET | `/admin/live/:liveId` | Get live stream details |
| PATCH | `/admin/live/:liveId/warn` | Warn a live stream |
| DELETE | `/admin/live/:liveId/stop` | Stop a live stream |

The admin route inventory above is authoritative for this checkout. Request payloads are handled by the admin controllers; the repository also includes an [Admin Postman collection](../backend/Zemin-Admin-API.postman_collection.json) for interactive testing. Always call these routes with the full runtime prefix `/api/v1/admin`.

## 11. Socket.IO Events

Socket.IO uses the same origin as the API and requires `handshake.auth.token`.

| Direction | Event | Payload | Behavior |
|---|---|---|---|
| Client -> server | `live:join` | `{ roomId }` | Join live room and receive viewer count |
| Client -> server | `live:leave` | `{ roomId }` | Leave live room and update count |
| Client -> server | `live:chat` | `{ roomId, text }` | Broadcast trimmed chat text, max 200 chars |
| Server -> clients | `live:viewer_count` | `{ roomId, count }` | Current Socket.IO room count |
| Client -> server | `chat:join` | `{ conversationId }` | Join conversation room |
| Client -> server | `chat:leave` | `{ conversationId }` | Leave conversation room |
| Client -> server | `chat:typing` | `{ conversationId }` | Notify other room members |
| Server -> clients | `chat:typing` | `{ conversationId, userId }` | Typing indicator |
| Server -> clients | `live:chat_message` | `{ userId, text, sentAt }` | Live chat message |

## 12. Environment and Operational Commands

| Command | Purpose |
|---|---|
| `npm start` | Start production-style server |
| `npm run dev` | Start with Nodemon |
| `npm run seed` | Seed base data |
| `npm run seed:reports` | Seed demo reports |
| `npm run seed:payments` | Seed demo payments |
| `npm run seed:chats` | Seed demo chats |
| `npm run seed:notifications` | Seed demo notifications |

Important environment values include `PORT`, `MONGODB_URI`, `MONGODB_AUTH_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `UPLOAD_DIR`, `ALLOWED_ORIGINS`, `ADMIN_SECRET_KEY`, and LiveKit/payment credentials.
