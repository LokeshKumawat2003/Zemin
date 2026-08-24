# Volume 12 — Testing

**Document ID:** Zemin-SRS-V12  
**Version:** 1.0.0  
**Pages:** ~30  

---

## 1. Testing Strategy

```
                    ┌─────────────┐
                    │   E2E Tests  │  10% — Critical user flows
                    │  (Detox)     │
                    ├─────────────┤
                    │ Integration  │  20% — API + DB + Socket
                    │   Tests      │
                    ├─────────────┤
                    │  API Tests   │  30% — All endpoints
                    │ (Supertest)  │
                    ├─────────────┤
                    │  Unit Tests  │  40% — Services, utils, redux
                    │ (Jest)       │
                    └─────────────┘
```

**Coverage Target:** 80% overall, 90% for payment and auth modules

---

## 2. Unit Testing

### 2.1 Backend Unit Tests (Jest)

**Location:** `backend/tests/unit/`

| Module | Test File | Key Tests |
|--------|-----------|-----------|
| auth.service | auth.service.test.js | Login, register, token refresh, OTP |
| gift.service | gift.service.test.js | Send gift, insufficient coins, earnings calc |
| wallet.service | wallet.service.test.js | Credit, debit, balance checks |
| payment.service | payment.service.test.js | Order creation, verification, webhooks |
| subscription.service | subscription.service.test.js | Create, renew, cancel |
| live.service | live.service.test.js | Room lifecycle, guest management |
| otp.service | otp.service.test.js | Generate, verify, expiry, max attempts |

**Example:**
```javascript
// tests/unit/gift.service.test.js
describe('GiftService', () => {
  describe('sendGift', () => {
    it('should deduct coins and credit creator earnings', async () => {
      const sender = await createTestUser({ coinBalance: 1000 });
      const creator = await createTestCreator();
      const gift = await createTestGift({ coinCost: 100 });

      const result = await giftService.sendGift({
        senderId: sender._id,
        recipientId: creator.userId,
        giftId: gift.giftId,
        quantity: 1,
        context: { type: 'profile' },
      });

      expect(result.totalCost).toBe(100);
      const updatedWallet = await Wallet.findOne({ userId: sender._id });
      expect(updatedWallet.coinBalance).toBe(900);
      const updatedCreator = await Creator.findOne({ userId: creator.userId });
      expect(updatedCreator.availableBalance).toBe(64); // 100 * 0.008 * 0.8 * 100 cents
    });

    it('should throw INSUFFICIENT_COINS when balance is low', async () => {
      const sender = await createTestUser({ coinBalance: 10 });
      await expect(giftService.sendGift({ /* ... */ }))
        .rejects.toThrow('INSUFFICIENT_COINS');
    });
  });
});
```

### 2.2 Mobile Unit Tests (Jest + React Native Testing Library)

**Location:** `Zemin-mobile/src/__tests__/`

| Module | Key Tests |
|--------|-----------|
| authSlice | Login, logout, token refresh reducers |
| formatters | Currency, date, number formatting |
| validators | Email, phone, password validation |
| components | Button, Input, PostCard rendering |

---

## 3. API Testing

### 3.1 Backend API Tests (Supertest + Jest)

**Location:** `backend/tests/api/`

| Test Suite | Endpoints Covered |
|-----------|-------------------|
| auth.api.test.js | register, login, verify-otp, refresh, logout |
| post.api.test.js | create, get, like, comment, delete, ppv |
| live.api.test.js | create, start, join, leave, end, guest, pk |
| chat.api.test.js | conversations, send, send-media, read |
| gift.api.test.js | catalog, send |
| wallet.api.test.js | balance, transactions, withdraw |
| subscription.api.test.js | tiers, create, cancel |
| payment.api.test.js | create-order, verify, webhooks |

**Example:**
```javascript
// tests/api/auth.api.test.js
describe('POST /api/v1/auth/register', () => {
  it('should register a new user and send OTP', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123',
        registrationMethod: 'email',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.otpSent).toBe(true);
  });

  it('should reject duplicate username', async () => {
    await createTestUser({ username: 'existing' });
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'existing', /* ... */ });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USERNAME_TAKEN');
  });

  it('should reject weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'newuser', password: 'weak', /* ... */ });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### 3.2 Postman/Newman Collection

**Location:** `backend/tests/postman/Zemin-api.postman_collection.json`

- Complete API collection with environment variables
- Run via Newman in CI: `newman run collection.json -e environment.json`
- Includes pre-request scripts for auth token management

---

## 4. Integration Testing

### 4.1 Backend Integration Tests

**Location:** `backend/tests/integration/`

| Test Suite | Flows Tested |
|-----------|-------------|
| auth-flow.test.js | Register → OTP → Login → Refresh → Logout |
| payment-flow.test.js | Buy coins → Send gift → Creator earnings → Withdraw |
| subscription-flow.test.js | Create tier → Subscribe → Access content → Cancel |
| live-flow.test.js | Create room → Start → Join → Gift → End |
| chat-flow.test.js | Start conversation → Send messages → Read receipts |
| pk-flow.test.js | Challenge → Accept → Gifts → Score → Winner |

**Example:**
```javascript
// tests/integration/payment-flow.test.js
describe('Complete payment flow', () => {
  it('should complete coin purchase → gift → creator earnings → withdrawal', async () => {
    const fan = await createAuthenticatedUser('fan');
    const creator = await createAuthenticatedCreator();

    // Step 1: Purchase coins
    const order = await request(app)
      .post('/api/v1/coin/purchase')
      .set('Authorization', `Bearer ${fan.token}`)
      .send({ packageId: 'pkg_1000', paymentMethod: 'razorpay', currency: 'INR' });
    expect(order.status).toBe(200);

    // Simulate webhook
    await simulateRazorpayWebhook(order.body.data.orderId);

    const wallet = await request(app)
      .get('/api/v1/wallet/balance')
      .set('Authorization', `Bearer ${fan.token}`);
    expect(wallet.body.data.coinBalance).toBe(1150); // 1000 + 15% bonus

    // Step 2: Send gift
    const gift = await request(app)
      .post('/api/v1/gift/send')
      .set('Authorization', `Bearer ${fan.token}`)
      .send({
        giftId: 'gift_rocket', recipientId: creator.userId,
        quantity: 1, context: { type: 'profile' },
      });
    expect(gift.status).toBe(201);

    // Step 3: Verify creator earnings
    const dashboard = await request(app)
      .get('/api/v1/creator/dashboard')
      .set('Authorization', `Bearer ${creator.token}`);
    expect(dashboard.body.data.earnings.total).toBeGreaterThan(0);

    // Step 4: Request withdrawal
    const withdrawal = await request(app)
      .post('/api/v1/wallet/withdraw')
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ amount: 5000, method: 'bank_transfer', bankDetails: { /* ... */ } });
    expect(withdrawal.status).toBe(201);
  });
});
```

### 4.2 Socket.IO Integration Tests

```javascript
// tests/integration/socket-live.test.js
describe('Live Socket Events', () => {
  it('should broadcast gift to all room participants', (done) => {
    const hostSocket = io(SERVER_URL, { auth: { token: hostToken } });
    const viewerSocket = io(SERVER_URL, { auth: { token: viewerToken } });

    hostSocket.emit('live:join', { roomId });
    viewerSocket.emit('live:join', { roomId });

    viewerSocket.on('live:gift_received', (data) => {
      expect(data.gift.name).toBe('Rocket');
      expect(data.sender).toBeDefined();
      hostSocket.disconnect();
      viewerSocket.disconnect();
      done();
    });

    // Trigger gift via API
    sendGiftViaAPI(viewerToken, hostId, 'gift_rocket', { roomId });
  });
});
```

---

## 5. UI Testing (Mobile)

### 5.1 Detox E2E Tests

**Location:** `Zemin-mobile/e2e/`

| Test | Flow |
|------|------|
| auth.e2e.js | Splash → Signup → OTP → Home |
| feed.e2e.js | Home feed scroll, like, comment |
| live.e2e.js | Discover live → Join room → Send chat |
| wallet.e2e.js | Open wallet → Buy coins → Verify balance |
| profile.e2e.js | View creator profile → Follow → Subscribe |

**Example:**
```javascript
// e2e/auth.e2e.js
describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should complete registration flow', async () => {
    await element(by.id('signup-button')).tap();
    await element(by.id('username-input')).typeText('e2euser');
    await element(by.id('email-input')).typeText('e2e@test.com');
    await element(by.id('password-input')).typeText('TestPass123');
    await element(by.id('create-account-button')).tap();

    await expect(element(by.id('otp-screen'))).toBeVisible();
    // Enter test OTP (mocked in test environment)
    await element(by.id('otp-input-0')).typeText('1');
    // ... enter remaining digits

    await expect(element(by.id('home-feed'))).toBeVisible();
  });
});
```

---

## 6. Load Testing

### 6.1 Tools

| Tool | Purpose |
|------|---------|
| k6 | API load testing |
| Artillery | Socket.IO load testing |
| LiveKit load tester | WebRTC stream testing |

### 6.2 Load Test Scenarios

| Scenario | Target | Duration |
|----------|--------|----------|
| API baseline | 1,000 req/sec, p95 <200ms | 10 min |
| Feed load | 5,000 concurrent users scrolling feed | 15 min |
| Live room | 10,000 viewers in single room | 30 min |
| Gift storm | 1,000 gifts/sec to live room | 5 min |
| Chat flood | 500 messages/sec in live room | 5 min |
| Registration burst | 500 registrations/min | 5 min |
| Payment peak | 100 concurrent coin purchases | 10 min |

### 6.3 k6 Example

```javascript
// tests/load/feed-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 1000 },
    { duration: '5m', target: 5000 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const token = __ENV.TEST_TOKEN;
  const res = http.get('https://api.Zemin.app/api/v1/feed/for-you?page=1&limit=20', {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

---

## 7. Live Streaming Stress Testing

| Test | Method | Pass Criteria |
|------|--------|---------------|
| Single room 10K viewers | LiveKit load tester | <3s join latency, no drops |
| 100 concurrent live rooms | Automated room creation | All streams stable |
| PK battle with 5K viewers each | Two rooms, simultaneous | Score updates <1s delay |
| Host disconnect recovery | Kill host connection | Auto-end within 60s |
| Guest slot contention | 50 simultaneous guest requests | Queue handled correctly |
| Recording under load | 10 recorded streams simultaneously | All recordings saved |

---

## 8. Security Testing

| Test | Tool | Frequency |
|------|------|-----------|
| OWASP ZAP scan | ZAP | Monthly |
| Dependency audit | npm audit, Snyk | Weekly (CI) |
| Penetration test | Third-party firm | Quarterly |
| JWT token tests | Custom scripts | Per release |
| Rate limit verification | k6 | Per release |
| Input fuzzing | Custom fuzzer | Monthly |
| Auth bypass attempts | Manual + automated | Per release |

### 8.1 Security Test Cases

| ID | Test | Expected |
|----|------|----------|
| SEC-01 | Access API without token | 401 Unauthorized |
| SEC-02 | Access admin API as fan | 403 Forbidden |
| SEC-03 | Access other user's wallet | 403 Forbidden |
| SEC-04 | SQL injection in search | Input sanitized, no error |
| SEC-05 | XSS in comment text | HTML escaped in response |
| SEC-06 | Expired JWT token | 401 with TOKEN_EXPIRED |
| SEC-07 | Reuse revoked refresh token | 401, all tokens revoked |
| SEC-08 | Upload executable file | 400 rejected |
| SEC-09 | Access PPV content without purchase | 403 PPV_REQUIRED |
| SEC-10 | Brute force login (6 attempts) | Account locked (423) |
| SEC-11 | Rate limit exceeded | 429 RATE_LIMITED |
| SEC-12 | Manipulate gift coin cost | Server-side validation rejects |

---

## 9. Release Checklist

### 9.1 Pre-Release

- [ ] All unit tests passing (CI green)
- [ ] All API tests passing
- [ ] Integration tests passing
- [ ] E2E critical flows passing
- [ ] Load test benchmarks met
- [ ] Security scan clean (no critical/high)
- [ ] npm audit clean (no critical)
- [ ] Database migrations tested on staging
- [ ] Environment variables updated
- [ ] Feature flags configured
- [ ] Rollback plan documented

### 9.2 Release Day

- [ ] Deploy backend to staging → smoke test
- [ ] Deploy backend to production
- [ ] Verify health checks pass
- [ ] Deploy admin panel
- [ ] Submit mobile app to App Store / Play Store
- [ ] Monitor error rates (Sentry) for 1 hour
- [ ] Monitor API latency for 1 hour
- [ ] Verify payment processing (test transaction)
- [ ] Verify live streaming (test stream)

### 9.3 Post-Release

- [ ] Monitor crash rates (24 hours)
- [ ] Monitor payment success rates
- [ ] Monitor live stream stability
- [ ] Review user feedback / support tickets
- [ ] Performance comparison vs pre-release
- [ ] Post-release retrospective (within 48 hours)

---

## 10. Test Environment Setup

| Environment | Purpose | Database | Payments |
|------------|---------|----------|----------|
| Local | Development | MongoDB local | Mock |
| CI | Automated tests | MongoDB Docker | Mock |
| Staging | Pre-release testing | Atlas (staging) | Razorpay/Stripe test mode |
| Production | Live | Atlas (production) | Live keys |

### 10.1 Test Data Factories

```javascript
// tests/factories/user.factory.js
const createTestUser = async (overrides = {}) => {
  const user = await User.create({
    username: `test_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    passwordHash: await bcrypt.hash('TestPass123', 12),
    role: 'fan',
    isVerified: true,
    ...overrides,
  });
  await Wallet.create({ userId: user._id, coinBalance: overrides.coinBalance || 0 });
  return user;
};

const createAuthenticatedUser = async (role = 'fan', overrides = {}) => {
  const user = await createTestUser({ role, ...overrides });
  const token = jwt.sign({ userId: user._id, role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  return { ...user.toObject(), token };
};
```

---

*End of Volume 12*
