# Volume 3 — Backend API Documentation

**Document ID:** Zemin-SRS-V03  
**Version:** 1.0.0  
**Base URL:** `https://api.Zemin.app/api/v1`  
**Pages:** ~100  

---

## Table of Contents

1. [API Conventions](#1-api-conventions)
2. [Authentication APIs](#2-authentication-apis)
3. [User APIs](#3-user-apis)
4. [Post & Content APIs](#4-post--content-apis)
5. [Stories & Reels APIs](#5-stories--reels-apis)
6. [Feed & Discovery APIs](#6-feed--discovery-apis)
7. [Follow & Social APIs](#7-follow--social-apis)
8. [Chat APIs](#8-chat-apis)
9. [Live Streaming APIs](#9-live-streaming-apis)
10. [Gift APIs](#10-gift-apis)
11. [Coin & Wallet APIs](#11-coin--wallet-apis)
12. [Subscription APIs](#12-subscription-apis)
13. [Payment APIs](#13-payment-apis)
14. [Notification APIs](#14-notification-apis)
15. [Creator APIs](#15-creator-apis)
16. [Admin APIs](#16-admin-apis)
17. [Upload APIs](#17-upload-apis)
18. [Search APIs](#18-search-apis)
19. [Report APIs](#19-report-apis)
20. [Error Codes Reference](#20-error-codes-reference)

---

## 1. API Conventions

### 1.1 Request Format

```
Content-Type: application/json
Authorization: Bearer <access_token>
Accept: application/json
X-App-Version: 1.0.0
X-Platform: ios | android
```

### 1.2 Response Envelope

```json
{
  "success": true,
  "data": { },
  "message": "Operation successful",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### 1.3 Error Envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Email is required" }
    ]
  }
}
```

### 1.4 HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 422 | Unprocessable entity |
| 429 | Rate limited |
| 500 | Internal server error |

### 1.5 Pagination

Query params: `?page=1&limit=20&sort=-createdAt`

### 1.6 Rate Limits

| Endpoint Group | Limit |
|---------------|-------|
| Auth | 10 req/min |
| General API | 100 req/min |
| Upload | 20 req/min |
| Chat send | 60 req/min |
| Gift send | 100 req/min |

---

## 2. Authentication APIs

### POST /api/auth/register

Register a new user account.

**Authentication:** None  
**Rate Limit:** 5 req/min per IP  

**Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "phone": "+919876543210",
  "password": "SecurePass123",
  "registrationMethod": "email"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| username | required, 3–20 chars, alphanumeric+underscore, unique |
| email | required if method=email, valid email, unique |
| phone | required if method=phone, E.164 format, unique |
| password | required, min 8 chars, 1 upper, 1 lower, 1 number |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "userId": "64a1b2c3d4e5f6789012345",
    "username": "johndoe",
    "email": "john@example.com",
    "otpSent": true,
    "otpExpiresIn": 300
  },
  "message": "Registration successful. OTP sent."
}
```

**Errors:**
| Code | HTTP | Message |
|------|------|---------|
| USERNAME_TAKEN | 409 | Username already taken |
| EMAIL_EXISTS | 409 | Email already registered |
| PHONE_EXISTS | 409 | Phone already registered |
| VALIDATION_ERROR | 400 | Invalid input |

---

### POST /api/auth/login

Authenticate user and receive tokens.

**Authentication:** None  

**Request:**
```json
{
  "identifier": "john@example.com",
  "password": "SecurePass123",
  "deviceId": "device-uuid-123",
  "fcmToken": "fcm-token-xyz"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "64a1b2c3d4e5f6789012345",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "fan",
      "avatar": "https://cdn.Zemin.app/avatars/johndoe.jpg",
      "isVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "accessTokenExpiresIn": 900,
      "refreshTokenExpiresIn": 2592000
    }
  }
}
```

**Errors:**
| Code | HTTP | Message |
|------|------|---------|
| INVALID_CREDENTIALS | 401 | Invalid email or password |
| ACCOUNT_LOCKED | 423 | Account locked. Try again in X minutes |
| ACCOUNT_BANNED | 403 | Account has been suspended |
| OTP_NOT_VERIFIED | 403 | Please verify your account first |

---

### POST /api/auth/verify-otp

Verify OTP code sent during registration or password reset.

**Request:**
```json
{
  "userId": "64a1b2c3d4e5f6789012345",
  "otp": "123456",
  "purpose": "registration"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| otp | required, exactly 6 digits |
| purpose | required, enum: registration, password_reset, phone_change |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ..."
    }
  }
}
```

---

### POST /api/auth/refresh-token

Refresh expired access token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "accessTokenExpiresIn": 900
  }
}
```

---

### POST /api/auth/logout

Invalidate refresh token.

**Authentication:** Bearer token required  

**Request:**
```json
{
  "refreshToken": "eyJ..."
}
```

---

### POST /api/auth/forgot-password

**Request:** `{ "identifier": "john@example.com" }`  
**Response:** OTP sent confirmation (always 200 to prevent enumeration)

---

### POST /api/auth/reset-password

**Request:**
```json
{
  "userId": "64a1b2c3d4e5f6789012345",
  "otp": "123456",
  "newPassword": "NewSecurePass456"
}
```

---

### GET /api/auth/check-username

**Query:** `?username=johndoe`  
**Response:** `{ "available": true }`

---

### POST /api/auth/google

**Request:** `{ "idToken": "google-id-token", "deviceId": "..." }`

---

### POST /api/auth/apple

**Request:** `{ "identityToken": "apple-token", "deviceId": "..." }`

---

## 3. User APIs

### GET /api/user/me

Get authenticated user profile.

**Authentication:** Bearer  
**Permissions:** Any authenticated user  

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "64a1b2c3d4e5f6789012345",
    "username": "johndoe",
    "displayName": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "avatar": "https://cdn.Zemin.app/avatars/johndoe.jpg",
    "banner": null,
    "bio": "Creator and fan",
    "role": "creator",
    "isVerified": true,
    "followersCount": 1250,
    "followingCount": 340,
    "subscribersCount": 89,
    "coinBalance": 5000,
    "walletBalance": 125.50,
    "createdAt": "2026-01-15T10:30:00Z"
  }
}
```

---

### PUT /api/user/profile

**Request:**
```json
{
  "displayName": "John Doe",
  "bio": "Content creator | Live every Friday",
  "website": "https://johndoe.com",
  "socialLinks": {
    "instagram": "@johndoe",
    "twitter": "@johndoe"
  }
}
```

---

### PUT /api/user/avatar

**Content-Type:** multipart/form-data  
**Field:** `avatar` (image, max 5MB)

---

### GET /api/user/settings

### PUT /api/user/settings

**Request:**
```json
{
  "notifications": {
    "push": true,
    "email": false,
    "liveAlerts": true,
    "giftAlerts": true,
    "messageAlerts": true
  },
  "privacy": {
    "profileVisibility": "public",
    "showOnlineStatus": true,
    "allowMessagesFrom": "everyone"
  },
  "language": "en",
  "theme": "dark"
}
```

---

### DELETE /api/user/account

**Authentication:** Bearer  
**Request:** `{ "password": "confirm-password", "reason": "optional" }`  
**Effect:** Soft delete, 30-day recovery window

---

## 4. Post & Content APIs

### POST /api/post/create

Create a new post.

**Authentication:** Bearer  
**Permissions:** Creator role  

**Request:**
```json
{
  "type": "video",
  "media": [
    {
      "url": "https://cdn.Zemin.app/uploads/video123.mp4",
      "thumbnail": "https://cdn.Zemin.app/uploads/video123_thumb.jpg",
      "duration": 45,
      "width": 1080,
      "height": 1920
    }
  ],
  "caption": "New video! #fitness #workout",
  "visibility": "subscribers",
  "subscriptionTierId": "64a1b2c3d4e5f6789012346",
  "isPPV": false,
  "ppvPrice": null,
  "location": {
    "name": "Mumbai, India",
    "lat": 19.076,
    "lng": 72.877
  },
  "tags": ["fitness", "workout"]
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| type | required, enum: photo, video, text, carousel |
| media | required unless type=text, max 10 items |
| caption | optional, max 2200 chars |
| visibility | required, enum: public, subscribers, ppv, tier |
| ppvPrice | required if isPPV=true, min 100 (cents) |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "postId": "64a1b2c3d4e5f6789012347",
    "type": "video",
    "visibility": "subscribers",
    "createdAt": "2026-07-18T10:00:00Z"
  }
}
```

---

### GET /api/post/:postId

**Permissions:** Public posts: anyone. Subscriber/PPV: access check  

**Response includes:** post data, creator info, like/comment counts, userHasLiked, userHasAccess

---

### PUT /api/post/:postId

Update post caption, visibility, or price. Creator only.

---

### DELETE /api/post/:postId

Soft delete. Creator or Admin.

---

### POST /api/post/like

**Request:** `{ "postId": "64a1b2c3d4e5f6789012347" }`

---

### POST /api/post/unlike

**Request:** `{ "postId": "64a1b2c3d4e5f6789012347" }`

---

### GET /api/post/:postId/comments

**Query:** `?page=1&limit=20`

---

### POST /api/post/comment

**Request:**
```json
{
  "postId": "64a1b2c3d4e5f6789012347",
  "text": "Amazing content!",
  "parentCommentId": null
}
```

---

### POST /api/post/purchase-ppv

**Request:** `{ "postId": "64a1b2c3d4e5f6789012347" }`  
**Effect:** Deduct from wallet, grant access, credit creator (80%)

---

## 5. Stories & Reels APIs

### POST /api/story/create

**Request:**
```json
{
  "media": {
    "url": "https://cdn.Zemin.app/stories/story123.jpg",
    "type": "image"
  },
  "visibility": "public",
  "mentions": ["@user1"],
  "link": { "url": "https://...", "text": "Shop now" }
}
```

**Auto-expiry:** 24 hours from creation

---

### GET /api/stories/following

Returns grouped stories from followed creators.

---

### GET /api/stories/:creatorId

Returns active stories for a specific creator.

---

### POST /api/story/view

**Request:** `{ "storyId": "..." }`

---

### POST /api/reel/create

Similar to post/create with max 90s duration.

---

### GET /api/reels/feed

Vertical reel feed with algorithmic ranking.

---

## 6. Feed & Discovery APIs

### GET /api/feed/following

**Query:** `?page=1&limit=20`  
**Returns:** Posts from followed creators, chronological

---

### GET /api/feed/for-you

**Query:** `?page=1&limit=20`  
**Returns:** Algorithmically ranked posts

---

### GET /api/discover/trending-creators

**Query:** `?page=1&limit=20&period=week`

---

### GET /api/discover/live-now

**Query:** `?page=1&limit=20&category=music`

---

### GET /api/discover/recommended

Personalized creator recommendations.

---

### GET /api/discover/categories

Returns all active content categories.

---

## 7. Follow & Social APIs

### POST /api/follow

**Request:** `{ "creatorId": "64a1b2c3d4e5f6789012345" }`

---

### POST /api/unfollow

**Request:** `{ "creatorId": "64a1b2c3d4e5f6789012345" }`

---

### GET /api/user/:userId/followers

**Query:** `?page=1&limit=20`

---

### GET /api/user/:userId/following

---

### POST /api/user/block

**Request:** `{ "userId": "..." }`

---

## 8. Chat APIs

### GET /api/chat/conversations

**Query:** `?page=1&limit=20`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "conversationId": "64a1...",
      "participant": {
        "id": "...",
        "username": "creator1",
        "avatar": "...",
        "isOnline": true
      },
      "lastMessage": {
        "text": "Thanks for subscribing!",
        "type": "text",
        "sentAt": "2026-07-18T09:30:00Z"
      },
      "unreadCount": 2
    }
  ]
}
```

---

### POST /api/chat/start

**Request:** `{ "recipientId": "64a1..." }`  
**Creates or returns existing conversation**

---

### GET /api/chat/messages/:conversationId

**Query:** `?page=1&limit=50&before=timestamp`

---

### POST /api/chat/send

**Request:**
```json
{
  "conversationId": "64a1...",
  "type": "text",
  "text": "Hey! Love your content"
}
```

**Paid DM Logic:**
- If creator has DM price set, deduct from sender's wallet
- Creator receives 80% of DM fee

**Response (201):**
```json
{
  "success": true,
  "data": {
    "messageId": "64a1...",
    "conversationId": "64a1...",
    "type": "text",
    "text": "Hey! Love your content",
    "sentAt": "2026-07-18T10:00:00Z",
    "paidAmount": 0
  }
}
```

---

### POST /api/chat/send-media

**Content-Type:** multipart/form-data  
**Fields:** conversationId, file, isPPV (boolean), ppvPrice (optional)

---

### PUT /api/chat/read/:conversationId

Mark all messages in conversation as read.

---

## 9. Live Streaming APIs

### POST /api/live/create

Create a new live room.

**Authentication:** Bearer  
**Permissions:** Creator  

**Request:**
```json
{
  "title": "Friday Night Live!",
  "category": "music",
  "thumbnail": "https://cdn.Zemin.app/thumbs/live123.jpg",
  "visibility": "public",
  "subscriberTierId": null,
  "enableRecording": true,
  "enableGuest": true,
  "maxGuests": 4
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "roomId": "64a1b2c3d4e5f6789012348",
    "streamKey": "sk_live_abc123",
    "rtmpUrl": "rtmp://live.Zemin.app/live",
    "webrtcToken": "eyJ...",
    "livekitRoom": "room_64a1b2",
    "status": "waiting"
  }
}
```

---

### POST /api/live/start

**Request:** `{ "roomId": "64a1..." }`  
**Effect:** Changes status to "live", notifies followers

---

### POST /api/live/join

**Request:**
```json
{
  "roomId": "64a1b2c3d4e5f6789012348"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "roomId": "64a1...",
    "webrtcToken": "eyJ...",
    "livekitUrl": "wss://live.Zemin.app",
    "host": { "id": "...", "username": "creator1", "avatar": "..." },
    "viewerCount": 1250,
    "gifts": [],
    "guests": []
  }
}
```

**Access Control:**
- Public: anyone can join
- Subscriber-only: active subscription required
- Returns 403 if access denied

---

### POST /api/live/leave

**Request:** `{ "roomId": "64a1..." }`

---

### POST /api/live/end

**Permissions:** Host only  

**Request:** `{ "roomId": "64a1..." }`  

**Effect:**
- Status → "ended"
- Calculate total earnings
- Save recording (if enabled)
- Notify viewers

**Response:**
```json
{
  "success": true,
  "data": {
    "duration": 3600,
    "peakViewers": 2500,
    "totalGifts": 15000,
    "earnings": 120.00,
    "recordingUrl": "https://cdn.Zemin.app/recordings/live123.mp4"
  }
}
```

---

### GET /api/live/active

**Query:** `?page=1&limit=20&category=music`

---

### GET /api/live/:roomId

Get live room details and current state.

---

### POST /api/live/invite-guest

**Request:** `{ "roomId": "...", "userId": "..." }`  
**Permissions:** Host only

---

### POST /api/live/request-guest

**Request:** `{ "roomId": "..." }`  
**Permissions:** Viewer (fan)

---

### POST /api/live/approve-guest

**Request:** `{ "roomId": "...", "userId": "...", "action": "approve" }`

---

### POST /api/live/remove-guest

**Request:** `{ "roomId": "...", "userId": "..." }`

---

### POST /api/live/pk/challenge

**Request:**
```json
{
  "roomId": "64a1...",
  "targetCreatorId": "64a2...",
  "duration": 300
}
```

---

### POST /api/live/pk/accept

**Request:** `{ "pkBattleId": "64a3...", "roomId": "64a2..." }`

---

### POST /api/live/pk/end

**Request:** `{ "pkBattleId": "64a3..." }`  
**Effect:** Calculate winner, distribute earnings

---

### POST /api/live/moderate

**Request:**
```json
{
  "roomId": "64a1...",
  "userId": "64a4...",
  "action": "mute",
  "duration": 300
}
```

**Actions:** mute, kick, ban  
**Permissions:** Host, Moderator, Admin

---

## 10. Gift APIs

### GET /api/gift/catalog

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": ["popular", "basic", "premium", "exclusive"],
    "gifts": [
      {
        "id": "gift_rose",
        "name": "Rose",
        "coinCost": 10,
        "animationUrl": "https://cdn.Zemin.app/gifts/rose.json",
        "iconUrl": "https://cdn.Zemin.app/gifts/rose_icon.png",
        "category": "basic"
      }
    ]
  }
}
```

---

### POST /api/gift/send

**Request:**
```json
{
  "giftId": "gift_rocket",
  "recipientId": "64a1b2c3d4e5f6789012345",
  "quantity": 1,
  "context": {
    "type": "live",
    "roomId": "64a1b2c3d4e5f6789012348"
  }
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| giftId | required, valid gift ID |
| recipientId | required, valid creator |
| quantity | required, min 1, max 99 |
| context.type | required, enum: live, post, profile, chat |

**Business Logic:**
1. Verify sender has sufficient coin balance
2. Deduct coins from sender
3. Credit creator earnings (80% of coin value)
4. Emit Socket.IO event for animation
5. Update leaderboard (if live)
6. Create gift_transaction record

**Response (201):**
```json
{
  "success": true,
  "data": {
    "transactionId": "64a1...",
    "giftName": "Rocket",
    "coinCost": 1000,
    "quantity": 1,
    "totalCost": 1000,
    "remainingBalance": 4000,
    "creatorEarnings": 8.00
  }
}
```

**Errors:**
| Code | HTTP | Message |
|------|------|---------|
| INSUFFICIENT_COINS | 400 | Not enough coins |
| GIFT_NOT_FOUND | 404 | Gift not found |
| RECIPIENT_NOT_CREATOR | 400 | Can only send gifts to creators |

---

## 11. Coin & Wallet APIs

### GET /api/coin/packages

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pkg_100",
      "coins": 100,
      "bonusCoins": 0,
      "priceUSD": 0.99,
      "priceINR": 79,
      "isPopular": false
    },
    {
      "id": "pkg_1000",
      "coins": 1000,
      "bonusCoins": 150,
      "priceUSD": 9.99,
      "priceINR": 799,
      "isPopular": true
    }
  ]
}
```

---

### POST /api/coin/purchase

**Request:**
```json
{
  "packageId": "pkg_1000",
  "paymentMethod": "razorpay",
  "currency": "INR"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_abc123",
    "amount": 799,
    "currency": "INR",
    "paymentGateway": "razorpay",
    "gatewayOrderId": "order_xyz789",
    "gatewayKey": "rzp_live_xxx"
  }
}
```

---

### GET /api/wallet/balance

**Response:**
```json
{
  "success": true,
  "data": {
    "coinBalance": 5000,
    "walletBalance": 125.50,
    "currency": "USD",
    "pendingEarnings": 45.00,
    "totalEarned": 1250.00,
    "totalSpent": 350.00
  }
}
```

---

### GET /api/wallet/transactions

**Query:** `?page=1&limit=20&type=all`  
**Types:** purchase, gift_sent, gift_received, subscription, ppv, dm, withdrawal, refund

---

### POST /api/wallet/withdraw

**Permissions:** Creator  

**Request:**
```json
{
  "amount": 100.00,
  "method": "bank_transfer",
  "bankDetails": {
    "accountNumber": "1234567890",
    "ifscCode": "HDFC0001234",
    "accountName": "John Doe"
  }
}
```

**Validation:**
| Rule | Detail |
|------|--------|
| Minimum amount | $50 / ₹500 |
| Available balance | amount ≤ available earnings |
| KYC verified | Creator must be verified |
| Pending withdrawals | Max 1 pending at a time |

---

## 12. Subscription APIs

### POST /api/subscription/tier/create

**Permissions:** Creator  

**Request:**
```json
{
  "name": "Premium",
  "price": 9.99,
  "currency": "USD",
  "description": "Access to all exclusive content",
  "benefits": ["All posts", "DM access", "Early live access"],
  "badge": "premium"
}
```

---

### GET /api/subscription/tiers/:creatorId

Returns all tiers for a creator.

---

### POST /api/subscription/create

**Request:**
```json
{
  "tierId": "64a1b2c3d4e5f6789012346",
  "paymentMethod": "stripe",
  "currency": "USD"
}
```

**Effect:**
- Process payment
- Create subscription record
- Grant tier access
- Notify creator

---

### POST /api/subscription/cancel

**Request:** `{ "subscriptionId": "64a1..." }`  
**Effect:** Cancel at period end

---

### GET /api/subscription/my-subscriptions

Returns user's active subscriptions.

---

### GET /api/subscription/my-subscribers

**Permissions:** Creator  
Returns creator's subscribers list.

---

## 13. Payment APIs

### POST /api/payment/create-order

**Request:**
```json
{
  "amount": 799,
  "currency": "INR",
  "purpose": "coin_purchase",
  "metadata": {
    "packageId": "pkg_1000",
    "userId": "64a1..."
  }
}
```

---

### POST /api/payment/verify

**Request (Razorpay):**
```json
{
  "gateway": "razorpay",
  "orderId": "order_abc123",
  "paymentId": "pay_xyz789",
  "signature": "signature_hash"
}
```

**Effect:** Verify signature, credit coins/wallet, create transaction

---

### POST /api/payment/webhook/razorpay

**Authentication:** Razorpay webhook signature  
Handles: payment.captured, payment.failed, refund.created

---

### POST /api/payment/webhook/stripe

**Authentication:** Stripe webhook signature  
Handles: checkout.session.completed, invoice.paid, customer.subscription.*

---

## 14. Notification APIs

### GET /api/notifications

**Query:** `?page=1&limit=20&type=all&unreadOnly=false`

---

### PUT /api/notifications/:id/read

---

### PUT /api/notifications/read-all

---

### GET /api/notifications/unread-count

**Response:** `{ "count": 5 }`

---

## 15. Creator APIs

### POST /api/creator/apply

**Request:**
```json
{
  "displayName": "John Creator",
  "bio": "Fitness content creator",
  "categories": ["fitness", "lifestyle"],
  "idDocument": "https://cdn.Zemin.app/kyc/id123.jpg",
  "selfiePhoto": "https://cdn.Zemin.app/kyc/selfie123.jpg"
}
```

---

### GET /api/creator/:username

Public creator profile.

---

### GET /api/creator/dashboard

**Permissions:** Creator  

**Response:**
```json
{
  "success": true,
  "data": {
    "earnings": {
      "today": 25.50,
      "thisWeek": 180.00,
      "thisMonth": 650.00,
      "total": 5200.00
    },
    "subscribers": { "total": 89, "newThisMonth": 12 },
    "followers": { "total": 1250, "newThisMonth": 85 },
    "content": { "posts": 45, "stories": 120, "liveHours": 48 },
    "topGifts": [{ "name": "Rocket", "count": 25 }]
  }
}
```

---

### PUT /api/creator/dm-pricing

**Request:** `{ "dmPrice": 5.00, "currency": "USD" }`

---

## 16. Admin APIs

See **Volume 9** for complete admin API list. Key endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/dashboard | Platform KPIs |
| GET | /api/admin/users | List/search users |
| PUT | /api/admin/users/:id/ban | Ban user |
| GET | /api/admin/creators/pending | Verification queue |
| PUT | /api/admin/creators/:id/verify | Approve creator |
| GET | /api/admin/reports | Content reports |
| PUT | /api/admin/reports/:id/resolve | Resolve report |
| GET | /api/admin/withdrawals | Pending withdrawals |
| PUT | /api/admin/withdrawals/:id/approve | Approve payout |
| GET | /api/admin/live/active | Active live streams |
| POST | /api/admin/live/:roomId/end | Force-end stream |
| POST | /api/admin/notifications/send | Push to segment |
| CRUD | /api/admin/banners | Banner management |
| CRUD | /api/admin/categories | Category management |

**Authentication:** Bearer + Admin role  
**Permissions:** RBAC per admin sub-role

---

## 17. Upload APIs

### POST /api/upload/media

**Content-Type:** multipart/form-data  
**Max Size:** 500MB (video), 20MB (image)  

**Request Fields:**
| Field | Type | Required |
|-------|------|----------|
| file | File | Yes |
| type | string (image/video) | Yes |
| folder | string (posts/stories/chat/kyc) | Yes |

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://cdn.Zemin.app/uploads/abc123.mp4",
    "thumbnail": "https://cdn.Zemin.app/uploads/abc123_thumb.jpg",
    "width": 1080,
    "height": 1920,
    "duration": 45,
    "size": 15728640
  }
}
```

---

## 18. Search APIs

### GET /api/search

**Query:** `?q=fitness&type=all&page=1&limit=20`  
**Types:** all, creators, posts, hashtags, live

---

## 19. Report APIs

### POST /api/report

**Request:**
```json
{
  "targetType": "post",
  "targetId": "64a1...",
  "reason": "inappropriate_content",
  "description": "Contains explicit content not marked as adult"
}
```

**Reasons:** spam, harassment, inappropriate_content, copyright, underage, other

---

## 20. Error Codes Reference

| Code | HTTP | Description |
|------|------|-------------|
| VALIDATION_ERROR | 400 | Input validation failed |
| INVALID_CREDENTIALS | 401 | Wrong email/password |
| TOKEN_EXPIRED | 401 | Access token expired |
| TOKEN_INVALID | 401 | Invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| USERNAME_TAKEN | 409 | Username exists |
| EMAIL_EXISTS | 409 | Email registered |
| ACCOUNT_LOCKED | 423 | Too many failed attempts |
| RATE_LIMITED | 429 | Too many requests |
| INSUFFICIENT_COINS | 400 | Not enough coins |
| INSUFFICIENT_BALANCE | 400 | Not enough wallet balance |
| SUBSCRIPTION_REQUIRED | 403 | Active subscription needed |
| PPV_REQUIRED | 403 | PPV purchase needed |
| CREATOR_NOT_VERIFIED | 403 | Creator not verified |
| LIVE_ROOM_FULL | 400 | Room at capacity |
| LIVE_ROOM_ENDED | 400 | Stream has ended |
| INTERNAL_ERROR | 500 | Server error |

---

## Supplementary API Files

Detailed endpoint specs available in `/docs/api/`:

| File | Endpoints |
|------|-----------|
| [auth.md](../api/auth.md) | Authentication (12 endpoints) |
| [posts.md](../api/posts.md) | Posts & Comments (15 endpoints) |
| [live.md](../api/live.md) | Live Streaming (20 endpoints) |
| [chat.md](../api/chat.md) | Chat & Messaging (8 endpoints) |
| [payments.md](../api/payments.md) | Payments & Wallet (15 endpoints) |
| [subscriptions.md](../api/subscriptions.md) | Subscriptions (10 endpoints) |
| [admin.md](../api/admin.md) | Admin Panel (40+ endpoints) |

---

*End of Volume 3*
