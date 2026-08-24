# Admin Login Quick Start

## 🚀 5-Minute Setup

### Step 1: Set Admin Secret (Required)
Add to your `.env`:
```bash
ADMIN_SECRET_KEY=your-super-secret-key-min-32-chars-make-it-strong
```

### Step 2: Create First Admin
Run the admin setup script:
```bash
node scripts/createAdmin.js
```

Follow the prompts:
- Enter admin username
- Enter admin email  
- Enter admin password (2x for confirmation)

**Output:**
```
✅ Admin account created successfully!

📋 Admin Details:
  Username: admin1
  Email: admin@example.com
  Role: admin
  ID: 507f1f77bcf86cd799439011

You can now login with:
  POST /auth/admin/login
```

### Step 3: Login to Admin Panel
```bash
curl -X POST http://localhost:3000/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin1",
    "password": "your_password_here"
  }'
```

**Response:**
```json
{
  "status": "success",
  "message": "Admin login successful",
  "data": {
    "user": {
      "username": "admin1",
      "email": "admin@example.com",
      "role": "admin",
      "permissions": ["all"]
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "accessTokenExpiresIn": 900
    }
  }
}
```

### Step 4: Use Admin APIs
Save the `accessToken` and use it for admin endpoints:

```bash
# Get all users
curl -X GET http://localhost:3000/admin/users \
  -H "Authorization: Bearer eyJhbGc..."

# Get dashboard stats
curl -X GET http://localhost:3000/admin/stats/dashboard \
  -H "Authorization: Bearer eyJhbGc..."

# Ban a user
curl -X PATCH http://localhost:3000/admin/users/{userId}/ban \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"reason": "Violating community guidelines"}'
```

---

## 📚 Detailed Documentation

See [ADMIN_LOGIN_GUIDE.md](ADMIN_LOGIN_GUIDE.md) for complete authentication guide.  
See [ADMIN_API_DOCS.md](ADMIN_API_DOCS.md) for all admin endpoints.

---

## 🔑 Admin Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/admin/login` | Admin login |
| POST | `/auth/admin/register` | Create new admin (requires secret) |
| POST | `/auth/admin/verify-otp` | Verify admin registration |
| GET | `/admin/users` | List all users |
| GET | `/admin/reports` | List all reports |
| PATCH | `/admin/users/:id/ban` | Ban user |
| DELETE | `/admin/content/posts/:id` | Delete post |
| GET | `/admin/stats/dashboard` | Dashboard statistics |

---

## 🔒 Admin Account Security

✅ Admin accounts are verified by OTP  
✅ Strong passwords required  
✅ Admin secret key required for registration  
✅ Login attempts are rate-limited  
✅ Account lockout after 5 failed attempts  
✅ Access tokens expire in 15 minutes  
✅ All actions logged in moderation log  

---

## ⚠️ Important Notes

1. **Never share your `ADMIN_SECRET_KEY`**  
   - Store it securely in `.env` (never commit to repo)
   - Use environment variables in production

2. **Use strong passwords**  
   - Minimum 8 characters
   - Mix uppercase, lowercase, numbers, symbols

3. **Keep tokens secure**  
   - Don't share access tokens
   - Refresh token should be stored securely (httpOnly cookies)

4. **Logout when done**  
   - POST `/auth/logout` to invalidate refresh token

---

## 🆘 Common Issues

### "Invalid admin secret"
- Ensure `ADMIN_SECRET_KEY` in `.env` matches registration request
- Check for typos or extra spaces

### "Username already taken"  
- Username must be unique
- Try a different username

### "Account locked"
- Account locked after 5 failed login attempts
- Wait 15 minutes before trying again

### "Email not verified"
- Admin account hasn't completed OTP verification
- Use `/auth/admin/verify-otp` endpoint

---

## 📞 Support

For issues with admin authentication, check:
1. [ADMIN_LOGIN_GUIDE.md](ADMIN_LOGIN_GUIDE.md) - Full authentication guide
2. [ADMIN_API_DOCS.md](ADMIN_API_DOCS.md) - All admin API endpoints
3. Server logs for error details
4. Environment variables are correctly set
