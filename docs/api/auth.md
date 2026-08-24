# Authentication API Reference

**Base URL:** `/api/v1/auth`  
**Endpoints:** 12  

---

## POST /auth/register

Register new user account.

| Property | Value |
|----------|-------|
| Auth | None |
| Rate Limit | 5/min per IP |

**Request Body:**
```json
{
  "username": "string (3-20, alphanumeric+underscore)",
  "email": "string (required if registrationMethod=email)",
  "phone": "string E.164 (required if registrationMethod=phone)",
  "password": "string (min 8, 1 upper, 1 lower, 1 number)",
  "registrationMethod": "email | phone"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "userId": "ObjectId",
    "username": "string",
    "otpSent": true,
    "otpExpiresIn": 300
  }
}
```

**Errors:** USERNAME_TAKEN (409), EMAIL_EXISTS (409), VALIDATION_ERROR (400)

---

## POST /auth/login

| Property | Value |
|----------|-------|
| Auth | None |
| Rate Limit | 10/min per IP |

**Request:** `{ "identifier": "email or phone", "password": "string", "deviceId": "string", "fcmToken": "string?" }`

**Response 200:** User object + tokens (accessToken, refreshToken, expiry times)

**Errors:** INVALID_CREDENTIALS (401), ACCOUNT_LOCKED (423), ACCOUNT_BANNED (403)

---

## POST /auth/verify-otp

**Request:** `{ "userId": "ObjectId", "otp": "6 digits", "purpose": "registration|password_reset|phone_change" }`

**Response 200:** `{ verified: true, tokens: {...} }`

**Errors:** OTP_EXPIRED (400), OTP_INVALID (400), OTP_MAX_ATTEMPTS (400)

---

## POST /auth/refresh-token

**Request:** `{ "refreshToken": "string" }`  
**Response 200:** New accessToken + accessTokenExpiresIn

---

## POST /auth/logout

**Auth:** Bearer required  
**Request:** `{ "refreshToken": "string" }`  
**Effect:** Revoke refresh token

---

## POST /auth/forgot-password

**Request:** `{ "identifier": "email or phone" }`  
**Response 200:** Always success (prevent enumeration)

---

## POST /auth/reset-password

**Request:** `{ "userId": "ObjectId", "otp": "6 digits", "newPassword": "string" }`

---

## GET /auth/check-username?username=

**Response:** `{ "available": true|false }`

---

## POST /auth/resend-otp

**Request:** `{ "userId": "ObjectId", "purpose": "string" }`  
**Rate Limit:** 3 per 5 min per user

---

## POST /auth/google

**Request:** `{ "idToken": "Google ID token", "deviceId": "string" }`

---

## POST /auth/apple

**Request:** `{ "identityToken": "Apple token", "deviceId": "string", "fullName": "object?" }`

---

## GET /auth/me

**Auth:** Bearer required  
**Response:** Full user profile object
