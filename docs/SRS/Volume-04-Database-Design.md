# Volume 4 — Database Design

**Document ID:** Zemin-SRS-V04  
**Version:** 1.0.0  
**Database:** MongoDB 7.0  
**Pages:** ~50  

---

## Table of Contents

1. [Database Overview](#1-database-overview)
2. [Entity Relationship Diagram](#2-entity-relationship-diagram)
3. [Collection Schemas](#3-collection-schemas)
4. [Indexes](#4-indexes)
5. [Data Relationships](#5-data-relationships)
6. [Sharding Strategy](#6-sharding-strategy)
7. [Backup & Retention](#7-backup--retention)

---

## 1. Database Overview

| Property | Value |
|----------|-------|
| Engine | MongoDB 7.0 |
| Hosting | MongoDB Atlas (M30+ cluster) |
| Database Name | `Zemin_production` |
| Collections | 32 |
| Estimated Size (Year 1) | 500GB–1TB |
| Read Preference | Primary preferred, secondary for analytics |
| Write Concern | majority |
| Read Concern | majority |

### 1.1 Naming Conventions

- Collection names: lowercase, plural (`users`, `posts`)
- Field names: camelCase (`createdAt`, `userId`)
- IDs: MongoDB ObjectId
- Timestamps: ISO 8601 UTC Date
- Money: stored in smallest unit (cents/paise) as Integer
- Soft deletes: `isDeleted: true, deletedAt: Date`

---

## 2. Entity Relationship Diagram

```
┌──────────┐     ┌────────────┐     ┌──────────┐
│  users   │────<│  creators  │>────│  posts   │
└──────────┘     └────────────┘     └──────────┘
     │                 │                  │
     │                 │                  │
     ▼                 ▼                  ▼
┌──────────┐     ┌────────────┐     ┌──────────┐
│ wallets  │     │subscription│     │ comments │
└──────────┘     │   _tiers   │     └──────────┘
     │           └────────────┘           │
     │                 │                  │
     ▼                 ▼                  ▼
┌──────────────┐ ┌────────────┐     ┌──────────┐
│ transactions │ │subscriptions│     │  likes   │
└──────────────┘ └────────────┘     └──────────┘
     │
     ▼
┌──────────────┐     ┌────────────┐     ┌──────────┐
│gift_transact.│     │ live_rooms │────<│live_msgs │
└──────────────┘     └────────────┘     └──────────┘
                          │
                          ▼
                     ┌────────────┐
                     │ pk_battles │
                     └────────────┘
```

---

## 3. Collection Schemas

### 3.1 users

Primary user account collection.

```javascript
{
  _id: ObjectId,
  username: String,          // unique, indexed
  email: String,             // unique, sparse, indexed
  phone: String,             // unique, sparse, indexed, E.164
  passwordHash: String,        // bcrypt
  displayName: String,
  avatar: String,            // CDN URL
  banner: String,            // CDN URL
  bio: String,               // max 500 chars
  role: String,              // enum: fan, creator, moderator, admin
  isVerified: Boolean,       // email/phone verified
  isCreator: Boolean,
  isBanned: Boolean,
  banReason: String,
  socialLinks: {
    instagram: String,
    twitter: String,
    youtube: String,
    website: String
  },
  settings: {
    notifications: { push: Boolean, email: Boolean, liveAlerts: Boolean },
    privacy: { profileVisibility: String, allowMessagesFrom: String },
    language: String,        // ISO 639-1
    theme: String            // dark, light, system
  },
  fcmTokens: [String],
  lastLoginAt: Date,
  lastActiveAt: Date,
  loginAttempts: Number,
  lockUntil: Date,
  isDeleted: Boolean,
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** username (unique), email (unique, sparse), phone (unique, sparse), role, createdAt, lastActiveAt

---

### 3.2 creators

Extended creator profile (1:1 with users where isCreator=true).

```javascript
{
  _id: ObjectId,
  userId: ObjectId,          // ref: users, unique
  categories: [String],      // ref: categories
  verificationStatus: String, // pending, approved, rejected
  verificationDocs: {
    idDocument: String,
    selfiePhoto: String,
    reviewedAt: Date,
    reviewedBy: ObjectId     // ref: admins
  },
  dmPrice: Number,           // cents, 0 = free
  dmCurrency: String,
  totalEarnings: Number,     // cents
  availableBalance: Number,  // cents
  pendingBalance: Number,    // cents
  totalWithdrawn: Number,    // cents
  payoutMethod: {
    type: String,            // bank, upi, paypal
    details: Object          // encrypted
  },
  stats: {
    followersCount: Number,
    subscribersCount: Number,
    postsCount: Number,
    liveHours: Number,
    totalGiftsReceived: Number
  },
  isLive: Boolean,
  currentLiveRoomId: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

---

### 3.3 posts

```javascript
{
  _id: ObjectId,
  creatorId: ObjectId,       // ref: creators
  userId: ObjectId,            // ref: users
  type: String,                // photo, video, text, carousel
  media: [{
    url: String,
    thumbnail: String,
    type: String,              // image, video
    width: Number,
    height: Number,
    duration: Number,          // seconds (video)
    size: Number               // bytes
  }],
  caption: String,           // max 2200
  visibility: String,          // public, subscribers, ppv, tier
  subscriptionTierId: ObjectId,
  isPPV: Boolean,
  ppvPrice: Number,            // cents
  ppvCurrency: String,
  location: { name: String, lat: Number, lng: Number },
  tags: [String],
  hashtags: [String],
  mentions: [ObjectId],       // ref: users
  stats: {
    likesCount: Number,
    commentsCount: Number,
    sharesCount: Number,
    viewsCount: Number,
    giftsCount: Number,
    ppvPurchases: Number
  },
  isPinned: Boolean,
  isArchived: Boolean,
  isDeleted: Boolean,
  scheduledAt: Date,
  publishedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

### 3.4 stories

```javascript
{
  _id: ObjectId,
  creatorId: ObjectId,
  userId: ObjectId,
  media: { url: String, type: String, width: Number, height: Number },
  visibility: String,
  mentions: [ObjectId],
  link: { url: String, text: String },
  viewsCount: Number,
  viewers: [ObjectId],       // capped at last 100
  expiresAt: Date,           // createdAt + 24h
  createdAt: Date
}
```

**TTL Index:** `expiresAt` — auto-delete after 24 hours

---

### 3.5 reels

```javascript
{
  _id: ObjectId,
  creatorId: ObjectId,
  userId: ObjectId,
  video: { url: String, thumbnail: String, duration: Number, width: Number, height: Number },
  caption: String,
  audio: { name: String, url: String },
  tags: [String],
  stats: { likesCount: Number, commentsCount: Number, viewsCount: Number, sharesCount: Number },
  visibility: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

### 3.6 comments

```javascript
{
  _id: ObjectId,
  postId: ObjectId,          // ref: posts
  userId: ObjectId,          // ref: users
  text: String,              // max 1000
  parentCommentId: ObjectId, // ref: comments (nested)
  likesCount: Number,
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

### 3.7 likes

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  targetType: String,        // post, comment, reel
  targetId: ObjectId,
  createdAt: Date
}
```

**Compound Index:** `{ userId: 1, targetType: 1, targetId: 1 }` (unique)

---

### 3.8 followers

```javascript
{
  _id: ObjectId,
  followerId: ObjectId,      // ref: users (fan)
  followingId: ObjectId,     // ref: users (creator)
  createdAt: Date
}
```

**Compound Index:** `{ followerId: 1, followingId: 1 }` (unique)

---

### 3.9 subscription_tiers

```javascript
{
  _id: ObjectId,
  creatorId: ObjectId,
  name: String,              // Supporter, Premium, VIP
  price: Number,             // cents
  currency: String,
  description: String,
  benefits: [String],
  badge: String,
  sortOrder: Number,
  isActive: Boolean,
  stripePriceId: String,
  razorpayPlanId: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

### 3.10 subscriptions

```javascript
{
  _id: ObjectId,
  subscriberId: ObjectId,    // ref: users (fan)
  creatorId: ObjectId,       // ref: creators
  tierId: ObjectId,          // ref: subscription_tiers
  status: String,            // active, cancelled, expired, paused
  price: Number,
  currency: String,
  stripeSubscriptionId: String,
  razorpaySubscriptionId: String,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  cancelledAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

### 3.11 wallets

```javascript
{
  _id: ObjectId,
  userId: ObjectId,          // ref: users, unique
  coinBalance: Number,       // integer
  fiatBalance: Number,       // cents
  currency: String,          // USD, INR
  totalCoinsPurchased: Number,
  totalCoinsSpent: Number,
  totalFiatDeposited: Number,
  totalFiatWithdrawn: Number,
  createdAt: Date,
  updatedAt: Date
}
```

---

### 3.12 coins

Coin package definitions (admin-managed).

```javascript
{
  _id: ObjectId,
  packageId: String,         // pkg_100, pkg_1000
  coins: Number,
  bonusCoins: Number,
  priceUSD: Number,          // cents
  priceINR: Number,          // paise
  isPopular: Boolean,
  isActive: Boolean,
  sortOrder: Number,
  createdAt: Date
}
```

---

### 3.13 transactions

All financial transactions.

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  type: String,              // coin_purchase, gift_sent, gift_received,
                             // subscription, ppv, dm, tip, withdrawal, refund
  amount: Number,            // cents or coins depending on type
  currency: String,
  coinAmount: Number,        // if coin-related
  status: String,            // pending, completed, failed, refunded
  description: String,
  metadata: {
    giftId: ObjectId,
    postId: ObjectId,
    roomId: ObjectId,
    subscriptionId: ObjectId,
    recipientId: ObjectId,
    platformFee: Number,
    creatorEarnings: Number
  },
  paymentGateway: String,  // stripe, razorpay, wallet
  gatewayTransactionId: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

### 3.14 gifts

Gift catalog (admin-managed).

```javascript
{
  _id: ObjectId,
  giftId: String,            // gift_rose, gift_rocket
  name: String,
  coinCost: Number,
  category: String,          // basic, premium, exclusive
  animationUrl: String,      // Lottie JSON URL
  iconUrl: String,
  isActive: Boolean,
  sortOrder: Number,
  createdAt: Date
}
```

---

### 3.15 gift_transactions

```javascript
{
  _id: ObjectId,
  senderId: ObjectId,
  recipientId: ObjectId,
  giftId: ObjectId,
  giftName: String,
  coinCost: Number,
  quantity: Number,
  totalCost: Number,
  creatorEarnings: Number,   // cents
  platformFee: Number,
  context: {
    type: String,            // live, post, profile, chat
    roomId: ObjectId,
    postId: ObjectId
  },
  createdAt: Date
}
```

---

### 3.16 live_rooms

```javascript
{
  _id: ObjectId,
  hostId: ObjectId,          // ref: creators
  userId: ObjectId,          // ref: users
  title: String,
  category: String,
  thumbnail: String,
  status: String,            // waiting, live, ended
  visibility: String,        // public, subscribers
  subscriberTierId: ObjectId,
  streamKey: String,
  livekitRoom: String,
  recordingUrl: String,
  enableRecording: Boolean,
  enableGuest: Boolean,
  maxGuests: Number,
  guests: [{
    userId: ObjectId,
    joinedAt: Date,
    slot: Number
  }],
  stats: {
    peakViewers: Number,
    currentViewers: Number,
    totalViewers: Number,
    totalGifts: Number,
    totalGiftCoins: Number,
    duration: Number         // seconds
  },
  pkBattleId: ObjectId,
  startedAt: Date,
  endedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

### 3.17 live_messages

```javascript
{
  _id: ObjectId,
  roomId: ObjectId,
  userId: ObjectId,
  username: String,
  text: String,              // max 200
  type: String,              // chat, gift, system, join, leave
  giftId: ObjectId,
  isDeleted: Boolean,
  createdAt: Date
}
```

---

### 3.18 live_participants

```javascript
{
  _id: ObjectId,
  roomId: ObjectId,
  userId: ObjectId,
  role: String,              // viewer, guest, host
  joinedAt: Date,
  leftAt: Date,
  giftsSent: Number,
  isMuted: Boolean,
  isKicked: Boolean
}
```

---

### 3.19 pk_battles

```javascript
{
  _id: ObjectId,
  creatorA: { userId: ObjectId, roomId: ObjectId, score: Number },
  creatorB: { userId: ObjectId, roomId: ObjectId, score: Number },
  duration: Number,          // seconds
  status: String,            // pending, active, completed, cancelled
  winnerId: ObjectId,
  startedAt: Date,
  endedAt: Date,
  createdAt: Date
}
```

---

### 3.20 notifications

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  type: String,              // follow, like, comment, gift, subscription,
                              // live, pk, message, withdrawal, system
  title: String,
  body: String,
  data: {                     // deep link payload
    targetType: String,
    targetId: ObjectId,
    action: String
  },
  isRead: Boolean,
  createdAt: Date
}
```

---

### 3.21 reports

```javascript
{
  _id: ObjectId,
  reporterId: ObjectId,
  targetType: String,        // user, post, story, comment, live, message
  targetId: ObjectId,
  reason: String,
  description: String,
  status: String,            // pending, reviewing, resolved, dismissed
  resolution: String,
  resolvedBy: ObjectId,     // ref: admins
  resolvedAt: Date,
  createdAt: Date
}
```

---

### 3.22 admins

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  role: String,              // super_admin, finance_admin, content_admin, support_admin
  permissions: [String],
  isActive: Boolean,
  lastLoginAt: Date,
  createdAt: Date
}
```

---

### 3.23 withdraw_requests

```javascript
{
  _id: ObjectId,
  creatorId: ObjectId,
  userId: ObjectId,
  amount: Number,            // cents
  currency: String,
  method: String,            // bank_transfer, upi, paypal
  bankDetails: Object,       // encrypted
  status: String,            // pending, approved, processing, completed, rejected
  rejectionReason: String,
  processedBy: ObjectId,
  processedAt: Date,
  gatewayPayoutId: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

### 3.24 conversations

```javascript
{
  _id: ObjectId,
  participants: [ObjectId],  // exactly 2 users
  lastMessage: {
    text: String,
    type: String,
    senderId: ObjectId,
    sentAt: Date
  },
  unreadCounts: {            // keyed by userId
    [userId: string]: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

### 3.25 messages

```javascript
{
  _id: ObjectId,
  conversationId: ObjectId,
  senderId: ObjectId,
  type: String,              // text, image, video, audio, ppv, tip
  text: String,
  media: { url: String, thumbnail: String, type: String, size: Number },
  isPPV: Boolean,
  ppvPrice: Number,
  ppvPurchased: Boolean,
  paidAmount: Number,
  isRead: Boolean,
  readAt: Date,
  isDeleted: Boolean,
  createdAt: Date
}
```

---

### 3.26 categories

```javascript
{
  _id: ObjectId,
  name: String,
  slug: String,              // unique
  icon: String,
  sortOrder: Number,
  isActive: Boolean,
  createdAt: Date
}
```

---

### 3.27 banners

```javascript
{
  _id: ObjectId,
  title: String,
  imageUrl: String,
  linkUrl: String,
  linkType: String,          // creator, post, live, external
  targetId: ObjectId,
  position: String,            // discover, home
  sortOrder: Number,
  startsAt: Date,
  endsAt: Date,
  isActive: Boolean,
  createdAt: Date
}
```

---

### 3.28 otp_codes

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  code: String,              // hashed
  purpose: String,           // registration, password_reset, phone_change
  attempts: Number,
  expiresAt: Date,
  createdAt: Date
}
```

**TTL Index:** `expiresAt` — auto-delete after 5 minutes

---

### 3.29 refresh_tokens

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  token: String,             // hashed
  deviceId: String,
  expiresAt: Date,
  isRevoked: Boolean,
  createdAt: Date
}
```

**TTL Index:** `expiresAt`

---

### 3.30 blocked_users

```javascript
{
  _id: ObjectId,
  blockerId: ObjectId,
  blockedId: ObjectId,
  createdAt: Date
}
```

---

### 3.31 ppv_purchases

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  postId: ObjectId,
  creatorId: ObjectId,
  price: Number,
  currency: String,
  createdAt: Date
}
```

---

### 3.32 audit_logs

```javascript
{
  _id: ObjectId,
  adminId: ObjectId,
  action: String,
  targetType: String,
  targetId: ObjectId,
  details: Object,
  ipAddress: String,
  createdAt: Date
}
```

---

## 4. Indexes

### 4.1 Critical Indexes

| Collection | Index | Type |
|-----------|-------|------|
| users | `{ username: 1 }` | unique |
| users | `{ email: 1 }` | unique, sparse |
| users | `{ phone: 1 }` | unique, sparse |
| posts | `{ creatorId: 1, createdAt: -1 }` | compound |
| posts | `{ visibility: 1, publishedAt: -1 }` | compound |
| posts | `{ hashtags: 1 }` | multikey |
| followers | `{ followerId: 1, followingId: 1 }` | unique compound |
| followers | `{ followingId: 1, createdAt: -1 }` | compound |
| subscriptions | `{ subscriberId: 1, status: 1 }` | compound |
| subscriptions | `{ creatorId: 1, status: 1 }` | compound |
| live_rooms | `{ status: 1, category: 1 }` | compound |
| live_rooms | `{ hostId: 1, status: 1 }` | compound |
| transactions | `{ userId: 1, createdAt: -1 }` | compound |
| transactions | `{ type: 1, status: 1 }` | compound |
| notifications | `{ userId: 1, isRead: 1, createdAt: -1 }` | compound |
| messages | `{ conversationId: 1, createdAt: -1 }` | compound |
| gift_transactions | `{ recipientId: 1, createdAt: -1 }` | compound |
| stories | `{ expiresAt: 1 }` | TTL |
| otp_codes | `{ expiresAt: 1 }` | TTL |
| refresh_tokens | `{ expiresAt: 1 }` | TTL |

---

## 5. Data Relationships

| Parent | Child | Relationship | FK Field |
|--------|-------|-------------|----------|
| users | creators | 1:1 | creators.userId |
| users | wallets | 1:1 | wallets.userId |
| creators | posts | 1:N | posts.creatorId |
| creators | subscription_tiers | 1:N | tiers.creatorId |
| creators | live_rooms | 1:N | live_rooms.hostId |
| posts | comments | 1:N | comments.postId |
| posts | likes | 1:N | likes.targetId |
| users | followers | N:M | followers.followerId/followingId |
| users | subscriptions | N:M | via subscriptions collection |
| live_rooms | live_messages | 1:N | live_messages.roomId |
| live_rooms | live_participants | 1:N | live_participants.roomId |
| live_rooms | pk_battles | 1:1 | live_rooms.pkBattleId |
| users | conversations | N:M | conversations.participants |
| conversations | messages | 1:N | messages.conversationId |

---

## 6. Sharding Strategy

**Phase 1 (0–1M users):** Single replica set, no sharding  
**Phase 2 (1M–5M users):** Shard on `userId` for high-volume collections:

| Collection | Shard Key |
|-----------|-----------|
| messages | `{ conversationId: 1 }` |
| transactions | `{ userId: 1, createdAt: 1 }` |
| notifications | `{ userId: 1, createdAt: 1 }` |
| live_messages | `{ roomId: 1 }` |
| posts | `{ creatorId: 1, createdAt: 1 }` |

---

## 7. Backup & Retention

| Policy | Detail |
|--------|--------|
| Full backup | Daily (MongoDB Atlas automated) |
| Point-in-time recovery | 7 days |
| Backup retention | 30 days |
| Story TTL | 24 hours (auto-delete) |
| OTP TTL | 5 minutes (auto-delete) |
| Soft-deleted users | 30-day recovery, then hard delete |
| Audit logs | Retain 2 years |
| Transaction records | Retain 7 years (financial compliance) |
| Live recordings | Retain 90 days (configurable by creator) |

---

## Supplementary Schema Files

Detailed schemas in `/docs/database/`:

| File | Collection |
|------|-----------|
| [users.md](../database/users.md) | users, creators |
| [content.md](../database/content.md) | posts, stories, reels, comments |
| [live.md](../database/live.md) | live_rooms, live_messages, pk_battles |
| [payments.md](../database/payments.md) | wallets, transactions, gifts |
| [social.md](../database/social.md) | followers, subscriptions, chat |

---

*End of Volume 4*
