# Zemin Data Model

## Database ownership

```mermaid
erDiagram
  AUTH_USER ||--o{ AUTH_OTP : verifies
  AUTH_USER ||--o{ AUTH_REFRESH_TOKEN : owns
  AUTH_USER ||--o{ POST : authors
  AUTH_USER ||--o{ COMMENT : writes
  AUTH_USER ||--o{ TRANSACTION : owns
  AUTH_USER ||--o{ NOTIFICATION : receives
  CREATOR ||--o{ POST : publishes
  CREATOR ||--o{ SUBSCRIPTION_TIER : offers
  POST ||--o{ COMMENT : contains
  POST ||--o{ REPORT : targets
  LIVE_ROOM ||--o{ REPORT : targets

  AUTH_USER { string id PK; string username; string role; boolean isVerified; boolean isBanned }
  AUTH_OTP { string id PK; string userId FK; string purpose; date expiresAt }
  AUTH_REFRESH_TOKEN { string id PK; string userId FK; string tokenHash; boolean isRevoked }
  POST { string id PK; string creatorId; string visibility; boolean isHidden }
  COMMENT { string id PK; string postId FK; string userId FK }
  CREATOR { string id PK; string userId; string status }
  SUBSCRIPTION_TIER { string id PK; string creatorId; number price }
  TRANSACTION { string id PK; string userId; number amount; string type }
  NOTIFICATION { string id PK; string userId FK; string type; boolean isRead }
  LIVE_ROOM { string id PK; string hostId; string status }
  REPORT { string id PK; string reporterId; string targetType; string status }
```

## Auth database

The auth connection stores the identity and session boundary: users, password hashes, OTP codes, and refresh tokens. `authenticate` loads the user from this database, removes `passwordHash` from the request user, and rejects deleted or banned accounts.

User roles are `fan`, `creator`, `moderator`, and `admin`. Creator access additionally supports `isCreator=true` for creator-enabled accounts.

## Main database

The default Mongoose connection stores application records: posts, comments, likes, followers, creator profiles, wallets, transactions, gifts, subscriptions, payment methods, purchases, live rooms, conversations, messages, notifications, reports, and payout records. The exact fields are defined by the models in `backend/models`.

## Consistency rules

- Store only hashes for passwords, OTP codes, and refresh tokens.
- Treat auth user IDs as the cross-database identity key.
- Do not expose password hashes or raw refresh tokens in API responses.
- Financial mutations should be treated as idempotent by their provider/order identifiers.
- Moderation changes should remain auditable through the moderation log.
