# Admin Authentication Guide

## Overview
Admin accounts have special authentication endpoints separate from regular users. Admins require verification via OTP after registration and have full platform access.

---

## 🔐 Admin Registration

### Endpoint
**POST** `/auth/admin/register`

**Rate Limited:** Yes (10 requests per 15 minutes)

### Request Body
```json
{
  "username": "admin_user",
  "email": "admin@example.com",
  "password": "SecurePassword123!",
  "adminSecret": "YOUR_ADMIN_SECRET_KEY"
}
```

**Required Fields:**
- `username` - Unique admin username (3-20 chars)
- `email` - Admin email address
- `password` - Strong password
- `adminSecret` - Secret key from environment variable (must match `ADMIN_SECRET_KEY` in .env)

### Response (201 Created)
```json
{
  "status": "success",
  "message": "Admin registration successful. OTP sent.",
  "data": {
    "userId": "admin_user_id",
    "username": "admin_user",
    "email": "admin@example.com",
    "role": "admin",
    "otpSent": true,
    "otpExpiresIn": 300,
    "devOtp": "123456"  // Only in development mode
  }
}
```

### Errors
- `USERNAME_TAKEN` (409) - Username already exists
- `EMAIL_EXISTS` (409) - Email already registered
- `INVALID_SECRET` (403) - Admin secret key doesn't match
- `RATE_LIMIT_EXCEEDED` (429) - Too many registration attempts

---

## ✅ Verify Admin OTP

### Endpoint
**POST** `/auth/admin/verify-otp`

**Rate Limited:** Yes

### Request Body
```json
{
  "userId": "admin_user_id",
  "otp": "123456"
}
```

### Response (200 OK)
```json
{
  "status": "success",
  "message": "Admin verification successful",
  "data": {
    "verified": true,
    "user": {
      "id": "admin_user_id",
      "username": "admin_user",
      "email": "admin@example.com",
      "role": "admin",
      "isVerified": true,
      "createdAt": "2024-08-17T10:30:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "accessTokenExpiresIn": 900,
      "refreshTokenExpiresIn": 2592000
    }
  }
}
```

### Errors
- `OTP_EXPIRED` (400) - OTP has expired
- `OTP_INVALID` (400) - Incorrect OTP
- `OTP_MAX_ATTEMPTS` (400) - Too many verification attempts
- `NOT_FOUND` (404) - Admin account not found

---

## 🔑 Admin Login

### Endpoint
**POST** `/auth/admin/login`

**Rate Limited:** Yes (5 failed attempts = 15 min lockout)

### Request Body
```json
{
  "username": "admin_user",
  "password": "SecurePassword123!",
  "deviceId": "device_uuid_optional",
  "fcmToken": "firebase_token_optional"
}
```

### Response (200 OK)
```json
{
  "status": "success",
  "message": "Admin login successful",
  "data": {
    "user": {
      "id": "admin_user_id",
      "username": "admin_user",
      "email": "admin@example.com",
      "displayName": "admin_user",
      "role": "admin",
      "isVerified": true,
      "permissions": ["all"],
      "createdAt": "2024-08-17T10:30:00Z",
      "lastLoginAt": "2024-08-17T15:45:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "accessTokenExpiresIn": 900,
      "refreshTokenExpiresIn": 2592000
    }
  }
}
```

### Errors
- `INVALID_CREDENTIALS` (401) - Wrong username or password
- `FORBIDDEN` (403) - User account exists but doesn't have admin role
- `ACCOUNT_BANNED` (423) - Admin account has been banned
- `ACCOUNT_LOCKED` (423) - Account locked after failed attempts
- `EMAIL_NOT_VERIFIED` (403) - Admin account not yet verified

---

## 🚀 Setup Instructions

### Step 1: Set Admin Secret in Environment
Add to your `.env` file:
```bash
ADMIN_SECRET_KEY=your_super_secret_admin_key_here_min_32_chars
```

⚠️ **Important:** Use a strong, random secret key in production.

### Step 2: Register First Admin
Make a POST request to `/auth/admin/register`:

```bash
curl -X POST http://localhost:3000/auth/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin1",
    "email": "admin@example.com",
    "password": "YourSecurePassword123!",
    "adminSecret": "your_super_secret_admin_key_here_min_32_chars"
  }'
```

Response includes OTP (shown in logs in development):
```json
{
  "userId": "...",
  "otpSent": true,
  "devOtp": "123456"
}
```

### Step 3: Verify Admin OTP
Make a POST request to `/auth/admin/verify-otp`:

```bash
curl -X POST http://localhost:3000/auth/admin/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "admin_user_id_from_step_2",
    "otp": "123456"
  }'
```

Response includes auth tokens:
```json
{
  "verified": true,
  "tokens": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### Step 4: Admin Login
Use the regular login flow or admin login endpoint:

```bash
curl -X POST http://localhost:3000/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin1",
    "password": "YourSecurePassword123!"
  }'
```

---

## 🔄 Token Management

### Access Token
- **Expiration:** 15 minutes (900 seconds)
- **Usage:** Include in `Authorization: Bearer <token>` header
- **When Expired:** Use refresh token to get new access token

### Refresh Token
- **Expiration:** 30 days (2592000 seconds)
- **Usage:** Send to `/auth/refresh-token` to get new access token
- **When Expired:** Admin must log in again

### Refresh Access Token
```bash
curl -X POST http://localhost:3000/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token_here"
  }'
```

---

## 👤 Admin Profile

### Get Current Admin Profile
**GET** `/auth/me`

**Headers:**
```
Authorization: Bearer <accessToken>
```

### Response
```json
{
  "status": "success",
  "data": {
    "id": "admin_user_id",
    "username": "admin_user",
    "email": "admin@example.com",
    "displayName": "admin_user",
    "role": "admin",
    "isVerified": true,
    "createdAt": "2024-08-17T10:30:00Z",
    "lastLoginAt": "2024-08-17T15:45:00Z"
  }
}
```

---

## 🚪 Admin Logout

### Endpoint
**POST** `/auth/logout`

**Headers:**
```
Authorization: Bearer <accessToken>
```

### Request Body
```json
{
  "refreshToken": "your_refresh_token_here"
}
```

### Response
```json
{
  "status": "success",
  "message": "Logged out"
}
```

---

## 🔒 Security Features

1. **Admin Secret Key:** Registration requires `ADMIN_SECRET_KEY` from environment
2. **OTP Verification:** All new admins must verify email via OTP
3. **Rate Limiting:** Login attempts are limited (prevents brute force)
4. **Account Lockout:** After 5 failed login attempts → 15 minute lockout
5. **Token Expiration:** Access tokens expire in 15 minutes
6. **Refresh Token Rotation:** Each refresh creates new tokens
7. **Device Tracking:** Optional device ID for login tracking
8. **FCM Tokens:** Push notification support for mobile admins

---

## ⚙️ Admin Password Reset

### Forgot Password
**POST** `/auth/forgot-password`
```json
{
  "identifier": "admin_user"
}
```

### Reset Password
**POST** `/auth/reset-password`
```json
{
  "userId": "admin_user_id",
  "otp": "reset_otp",
  "newPassword": "NewSecurePassword123!"
}
```

---

## 📊 Admin Access Levels

All admin accounts have:
- ✅ Full platform access
- ✅ User management (ban/unban, roles)
- ✅ Report management
- ✅ Content moderation
- ✅ Analytics & statistics
- ✅ Moderation logs
- ✅ Live stream monitoring

See [ADMIN_API_DOCS.md](ADMIN_API_DOCS.md) for complete admin endpoints.

---

## 🐛 Troubleshooting

### OTP Not Received
- Check server logs for development OTP (shown in console)
- Verify email is correct during registration
- OTP expires in 5 minutes

### Login Failed - Admin Access Required
- User account exists but doesn't have admin role
- Contact another admin to promote account

### Account Locked
- Account locked after 5 failed login attempts
- Wait 15 minutes before trying again
- Admin can manually unlock via admin endpoints

### Invalid Admin Secret
- Ensure `ADMIN_SECRET_KEY` in `.env` matches registration request
- Secret key is case-sensitive
- Secret key must be at least 32 characters in production

---

## 📝 Example Flow

```
1. Admin registers with secret key
   POST /auth/admin/register
   
2. System sends OTP to email
   (Shown in logs in development)
   
3. Admin verifies OTP
   POST /auth/admin/verify-otp
   
4. Receive access & refresh tokens
   
5. Admin logs in on next session
   POST /auth/admin/login
   
6. Use access token for admin endpoints
   GET /admin/users
   Authorization: Bearer <accessToken>
   
7. Access token expires after 15 min
   
8. Refresh to get new access token
   POST /auth/refresh-token
   
9. Continue using API
   
10. Logout when done
    POST /auth/logout
```

