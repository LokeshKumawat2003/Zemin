# Backend Dual Database Setup - Implementation Summary

## Overview
Your backend now uses **two separate MongoDB databases**:
1. **Authentication Database** - For login, signup, and OTP verification
2. **Main Database** - For all other operations (posts, comments, wallets, etc.)

---

## Changes Made

### 1. **config/env.js** - Environment Configuration
✅ Added `mongodbAuthUri` for authentication database
✅ Kept `mongodbUri` for main operations database

**New Environment Variables:**
- `MONGODB_AUTH_URI` (default: `mongodb://127.0.0.1:27017/Zemin-Auth`)
- `MONGODB_URI` (default: `mongodb://127.0.0.1:27017/Zemin`)

### 2. **config/database.js** - Database Connections
✅ Added `connectAuthDB()` function for auth database
✅ Added `getAuthConnection()` to retrieve auth connection
✅ Kept `connectDB()` for main database

### 3. **server.js** - Application Startup
✅ Now initializes both database connections:
  ```javascript
  await connectDB();      // Main database
  await connectAuthDB();  // Auth database
  ```

### 4. **Auth Service** - Updated Model Imports
✅ Uses auth-specific models for authentication:
  - `User.auth.model` (instead of User.model)
  - `OtpCode.auth.model` (instead of OtpCode.model)
  - `RefreshToken.auth.model` (instead of RefreshToken.model)

### 5. **New Auth Models Created**
✅ **models/User.auth.model.js** - User schema on auth DB
✅ **models/OtpCode.auth.model.js** - OTP codes on auth DB
✅ **models/RefreshToken.auth.model.js** - Tokens on auth DB

---

## Database Usage

| Operation | Database | Models |
|-----------|----------|--------|
| **Login/Signup** | Auth DB | User, OtpCode, RefreshToken |
| **Posts, Comments, Live** | Main DB | Post, Comment, LiveRoom, etc. |
| **Wallets, Payments** | Main DB | Wallet, Transaction, Payout |
| **Users (non-auth)** | Main DB | Regular User.model (for other services) |

---

## Setup Instructions

### 1. Update `.env` file:
```bash
# Authentication Database
MONGODB_AUTH_URI=mongodb://username:password@host:port/Zemin-Auth

# Main Database
MONGODB_URI=mongodb://username:password@host:port/Zemin
```

### 2. Restart Backend Server:
```bash
npm start
```

You should see logs:
```
MongoDB Main connected: Zemin
MongoDB Auth connected: Zemin-Auth
```

---

## Benefits

✅ **Separation of Concerns** - Auth operations isolated from main data
✅ **Scalability** - Can scale auth and main databases independently
✅ **Security** - Auth credentials on separate database reduces surface area
✅ **Performance** - Auth queries don't compete with main database operations

---

## Important Notes

1. **Data Migration**: If you have existing users in your current database, you'll need to:
   - Export users from current DB
   - Import into new Auth DB
   - Keep reference in main DB (optional)

2. **Backup Strategy**: Remember to backup BOTH databases in production

3. **Other Services**: Services like `user.service.js`, `post.service.js` still use the main database
   - They can continue using regular models
   - Auth service exclusively uses auth models for authentication

4. **Future User Queries**: If you need to query users from main DB (e.g., for profiles), use the regular `User.model`

---

## Files Changed
- ✅ `config/env.js`
- ✅ `config/database.js`
- ✅ `server.js`
- ✅ `services/auth.service.js`
- ✅ **NEW:** `models/User.auth.model.js`
- ✅ **NEW:** `models/OtpCode.auth.model.js`
- ✅ **NEW:** `models/RefreshToken.auth.model.js`
