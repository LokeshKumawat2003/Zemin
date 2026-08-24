# Admin API Documentation

## Overview
Complete admin management APIs for user management, content moderation, reporting, and analytics.

**Base URL:** `/admin`  
**Authentication:** Required (Admin role only)

### Demo Report Data
To populate the Reports UI with repeatable test records, run:

```bash
npm run seed:reports
```

This creates six reports covering `user`, `post`, `live`, and `message` targets with `pending`, `reviewed`, and `resolved` statuses. The command is idempotent and prints the generated target IDs.

---

## 🔐 Authentication & Authorization

All admin endpoints require:
1. Valid JWT token (must be authenticated)
2. Admin role (`role: 'admin'`)

```
Authorization: Bearer <JWT_TOKEN>
```

---

## 👥 User Management

### Get All Users
**GET** `/admin/users`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, maximum: 50)
- `search` (optional): Search by username, displayName, or email
- `role` (optional): Filter by role (fan, creator, moderator, admin)
- `isBanned` (optional): Filter by ban status (true/false)

**Response:** `data` contains the user list and `meta` contains `page`, `limit`, `total`, and `totalPages`.
```json
{
  "success": true,
  "data": [
    {
      "id": "user_id",
      "username": "john_doe",
      "email": "john@example.com",
      "displayName": "John Doe",
      "role": "creator",
      "isCreator": true,
      "isVerified": true,
      "isBanned": false,
      "banReason": null,
      "createdAt": "2024-01-15T10:30:00Z",
      "lastLoginAt": "2024-08-17T14:20:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 152,
    "totalPages": 8
  }
}
```

---

### Get User Details
**GET** `/admin/users/:userId`

**Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "user_id",
    "username": "john_doe",
    "email": "john@example.com",
    "displayName": "John Doe",
    "role": "creator",
    "isCreator": true,
    "isVerified": true,
    "isBanned": false,
    "stats": {
      "posts": 45,
      "comments": 123,
      "accountAge": 245
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "lastLoginAt": "2024-08-17T14:20:00Z"
  }
}
```

---

### Ban User
**PATCH** `/admin/users/:userId/ban`

**Request Body:**
```json
{
  "reason": "Violating community guidelines"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "User banned successfully",
  "data": {
    "banned": true,
    "user": {
      "id": "user_id",
      "username": "john_doe",
      "isBanned": true,
      "banReason": "Violating community guidelines"
    }
  }
}
```

---

### Get User Payment Methods
**GET** `/admin/users/:userId/payment-methods`

Returns the user's saved bank and UPI payment methods. Bank details such as account numbers and IFSC codes are sensitive and should only be shown to authorized administrators.

Each item includes `type`, `label`, `details`, `isDefault`, `createdAt`, and `updatedAt`. Bank details are commonly under `details.accountNumber` and `details.ifscCode`; UPI details are commonly under `details.upiId` or `details.vpa`.

### Delete User Payment Method
**DELETE** `/admin/users/:userId/payment-methods/:paymentMethodId`

Admin action to remove one saved bank or UPI payment method. The action is recorded in the moderation log.

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "paymentMethodId": "method_id",
    "paymentType": "bank"
  },
  "message": "User payment method deleted"
}
```

---

### Unban User
**PATCH** `/admin/users/:userId/unban`

**Response:**
```json
{
  "status": "success",
  "message": "User unbanned successfully",
  "data": {
    "unbanned": true,
    "user": {
      "id": "user_id",
      "username": "john_doe",
      "isBanned": false
    }
  }
}
```

---

### Update User Role
**PATCH** `/admin/users/:userId/role`

**Request Body:**
```json
{
  "role": "moderator"
}
```

**Valid Roles:** `fan`, `creator`, `moderator`, `admin`

**Response:**
```json
{
  "status": "success",
  "message": "User role updated",
  "data": {
    "updated": true,
    "user": {
      "id": "user_id",
      "username": "john_doe",
      "role": "moderator"
    }
  }
}
```

---

## 🔔 Notification Management

### Demo Notification Data
To populate the Admin Notifications UI with unread report/payment/payout alerts and one read system notification, run:

```bash
npm run seed:notifications
```

The script is idempotent and also creates one user-only notification to verify that normal user broadcasts do not appear in the admin inbox.

### Get All Notifications
**GET** `/admin/notifications?page=1&limit=10&search=Welcome&type=system&isRead=false`

Returns newest-first notifications addressed to admin accounts only, with recipient account details. Sorting uses `createdAt DESC` and `_id DESC` as a tie-breaker, so new notifications appear first. User broadcast notifications are not shown in the admin inbox. Search matches notification title, body, username, email, or display name. Filters are `type` (`follow`, `like`, `comment`, `gift`, `subscription`, `live`, `message`, `report`, `payment`, `payout`, `system`) and `isRead` (`true` or `false`).

### Get Notification Details
**GET** `/admin/notifications/:notificationId`

Returns the full notification and recipient account information.

### Get Unread Count
**GET** `/admin/notifications/unread-count`

Response:
```json
{ "success": true, "data": { "count": 3 }, "message": "Success" }
```

### Mark One Notification Read
**PUT** `/admin/notifications/:notificationId/read`

Payload: none. Use this when the admin clicks a notification. The notification is then excluded from `isRead=false` queries.

### Mark All Notifications Read
**PUT** `/admin/notifications/read-all`

Payload: none.

Response:
```json
{ "success": true, "data": { "read": true, "updated": 3 }, "message": "Success" }
```

### Send Notification To One User
**POST** `/admin/notifications/send`

Payload:
```json
{
  "userId": "user_id",
  "type": "system",
  "title": "Account notice",
  "body": "Your account was reviewed by an administrator.",
  "data": {
    "targetType": "user",
    "targetId": "user_id",
    "action": "open_profile"
  },
  "sendPush": false
}
```

For broadcasts, provide a stable `dedupeKey` such as `maintenance-2026-08-23`. Retrying the same key will skip notifications already delivered to each user and return `skipped` in the response.

Response:
```json
{
  "success": true,
  "data": { "delivered": 1, "notification": { "_id": "notification_id", "userId": "user_id", "type": "system", "title": "Account notice", "body": "Your account was reviewed by an administrator" } },
  "message": "Notification sent"
}
```

### Broadcast Notification
**POST** `/admin/notifications/broadcast`

Send to every active user with `all: true`, or provide a `userIds` array.

Payload:
```json
{
  "all": true,
  "type": "system",
  "title": "Platform maintenance",
  "body": "The platform will be unavailable tonight.",
  "sendPush": false
}
```

Response:
```json
{
  "success": true,
  "data": { "delivered": 125 },
  "message": "Notifications broadcasted"
}
```

Every send and broadcast is recorded in the admin activity log. Set `sendPush` to `true` only when Firebase push delivery is configured.

---

## 💬 Chat Management

### Demo Chat Data
To add sample conversations and messages for the Admin Chats UI, run:

```bash
npm run seed:chats
```

Run `npm run seed` first if the demo users do not exist. The script adds four messages once and prints the conversation ID for API testing.

### Get All Chats
**GET** `/admin/chats?page=1&limit=10&search=lokesh`

Returns conversations newest first. Search matches any participant's username, email, or display name.

Response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "conversation_id",
      "participants": [
        {
          "_id": "user_id",
          "username": "lokesh",
          "email": "lokesh@example.com",
          "displayName": "Lokesh",
          "avatar": "https://example.com/avatar.jpg",
          "role": "fan",
          "isBanned": false
        }
      ],
      "lastMessage": {
        "text": "Hello",
        "type": "text",
        "senderId": "user_id",
        "sentAt": "2026-08-22T10:00:00.000Z"
      },
      "unreadCounts": {},
      "updatedAt": "2026-08-22T10:00:00.000Z"
    }
  ],
  "message": "Success",
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

### Get Chat Details
**GET** `/admin/chats/:conversationId`

Returns the conversation, both participant accounts, last-message preview, unread counts, and visible message count.

Response data:
```json
{
  "conversation": { "_id": "conversation_id", "participants": [], "lastMessage": {}, "unreadCounts": {} },
  "messageCount": 33
}
```

### Get Chat Messages
**GET** `/admin/chats/:conversationId/messages?page=1&limit=10`

Returns visible messages oldest first within the selected page. Admin inspection does not mark messages as read.

Response data item:
```json
{
  "_id": "message_id",
  "conversationId": "conversation_id",
  "senderId": {
    "_id": "user_id",
    "username": "lokesh",
    "email": "lokesh@example.com",
    "displayName": "Lokesh",
    "avatar": "https://example.com/avatar.jpg",
    "role": "fan"
  },
  "type": "text",
  "text": "Hello",
  "isRead": true,
  "createdAt": "2026-08-22T10:00:00.000Z"
}
```

---

## 🎨 Creator Management

### List Creators
**GET** `/admin/creators?page=1&limit=10&search=democreator&verificationStatus=approved&isLive=false`

Searches creator username, email, or display name. Filters are `verificationStatus` (`pending`, `approved`, `rejected`) and `isLive` (`true` or `false`).

### Creator Details
**GET** `/admin/creators/:creatorId`

Returns creator profile, user account, earnings/balances, verification status, live state, post count, and report count.

### Approve Creator
**PATCH** `/admin/creators/:creatorId/approve`

Payload: none. Sets creator verification to `approved` and synchronizes the user role to `creator`.

### Reject Creator
**PATCH** `/admin/creators/:creatorId/reject`

```json
{ "reason": "Identity verification failed" }
```

### Suspend Creator
**PATCH** `/admin/creators/:creatorId/suspend`

```json
{ "reason": "Repeated community guideline violations" }
```

Suspension bans the linked user account and stores the reason.

---

## 🗂️ Content Management

### Posts
```http
GET /admin/content/posts?page=1&limit=10&search=demo&visibility=public&isDeleted=false
GET /admin/content/posts/:postId
PATCH /admin/content/posts/:postId/hide
PATCH /admin/content/posts/:postId/restore
```

Post search matches captions. Hide payload:
```json
{ "reason": "Policy violation" }
```

### Comments
```http
GET /admin/content/comments?page=1&limit=10&search=demo&isDeleted=false
GET /admin/content/comments/:commentId
PATCH /admin/content/comments/:commentId/restore
```

Comment search matches comment text. Posts and comments use soft deletion, so hidden records remain available when `isDeleted=true` is requested.

---

## 🧾 Admin Activity

### Get Admin Activity
**GET** `/admin/activity?page=1&limit=20&action=approve_payout&targetType=payout`

Returns newest-first admin actions with administrator account details, target IDs, reasons, and action metadata. Filters are `action` and `targetType`.

---

## 💳 Payment Management

### Demo Payment Data
To create sample pending, approved, and rejected payouts for the Admin Payments UI, run:

```bash
npm run seed:payments
```

Run `npm run seed` first if the `democreator` account does not exist. The fixture script is idempotent and masks the demo bank account number.

### Get All Payments
**GET** `/admin/payments`

Returns coin purchases and wallet transactions, newest first.

**Query Parameters:** `page`, `limit`, `search`, `type`, `status`

`search` matches the user's username/email, payment description, or gateway transaction ID. `type` supports transaction types such as `coin_purchase`, `subscription`, `gift_sent`, `withdrawal`, and `refund`. `status` supports `pending`, `completed`, `failed`, and `refunded`.

### Get Payment Details
**GET** `/admin/payments/:paymentId`

Returns the complete transaction, including the user account (`username`, `email`, `displayName`, `role`, `phone`) and gateway metadata.

### Get All Payouts
**GET** `/admin/payouts`

Returns creator withdrawal requests, newest first.

**Query Parameters:** `page`, `limit`, `search`, `status`, `method`

`status` supports `pending`, `approved`, `processing`, `completed`, `failed`, and `rejected`. `method` supports `bank`, `upi`, and `razorpay`.

### Get Payout Details
**GET** `/admin/payouts/:payoutId`

Returns payout amount, currency, method, bank/UPI details, provider response, creator account, review information, and current status.

### Approve Payout
**PATCH** `/admin/payouts/:payoutId/approve`

Payload: none. Changes a `pending` or `rejected` payout to `approved`, records the admin and review time, and writes an audit log. This endpoint records approval; a separate provider-disbursement worker is still required to send money.

### Reject Payout
**PATCH** `/admin/payouts/:payoutId/reject`

Payload:
```json
{
  "reason": "Bank details could not be verified"
}
```

Changes a `pending` or `approved` payout to `rejected` and stores the rejection reason, reviewer, review time, and audit log entry.

---

## 📋 Report Management

### Get All Reports
**GET** `/admin/reports`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `search` (optional): Search report description or reporter username, email, or display name
- `status` (optional): `pending`, `reviewed`, `resolved`
- `targetType` (optional): `user`, `post`, `live`, `message`
- `reason` (optional): `spam`, `harassment`, `nudity`, `sexual_content`, `inappropriate`, `violence`, `hate_speech`, `fake_account`, `self_harm`, `scam`, `copyright`, `other`

Results are sorted newest first by `createdAt`; `_id` is used as a tie-breaker. Search and all filters can be combined.

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "report_id",
      "reporterId": {
        "_id": "user_id",
        "username": "reporter_name",
        "email": "reporter@example.com",
        "displayName": "Demo Fan",
        "role": "fan",
        "isVerified": true,
        "isBanned": false
      },
      "targetType": "post",
      "targetId": "post_id",
      "reason": "nudity",
      "description": "Contains offensive content",
      "status": "pending",
      "createdAt": "2024-08-17T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 34
  }
}
```

---

### Get Report Details
**GET** `/admin/reports/:reportId`

**Response:**
```json
{
  "status": "success",
  "data": {
    "report": {
      "_id": "report_id",
      "reporterId": {...},
      "targetType": "post",
      "targetId": "post_id",
      "reason": "inappropriate",
      "description": "Contains offensive content",
      "status": "pending",
      "createdAt": "2024-08-17T10:00:00Z"
    },
    "targetDetails": {
      "_id": "post_id",
      "userId": {...},
      "caption": "Post content...",
      "createdAt": "2024-08-16T15:30:00Z"
    }
  }
}
```

---

### Resolve Report
**PATCH** `/admin/reports/:reportId/resolve`

**Request Body:**
```json
{
  "action": "ban_user",
  "reason": "User violated community guidelines multiple times"
}
```

**Valid Actions:**
- `ban_user` - Ban the reported user
- `delete_content` - Delete the reported content
- `no_action` - Close report without action

**Response:**
```json
{
  "status": "success",
  "message": "Report resolved",
  "data": {
    "resolved": true,
    "report": {...}
  }
}
```

---

### Dismiss Report
**PATCH** `/admin/reports/:reportId/dismiss`

**Request Body:**
```json
{
  "reason": "Report lacks sufficient evidence"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Report dismissed",
  "data": {
    "dismissed": true,
    "report": {...}
  }
}
```

---

## 🗑️ Content Moderation

### Delete Post
**DELETE** `/admin/content/posts/:postId`

**Request Body:**
```json
{
  "reason": "Violates community guidelines - offensive content"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Post deleted",
  "data": {
    "deleted": true,
    "post": {...}
  }
}
```

---

### Delete Comment
**DELETE** `/admin/content/comments/:commentId`

**Request Body:**
```json
{
  "reason": "Harassing behavior"
}
```

---

### Delete/Stop Live Stream
**DELETE** `/admin/content/live/:liveId`

**Request Body:**
```json
{
  "reason": "Inappropriate content during stream"
}
```

---

## 📊 Statistics & Analytics

All analytics endpoints support `from` and `to` ISO dates. When omitted, the default range is the previous 24 hours ending at the current time. Results include the applied `range` in the response. Dates must satisfy `from < to`.

### Analytics Filters

- Dashboard: `role`, `reportStatus`
- Users: `role`, `isVerified`, `isBanned`
- Reports: `status`, `targetType`, `reason`
- Financial: `type`, `status`, `paymentGateway`

Example UI request:
```http
GET /admin/stats/financial?from=2026-08-21T00:00:00.000Z&to=2026-08-22T00:00:00.000Z&type=coin_purchase&status=completed
```

### Dashboard Statistics
**GET** `/admin/stats/dashboard`

**Response:**
```json
{
  "status": "success",
  "data": {
    "users": {
      "total": 5234,
      "banned": 23,
      "active": 5211
    },
    "reports": {
      "total": 156,
      "pending": 12,
      "resolved": 144
    },
    "content": {
      "posts": 45231,
      "liveStreams": 8
    },
    "timestamp": "2024-08-17T15:45:30Z"
  }
}
```

---

### User Statistics
**GET** `/admin/stats/users`

**Response:**
```json
{
  "status": "success",
  "data": {
    "newUsersToday": 42,
    "verifiedUsers": 3421,
    "creatorUsers": 1245,
    "bannedUsers": 23,
    "roleDistribution": {
      "fan": 3800,
      "creator": 1200,
      "moderator": 12,
      "admin": 5
    }
  }
}
```

---

### Report Statistics
**GET** `/admin/stats/reports`

**Response:**
```json
{
  "status": "success",
  "data": {
    "statusDistribution": {
      "pending": 12,
      "reviewed": 45,
      "resolved": 99
    },
    "reasonDistribution": {
      "spam": 34,
      "harassment": 28,
      "inappropriate": 56,
      "scam": 12,
      "copyright": 8,
      "other": 18
    },
    "targetDistribution": {
      "user": 34,
      "post": 78,
      "live": 12,
      "message": 32
    }
  }
}
```

---

### Financial Statistics
**GET** `/admin/stats/financial`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 125450,
    "totalPayouts": 45000,
    "profit": 80450,
    "transactionCount": 128,
    "payoutCount": 14,
    "range": {
      "from": "2026-08-21T00:00:00.000Z",
      "to": "2026-08-22T00:00:00.000Z"
    },
    "timestamp": "2026-08-22T00:00:00.000Z"
  },
  "message": "Success"
}
```

`profit` is calculated as `totalRevenue - totalPayouts`. Monetary values use the same smallest-unit convention as the transaction and payout records.

---

## 📝 Moderation Log

### Get Moderation Log
**GET** `/admin/logs/moderation`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `actionType` (optional): Type of action performed
- `targetType` (optional): Type of target (user, post, etc.)

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "log_id",
      "adminId": {
        "_id": "admin_id",
        "username": "admin_user",
        "email": "admin@example.com"
      },
      "action": "ban_user",
      "targetType": "user",
      "targetId": "user_id",
      "reason": "Repeated violation",
      "details": {},
      "createdAt": "2024-08-17T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 245
  }
}
```

---

## 🔴 Live Management

Public live rooms now use `maxGuests: 1000000` by default. The value can be overridden at creation up to `1000000`; VIP rooms continue to use their separate viewer limit.

### Get All Live Streams
**GET** `/admin/live?page=1&limit=10&status=live&search=democreator`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): `waiting`, `live`, or `ended`
- `search` (optional): Search stream title, category, username, email, or display name

### Get Live Stream Details
**GET** `/admin/live/:liveId`

Returns stream details, creator account information, and report count.

### Warn Live Stream
**PATCH** `/admin/live/:liveId/warn`

```json
{ "reason": "Unsafe live stream content" }
```

Records a warning in the admin activity log.

### Stop Live Stream
**DELETE** `/admin/live/:liveId/stop`

```json
{ "reason": "Policy violation" }
```

Sets the stream status to `ended`, records `endedAt`, clears current viewers, updates creator live state, and records the admin action.

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "live_id",
      "userId": {
        "_id": "user_id",
        "username": "live_creator",
        "email": "creator@example.com",
        "displayName": "Creator Name",
        "role": "creator"
      },
      "hostId": {
        "_id": "creator_id",
        "userId": {
          "_id": "user_id",
          "username": "live_creator",
          "email": "creator@example.com",
          "displayName": "Creator Name",
          "role": "creator"
        },
        "verificationStatus": "approved",
        "isLive": true
      },
      "title": "Live Stream Title",
      "status": "live",
      "stats": {
        "currentViewers": 342,
        "peakViewers": 500,
        "totalViewers": 1200
      },
      "startedAt": "2024-08-17T12:00:00Z",
      "createdAt": "2024-08-17T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 8
  }
}
```

---

## ❌ Error Responses

All endpoints follow standard error format:

```json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "Human readable error message"
}
```

**Common Error Codes:**
- `TOKEN_MISSING` (401): Authentication required
- `FORBIDDEN` (403): Insufficient permissions (not admin)
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid request data

---

## 🔒 Security Notes

1. All admin endpoints require admin role
2. All actions are logged in the moderation log
3. Sensitive data (passwords, tokens) are never returned
4. Request validation is enforced on all endpoints
5. Rate limiting applies to all endpoints

---

## 📌 Implementation Notes

- Admin role can only be assigned by other admins
- All moderation actions are logged with timestamp and admin ID
- User ban/unban triggers account restrictions automatically
- Report resolution automatically takes configured actions
- Statistics are calculated in real-time from database

