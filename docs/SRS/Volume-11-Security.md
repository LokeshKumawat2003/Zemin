# Volume 11 — Security

**Document ID:** Zemin-SRS-V11  
**Version:** 1.0.0  
**Pages:** ~30  

---

## 1. Security Overview

Zemin handles sensitive user data, financial transactions, and adult content. Security is implemented at every layer: authentication, authorization, data protection, network security, and operational security.

---

## 2. Authentication

### 2.1 JWT Token Strategy

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access Token | 15 minutes | Memory (Redux) | API authentication |
| Refresh Token | 30 days | MMKV (encrypted) | Token renewal |

**Access Token Payload:**
```json
{
  "userId": "64a1b2c3d4e5f6789012345",
  "role": "creator",
  "iat": 1721289600,
  "exp": 1721290500
}
```

**Token Generation:**
```javascript
const accessToken = jwt.sign(
  { userId: user._id, role: user.role },
  process.env.JWT_ACCESS_SECRET,
  { expiresIn: '15m', algorithm: 'HS256' }
);

const refreshToken = jwt.sign(
  { userId: user._id, tokenId: uuid() },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '30d', algorithm: 'HS256' }
);

// Store hashed refresh token in DB
await RefreshToken.create({
  userId: user._id,
  token: hashToken(refreshToken),
  deviceId,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
});
```

### 2.2 Refresh Token Rotation

```
Client sends expired access token + valid refresh token
  → Server validates refresh token (check DB, not revoked)
  → Issue new access token + new refresh token
  → Revoke old refresh token
  → If revoked token reused → revoke ALL user tokens (breach detection)
```

### 2.3 Password Security

| Requirement | Implementation |
|------------|---------------|
| Hashing | bcrypt, cost factor 12 |
| Min length | 8 characters |
| Complexity | 1 uppercase, 1 lowercase, 1 number |
| Failed attempts | Lock after 5 failures for 15 minutes |
| Password reset | OTP verification required |
| Password history | Prevent reuse of last 3 passwords |

---

## 3. OTP Verification

```javascript
// services/otp.service.js
class OtpService {
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  async sendOTP(userId, purpose) {
    const code = this.generateOTP();
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    await OtpCode.findOneAndUpdate(
      { userId, purpose },
      { code: hashedCode, attempts: 0, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
      { upsert: true }
    );

    // Send via SMS (Twilio) or Email (SendGrid)
    if (purpose === 'registration') await smsService.send(user.phone, code);
    else await emailService.send(user.email, code);

    return { otpSent: true, expiresIn: 300 };
  }

  async verifyOTP(userId, code, purpose) {
    const otp = await OtpCode.findOne({ userId, purpose });
    if (!otp || otp.expiresAt < new Date()) throw new AppError('OTP_EXPIRED', 400);
    if (otp.attempts >= 3) throw new AppError('OTP_MAX_ATTEMPTS', 400);

    const hashedInput = crypto.createHash('sha256').update(code).digest('hex');
    if (hashedInput !== otp.code) {
      otp.attempts += 1;
      await otp.save();
      throw new AppError('OTP_INVALID', 400);
    }

    await OtpCode.deleteOne({ _id: otp._id });
    return { verified: true };
  }
}
```

---

## 4. Role-Based Access Control (RBAC)

### 4.1 Role Hierarchy

```
admin > moderator > creator > fan
```

### 4.2 Permission Enforcement

```javascript
// middleware/role.middleware.js
const PERMISSIONS = {
  fan: ['read:public', 'write:comment', 'write:like', 'write:follow', 'write:gift', 'write:chat'],
  creator: ['...fan', 'write:post', 'write:story', 'write:live', 'read:earnings', 'write:withdraw'],
  moderator: ['...creator', 'write:moderate', 'write:ban_temp', 'read:reports'],
  admin: ['*'],
};

const checkPermission = (permission) => (req, res, next) => {
  const userPerms = PERMISSIONS[req.user.role] || [];
  if (!userPerms.includes('*') && !userPerms.includes(permission)) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
  }
  next();
};
```

### 4.3 Resource Ownership

```javascript
// Verify user owns the resource before modification
const verifyOwnership = (Model, paramKey = 'id') => async (req, res, next) => {
  const resource = await Model.findById(req.params[paramKey]);
  if (!resource) return res.status(404).json({ error: { code: 'NOT_FOUND' } });
  if (!resource.userId.equals(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ error: { code: 'FORBIDDEN' } });
  }
  req.resource = resource;
  next();
};
```

---

## 5. Rate Limiting

```javascript
// middleware/rateLimit.middleware.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const createLimiter = (windowMs, max, keyGenerator) =>
  rateLimit({
    store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
    windowMs,
    max,
    keyGenerator,
    handler: (req, res) => res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
    }),
  });

// Global API rate limit
app.use('/api/', createLimiter(60 * 1000, 100, (req) => req.ip));

// Auth endpoints
app.use('/api/v1/auth/', createLimiter(60 * 1000, 10, (req) => req.ip));

// Gift sending
app.use('/api/v1/gift/send', createLimiter(60 * 1000, 100, (req) => req.user?.id || req.ip));
```

| Endpoint Group | Limit | Window |
|---------------|-------|--------|
| Auth (login, register) | 10 | 1 min per IP |
| OTP send | 3 | 5 min per user |
| General API | 100 | 1 min per user |
| Upload | 20 | 1 min per user |
| Chat send | 60 | 1 min per user |
| Gift send | 100 | 1 min per user |
| Search | 30 | 1 min per user |

---

## 6. API Input Validation

All inputs validated using Joi schemas before reaching controllers.

```javascript
// utils/validators/auth.validator.js
const Joi = require('joi');

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(20).required(),
  email: Joi.string().email().when('registrationMethod', {
    is: 'email', then: Joi.required(), otherwise: Joi.optional(),
  }),
  phone: Joi.string().pattern(/^\+[1-9]\d{6,14}$/).when('registrationMethod', {
    is: 'phone', then: Joi.required(), otherwise: Joi.optional(),
  }),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
  registrationMethod: Joi.string().valid('email', 'phone').required(),
});

// middleware/validate.middleware.js
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        details: error.details.map(d => ({ field: d.path.join('.'), message: d.message })),
      },
    });
  }
  req.body = value;
  next();
};
```

---

## 7. Encryption

### 7.1 Data in Transit

| Connection | Protocol |
|-----------|----------|
| Client ↔ API | TLS 1.3 (HTTPS) |
| Client ↔ LiveKit | WSS (WebSocket Secure) |
| API ↔ MongoDB | TLS (Atlas enforced) |
| API ↔ Redis | TLS (stunnel or Redis 6+ TLS) |
| API ↔ S3 | HTTPS |

### 7.2 Data at Rest

| Data | Encryption |
|------|-----------|
| MongoDB | AES-256 (Atlas encryption at rest) |
| S3/R2 | Server-side encryption (SSE-S3) |
| Bank details | AES-256-GCM application-level encryption |
| KYC documents | Encrypted storage, access-logged |
| Passwords | bcrypt hash (not reversible) |
| OTP codes | SHA-256 hash |
| Refresh tokens | SHA-256 hash |

```javascript
// utils/encryption.util.js
const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(process.env.ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};
```

---

## 8. Secure Media URLs

Premium content (PPV, subscriber-only) served via signed URLs with expiration.

```javascript
// services/media.service.js
generateSignedUrl(mediaKey, userId, expiresInSeconds = 3600) {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const signature = crypto
    .createHmac('sha256', process.env.CDN_SIGNING_KEY)
    .update(`${mediaKey}${expires}${userId}`)
    .digest('hex');

  return `https://cdn.Zemin.app/${mediaKey}?expires=${expires}&uid=${userId}&sig=${signature}`;
}
```

**Watermarking:** PPV videos watermarked with viewer's user ID (invisible forensic watermark).

---

## 9. Anti-Spam

| Vector | Protection |
|--------|-----------|
| Registration spam | OTP verification, CAPTCHA (reCAPTCHA v3) |
| Chat spam | Rate limiting, duplicate detection, slow mode |
| Follow spam | Max 200 follows/day |
| Comment spam | Rate limiting, link filtering, keyword blocklist |
| Gift spam | Rate limiting (100/min), anomaly detection |
| Bot accounts | Device fingerprinting, behavioral analysis |

---

## 10. Content Moderation

| Layer | Method |
|-------|--------|
| Upload | AI content classification (AWS Rekognition / Google Vision) |
| Pre-publish | NSFW detection, violence detection |
| User reports | Manual review queue (moderators) |
| Live streams | Real-time keyword filtering in chat |
| Automated | Block known CSAM hashes (PhotoDNA) |
| Compliance | Age verification for creators (18+) |

---

## 11. DDoS Considerations

| Layer | Protection |
|-------|-----------|
| DNS | Cloudflare DDoS protection |
| Network | Cloudflare WAF rules |
| Application | Rate limiting (Redis-backed) |
| API | Request size limits (10MB JSON, 500MB upload) |
| Socket.IO | Connection limits per IP |
| LiveKit | Participant limits per room |

---

## 12. Security Checklist

### 12.1 Pre-Launch

- [ ] Penetration test completed (third-party)
- [ ] OWASP Top 10 vulnerabilities addressed
- [ ] All secrets in environment variables (not in code)
- [ ] HTTPS enforced on all endpoints
- [ ] CORS configured for allowed origins only
- [ ] Helmet.js security headers enabled
- [ ] SQL/NoSQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding, CSP headers)
- [ ] CSRF protection (not needed for JWT APIs)
- [ ] File upload validation (type, size, magic bytes)
- [ ] Dependency audit (`npm audit`)
- [ ] PCI-DSS compliance for payment handling
- [ ] GDPR data export/deletion endpoints
- [ ] Audit logging for admin actions
- [ ] Incident response plan documented

### 12.2 Ongoing

- [ ] Quarterly penetration tests
- [ ] Monthly dependency updates
- [ ] Weekly security log review
- [ ] Real-time error monitoring (Sentry)
- [ ] Anomaly detection on payment patterns
- [ ] Access review for admin accounts (monthly)

---

*End of Volume 11*
