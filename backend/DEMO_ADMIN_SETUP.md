# Demo Admin Account - Setup & Testing Guide

## ✅ Current Status

The demo admin system is **fully operational**:
- ✅ Demo admin account created in Auth DB
- ✅ Admin login endpoint working correctly
- ✅ Admin routes protected with authentication & authorization

**Demo Admin Credentials:**
```
Email: demo-zemin@gmail.com
Username: demo-admin
Password: demo123
Role: Admin (Full permissions)
```

---

## 🚀 Quick Start Setup

### 1. Create Demo Admin Account
```bash
cd backend
node scripts/seed.js
```

**Expected Output:**
```
MongoDB Main connected: Zemin
MongoDB Auth connected: Auth
Seeding database...

🔐 Seeding demo admin account...
✅ Demo admin created
   Email: demo-zemin@gmail.com
   Password: demo123

📦 Seeding main database...

✅ Seed complete!

📋 Demo Credentials:
Admin:
  Email: demo-zemin@gmail.com
  Password: demo123
Creator:
  Username: democreator / DemoPass123
Fan:
  Username: demofan / DemoPass123
```

### 2. Start Backend Server
```bash
npm start
```

**Expected Output:**
```
MongoDB Main connected: Zemin
MongoDB Auth connected: Auth
[LiveKit] Credentials verified
Socket.IO initialized
Zemin API running on http://localhost:3000
Health: http://localhost:3000/health
```

---

## 🔓 Admin Login

### Login Endpoint
```
POST /api/v1/auth/admin/login
```

### Login Request (Email)
```powershell
$body = @{
    username='demo-zemin@gmail.com'
    password='demo123'
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri 'http://localhost:3000/api/v1/auth/admin/login' `
  -Method Post `
  -Headers @{'Content-Type'='application/json'} `
  -Body $body `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

### Login Request (Username)
```powershell
$body = @{
    username='demo-admin'
    password='demo123'
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri 'http://localhost:3000/api/v1/auth/admin/login' `
  -Method Post `
  -Headers @{'Content-Type'='application/json'} `
  -Body $body `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

### Successful Login Response
```json
{
  "success": true,
  "message": "Admin login successful",
  "data": {
    "user": {
      "id": "6a828093a10cd371a3923f11",
      "username": "demo-admin",
      "displayName": "Demo Admin",
      "email": "demo-zemin@gmail.com",
      "role": "admin",
      "permissions": "all",
      "isVerified": true,
      "createdAt": "2026-08-17T03:31:31.441Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "accessTokenExpiresIn": 900,
      "refreshTokenExpiresIn": 2592000
    }
  }
}
```

---

## 📋 Using Admin APIs

### Save Access Token
```powershell
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 1. Get Dashboard Stats
```powershell
Invoke-WebRequest `
  -Uri 'http://localhost:3000/api/v1/admin/stats/dashboard' `
  -Method Get `
  -Headers @{'Authorization'="Bearer $token"} `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 3,
    "totalCreators": 1,
    "totalPosts": 0,
    "totalLiveStreams": 0,
    "totalReports": 0,
    "totalRevenue": 0,
    "activeUsers": 0
  }
}
```

### 2. Get All Users
```powershell
Invoke-WebRequest `
  -Uri 'http://localhost:3000/api/v1/admin/users?limit=10&page=1' `
  -Method Get `
  -Headers @{'Authorization'="Bearer $token"} `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

### 3. Get User Details
```powershell
$userId = "user_id_from_list"
Invoke-WebRequest `
  -Uri "http://localhost:3000/api/v1/admin/users/$userId" `
  -Method Get `
  -Headers @{'Authorization'="Bearer $token"} `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

### 4. Ban a User
```powershell
$banBody = @{
    reason='Violating community guidelines'
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "http://localhost:3000/api/v1/admin/users/$userId/ban" `
  -Method Patch `
  -Headers @{'Authorization'="Bearer $token"; 'Content-Type'='application/json'} `
  -Body $banBody `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

### 5. Get All Reports
```powershell
Invoke-WebRequest `
  -Uri 'http://localhost:3000/api/v1/admin/reports?limit=10' `
  -Method Get `
  -Headers @{'Authorization'="Bearer $token"} `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

### 6. Get Moderation Log
```powershell
Invoke-WebRequest `
  -Uri 'http://localhost:3000/api/v1/admin/logs/moderation?limit=50' `
  -Method Get `
  -Headers @{'Authorization'="Bearer $token"} `
  -UseBasicParsing | Select-Object -ExpandProperty Content

---

## 🏗️ Architecture Overview

### Dual Database Architecture

**Auth Database** (`MONGODB_AUTH_URI`)
- Stores: User, OtpCode, RefreshToken models
- Purpose: Handles authentication & token management
- Demo Admin: Stored here with role='admin'

**Main Database** (`MONGODB_URI`)
- Stores: Posts, Wallets, Creators, Reports, Comments, etc.
- Purpose: Business logic & content data
- Demo Creator/Fan: Stored here with role='user'

### Admin Authentication Flow

```
1. POST /api/v1/auth/admin/login
   ↓
2. Verify credentials in Auth DB
   ↓
3. Check user.role === 'admin'
   ↓
4. Generate JWT tokens (Access + Refresh)
   ↓
5. Return tokens to client
   ↓
6. Client includes token in Authorization header
   ↓
7. Admin endpoints verify token & admin role
```

---

## 📚 Available Admin Endpoints

All endpoints require:
- `Authorization: Bearer {accessToken}` header
- User to have `role: 'admin'`

### User Management
```
GET    /api/v1/admin/users
GET    /api/v1/admin/users/:userId
PATCH  /api/v1/admin/users/:userId/ban
PATCH  /api/v1/admin/users/:userId/unban
PATCH  /api/v1/admin/users/:userId/role
```

### Report Management
```
GET    /api/v1/admin/reports
GET    /api/v1/admin/reports/:reportId
PATCH  /api/v1/admin/reports/:reportId/resolve
PATCH  /api/v1/admin/reports/:reportId/dismiss
```

### Content Moderation
```
DELETE /api/v1/admin/content/posts/:postId
DELETE /api/v1/admin/content/comments/:commentId
DELETE /api/v1/admin/content/live/:liveId
```

### Analytics
```
GET    /api/v1/admin/stats/dashboard
GET    /api/v1/admin/stats/users
GET    /api/v1/admin/stats/reports
GET    /api/v1/admin/stats/financial
```

### Monitoring
```
GET    /api/v1/admin/logs/moderation
GET    /api/v1/admin/live
```

---

## 🧪 Complete Testing Workflow

### 1. Seed Demo Data
```powershell
node scripts/seed.js
```

### 2. Start Server
```powershell
npm start
```

### 3. Login as Admin
```powershell
$body = @{username='demo-admin';password='demo123'} | ConvertTo-Json
$response = Invoke-WebRequest `
  -Uri 'http://localhost:3000/api/v1/auth/admin/login' `
  -Method Post `
  -Headers @{'Content-Type'='application/json'} `
  -Body $body `
  -UseBasicParsing | ConvertFrom-Json
$token = $response.data.tokens.accessToken
```

### 4. Test Dashboard
```powershell
Invoke-WebRequest `
  -Uri 'http://localhost:3000/api/v1/admin/stats/dashboard' `
  -Method Get `
  -Headers @{'Authorization'="Bearer $token"} `
  -UseBasicParsing | ConvertFrom-Json | ConvertTo-Json
```

### 5. Test User Management
```powershell
Invoke-WebRequest `
  -Uri 'http://localhost:3000/api/v1/admin/users' `
  -Method Get `
  -Headers @{'Authorization'="Bearer $token"} `
  -UseBasicParsing | ConvertFrom-Json | ConvertTo-Json
```

### 6. Test Content Moderation
```powershell
# Get demo creator ID (from users endpoint above)
$creatorId = "creator_id_from_step_5"
# Ban demo creator
$banBody = @{reason='Test ban'} | ConvertTo-Json
Invoke-WebRequest `
  -Uri "http://localhost:3000/api/v1/admin/users/$creatorId/ban" `
  -Method Patch `
  -Headers @{'Authorization'="Bearer $token"; 'Content-Type'='application/json'} `
  -Body $banBody `
  -UseBasicParsing | ConvertFrom-Json | ConvertTo-Json
```

---

## 🔐 Demo Credentials

| Role | Username | Email | Password |
|------|----------|-------|----------|
| **Admin** | demo-admin | demo-zemin@gmail.com | demo123 |
| **Creator** | democreator | creator@Zemin.app | DemoPass123 |
| **Fan** | demofan | fan@Zemin.app | DemoPass123 |

---

## ⚠️ Important Reminders

### Before Production
- 🗑️ Delete demo admin account
- 🔑 Change ADMIN_SECRET_KEY to strong random value
- 🔒 Enable HTTPS
- 🛡️ Implement 2FA for admin accounts
- 📝 Set up audit logging

### Delete Demo Data
```bash
# Connect to MongoDB
mongo

# In auth database
use Zemin-Auth
db.users.deleteOne({ email: "demo-zemin@gmail.com" })

# In main database  
use Zemin
db.users.deleteMany({ username: { $in: ["democreator", "demofan"] } })
db.posts.deleteMany({ username: "democreator" })
```

---

## 🔐 Security Notes

### Account Lockout
After 5 failed login attempts, account is locked for 15 minutes:
```
⚠️ Account locked. Try again in 15 minutes
```

### Token Expiration
- **Access Token**: Expires in 15 minutes (900 seconds)
- **Refresh Token**: Expires in 30 days (2,592,000 seconds)

### Refresh Token
Get a new access token:
```powershell
$body = @{refreshToken='your_refresh_token'} | ConvertTo-Json
Invoke-WebRequest `
  -Uri 'http://localhost:3000/api/v1/auth/refresh-token' `
  -Method Post `
  -Headers @{'Content-Type'='application/json'} `
  -Body $body `
  -UseBasicParsing | ConvertFrom-Json
```

---

## 📞 Troubleshooting

### "Cannot POST /auth/admin/login"
❌ **Wrong endpoint path**
✅ Use: `/api/v1/auth/admin/login` (not `/auth/admin/login`)

### "Invalid username or password"
❌ Check credentials:
- Username: `demo-admin` or `demo-zemin@gmail.com`
- Password: `demo123`

### "Admin access required"
❌ User account doesn't have admin role
✅ Only demo-admin has role='admin'

### Access Token Expired
Get new token using refresh token:
```powershell
$body = @{refreshToken='your_refresh_token'} | ConvertTo-Json
Invoke-WebRequest -Uri 'http://localhost:3000/api/v1/auth/refresh-token' ...
```

---

## 📖 Additional Documentation

- [ADMIN_API_DOCS.md](ADMIN_API_DOCS.md) - Complete API reference
- [ADMIN_LOGIN_GUIDE.md](ADMIN_LOGIN_GUIDE.md) - Authentication details
- [DUAL_DATABASE_SETUP.md](DUAL_DATABASE_SETUP.md) - Architecture documentation
