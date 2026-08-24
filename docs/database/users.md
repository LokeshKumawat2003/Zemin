# Database Schema — Users & Creators

## users

| Field | Type | Required | Index | Description |
|-------|------|----------|-------|-------------|
| _id | ObjectId | auto | PK | Primary key |
| username | String | yes | unique | 3-20 chars |
| email | String | sparse | unique | Email address |
| phone | String | sparse | unique | E.164 format |
| passwordHash | String | yes | — | bcrypt hash |
| displayName | String | no | — | Display name |
| avatar | String | no | — | CDN URL |
| banner | String | no | — | CDN URL |
| bio | String | no | — | Max 500 chars |
| role | String | yes | yes | fan, creator, moderator, admin |
| isVerified | Boolean | yes | — | Email/phone verified |
| isCreator | Boolean | yes | — | Creator flag |
| isBanned | Boolean | yes | — | Ban status |
| settings | Object | no | — | User preferences |
| fcmTokens | [String] | no | — | Push tokens |
| lastActiveAt | Date | no | yes | Last activity |
| createdAt | Date | auto | yes | Creation timestamp |
| updatedAt | Date | auto | — | Last update |

**Relationships:**
- 1:1 → creators (via userId)
- 1:1 → wallets (via userId)
- 1:N → posts (via userId)
- 1:N → followers (via followerId/followingId)

---

## creators

| Field | Type | Required | Index | Description |
|-------|------|----------|-------|-------------|
| _id | ObjectId | auto | PK | Primary key |
| userId | ObjectId | yes | unique | ref: users |
| categories | [String] | no | — | Content categories |
| verificationStatus | String | yes | yes | pending, approved, rejected |
| verificationDocs | Object | no | — | KYC documents |
| dmPrice | Number | no | — | Paid DM price (cents) |
| totalEarnings | Number | yes | — | Lifetime earnings (cents) |
| availableBalance | Number | yes | — | Withdrawable (cents) |
| pendingBalance | Number | yes | — | Processing (cents) |
| payoutMethod | Object | no | — | Encrypted payout details |
| stats | Object | yes | — | Aggregated statistics |
| isLive | Boolean | yes | — | Currently streaming |
| currentLiveRoomId | ObjectId | no | — | Active room ref |

**Indexes:**
- `{ userId: 1 }` unique
- `{ verificationStatus: 1, createdAt: -1 }`
- `{ "stats.followersCount": -1 }`

---

## wallets

| Field | Type | Required | Index | Description |
|-------|------|----------|-------|-------------|
| _id | ObjectId | auto | PK | Primary key |
| userId | ObjectId | yes | unique | ref: users |
| coinBalance | Number | yes | — | Virtual coin balance |
| fiatBalance | Number | yes | — | Real money (cents) |
| currency | String | yes | — | USD, INR |
| totalCoinsPurchased | Number | yes | — | Lifetime coins bought |
| totalCoinsSpent | Number | yes | — | Lifetime coins spent |
| totalFiatDeposited | Number | yes | — | Lifetime deposits |
| totalFiatWithdrawn | Number | yes | — | Lifetime withdrawals |

---

## transactions

| Field | Type | Required | Index | Description |
|-------|------|----------|-------|-------------|
| _id | ObjectId | auto | PK | Primary key |
| userId | ObjectId | yes | yes | ref: users |
| type | String | yes | yes | Transaction type |
| amount | Number | yes | — | Amount (cents) |
| coinAmount | Number | no | — | Coin amount if applicable |
| currency | String | yes | — | Currency code |
| status | String | yes | yes | pending, completed, failed, refunded |
| description | String | yes | — | Human-readable description |
| metadata | Object | no | — | Related entity IDs |
| paymentGateway | String | no | — | stripe, razorpay, wallet |
| gatewayTransactionId | String | no | — | External transaction ID |
| createdAt | Date | auto | yes | Timestamp |

**Indexes:**
- `{ userId: 1, createdAt: -1 }`
- `{ type: 1, status: 1 }`
- `{ gatewayTransactionId: 1 }` sparse

---

## Entity Relationship

```
users (1) ──── (1) creators
  │                  │
  │                  ├── (1:N) posts
  │                  ├── (1:N) subscription_tiers
  │                  ├── (1:N) live_rooms
  │                  └── (1:N) gift_transactions (as recipient)
  │
  ├── (1:1) wallets
  ├── (1:N) transactions
  ├── (1:N) followers (as follower or following)
  ├── (1:N) subscriptions (as subscriber)
  └── (1:N) conversations
```
