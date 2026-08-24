# Volume 6 — Backend Architecture

**Document ID:** Zemin-SRS-V06  
**Version:** 1.0.0  
**Pages:** ~35  

---

## 1. Project Structure

```
backend/
├── config/
│   ├── database.js             # MongoDB connection
│   ├── redis.js                # Redis connection
│   ├── cloudinary.js           # Media upload config
│   ├── stripe.js               # Stripe config
│   ├── razorpay.js             # Razorpay config
│   ├── livekit.js              # LiveKit config
│   ├── firebase.js             # FCM config
│   └── env.js                  # Environment variables loader
├── controllers/
│   ├── auth.controller.js
│   ├── user.controller.js
│   ├── post.controller.js
│   ├── story.controller.js
│   ├── feed.controller.js
│   ├── chat.controller.js
│   ├── live.controller.js
│   ├── gift.controller.js
│   ├── wallet.controller.js
│   ├── coin.controller.js
│   ├── subscription.controller.js
│   ├── payment.controller.js
│   ├── notification.controller.js
│   ├── creator.controller.js
│   ├── search.controller.js
│   ├── report.controller.js
│   ├── upload.controller.js
│   └── admin/
│       ├── dashboard.controller.js
│       ├── users.controller.js
│       ├── creators.controller.js
│       ├── reports.controller.js
│       ├── payments.controller.js
│       ├── live.controller.js
│       └── cms.controller.js
├── middleware/
│   ├── auth.middleware.js      # JWT verification
│   ├── role.middleware.js      # RBAC checks
│   ├── validate.middleware.js  # Joi validation
│   ├── rateLimit.middleware.js # Rate limiting
│   ├── upload.middleware.js    # Multer file upload
│   └── error.middleware.js     # Global error handler
├── models/
│   ├── User.model.js
│   ├── Creator.model.js
│   ├── Post.model.js
│   ├── Story.model.js
│   ├── Reel.model.js
│   ├── Comment.model.js
│   ├── Like.model.js
│   ├── Follower.model.js
│   ├── SubscriptionTier.model.js
│   ├── Subscription.model.js
│   ├── Wallet.model.js
│   ├── Transaction.model.js
│   ├── Gift.model.js
│   ├── GiftTransaction.model.js
│   ├── LiveRoom.model.js
│   ├── LiveMessage.model.js
│   ├── LiveParticipant.model.js
│   ├── PKBattle.model.js
│   ├── Conversation.model.js
│   ├── Message.model.js
│   ├── Notification.model.js
│   ├── Report.model.js
│   ├── Admin.model.js
│   ├── WithdrawRequest.model.js
│   ├── Category.model.js
│   ├── Banner.model.js
│   ├── OtpCode.model.js
│   ├── RefreshToken.model.js
│   └── AuditLog.model.js
├── routes/
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── post.routes.js
│   ├── story.routes.js
│   ├── feed.routes.js
│   ├── chat.routes.js
│   ├── live.routes.js
│   ├── gift.routes.js
│   ├── wallet.routes.js
│   ├── coin.routes.js
│   ├── subscription.routes.js
│   ├── payment.routes.js
│   ├── notification.routes.js
│   ├── creator.routes.js
│   ├── search.routes.js
│   ├── report.routes.js
│   ├── upload.routes.js
│   └── admin.routes.js
├── services/
│   ├── auth.service.js
│   ├── otp.service.js
│   ├── email.service.js
│   ├── sms.service.js
│   ├── media.service.js        # Upload, transcode, CDN
│   ├── payment.service.js      # Stripe/Razorpay orchestration
│   ├── wallet.service.js       # Balance operations
│   ├── gift.service.js         # Gift sending logic
│   ├── subscription.service.js # Recurring billing
│   ├── live.service.js         # Room lifecycle
│   ├── livekit.service.js      # LiveKit token generation
│   ├── notification.service.js # Push, in-app
│   ├── feed.service.js         # Feed algorithm
│   ├── search.service.js       # Full-text search
│   ├── moderation.service.js   # Content moderation
│   └── analytics.service.js    # Event tracking
├── sockets/
│   ├── index.js                # Socket.IO server setup
│   ├── live.socket.js          # Live room events
│   ├── chat.socket.js          # Chat events
│   ├── notification.socket.js  # Real-time notifications
│   └── pk.socket.js            # PK battle events
├── utils/
│   ├── jwt.util.js
│   ├── bcrypt.util.js
│   ├── pagination.util.js
│   ├── response.util.js        # Standard API responses
│   ├── validators/             # Joi schemas
│   │   ├── auth.validator.js
│   │   ├── post.validator.js
│   │   └── live.validator.js
│   └── helpers.js
├── uploads/                    # Temp upload directory
├── jobs/                       # Background jobs (Bull queue)
│   ├── videoTranscode.job.js
│   ├── subscriptionRenewal.job.js
│   ├── storyCleanup.job.js
│   ├── withdrawalProcess.job.js
│   └── notificationBatch.job.js
├── server.js                   # Entry point
├── app.js                      # Express app setup
├── package.json
├── Dockerfile
└── docker-compose.yml
```

---

## 2. Server Entry Point

```javascript
// server.js
const app = require('./app');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initSocket } = require('./sockets');
const { startJobs } = require('./jobs');

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();
  await connectRedis();

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  initSocket(server);
  startJobs();
};

start();
```

---

## 3. Express App Setup

```javascript
// app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const routes = require('./routes');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS.split(',') }));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', require('./middleware/rateLimit.middleware'));

// Routes
app.use('/api/v1', routes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Error handler
app.use(errorMiddleware);

module.exports = app;
```

---

## 4. Middleware Pipeline

```
Request → helmet → cors → compression → morgan → bodyParser
  → rateLimit → auth → role → validate → controller → response
  → errorHandler
```

### 4.1 Auth Middleware

```javascript
// middleware/auth.middleware.js
const jwt = require('../utils/jwt.util');

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: { code: 'TOKEN_MISSING' } });

  try {
    const decoded = jwt.verifyAccessToken(token);
    req.user = await User.findById(decoded.userId).select('-passwordHash');
    if (!req.user || req.user.isBanned) {
      return res.status(403).json({ success: false, error: { code: 'ACCOUNT_BANNED' } });
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: { code: 'TOKEN_INVALID' } });
  }
};
```

### 4.2 Role Middleware

```javascript
// middleware/role.middleware.js
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
  }
  next();
};

// Usage: router.post('/create', authenticate, authorize('creator'), postController.create);
```

---

## 5. Service Layer Pattern

Controllers handle HTTP; services contain business logic.

```javascript
// services/gift.service.js
class GiftService {
  async sendGift({ senderId, recipientId, giftId, quantity, context }) {
    const gift = await Gift.findOne({ giftId, isActive: true });
    if (!gift) throw new AppError('GIFT_NOT_FOUND', 404);

    const totalCost = gift.coinCost * quantity;
    const wallet = await Wallet.findOne({ userId: senderId });

    if (wallet.coinBalance < totalCost) {
      throw new AppError('INSUFFICIENT_COINS', 400);
    }

    // Atomic transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      wallet.coinBalance -= totalCost;
      await wallet.save({ session });

      const creatorEarnings = Math.floor(totalCost * 0.008 * 0.8 * 100); // 80% in cents
      await Creator.findOneAndUpdate(
        { userId: recipientId },
        { $inc: { availableBalance: creatorEarnings, 'stats.totalGiftsReceived': quantity } },
        { session }
      );

      const giftTx = await GiftTransaction.create([{
        senderId, recipientId, giftId: gift._id,
        giftName: gift.name, coinCost: gift.coinCost,
        quantity, totalCost, creatorEarnings,
        platformFee: Math.floor(totalCost * 0.008 * 0.2 * 100),
        context,
      }], { session });

      await session.commitTransaction();

      // Emit socket event
      socketManager.emitToRoom(context.roomId, 'live:gift', {
        gift, sender: senderId, quantity, animation: gift.animationUrl,
      });

      return giftTx[0];
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}
```

---

## 6. Background Jobs (Bull + Redis)

| Job | Schedule | Purpose |
|-----|----------|---------|
| videoTranscode | On upload | FFmpeg HLS transcoding |
| subscriptionRenewal | Daily 00:00 UTC | Process recurring billing |
| storyCleanup | Hourly | Delete expired stories |
| withdrawalProcess | Every 4 hours | Process approved withdrawals |
| notificationBatch | Every 15 min | Batch push notifications |
| liveRoomCleanup | Every 5 min | End stale live rooms |
| analyticsAggregate | Daily 01:00 UTC | Compute daily KPIs |

---

## 7. Caching Strategy (Redis)

| Key Pattern | TTL | Purpose |
|------------|-----|---------|
| `user:{id}` | 5 min | User profile cache |
| `feed:{userId}:page:{n}` | 2 min | Feed page cache |
| `live:active` | 30 sec | Active live rooms list |
| `live:room:{id}:viewers` | None | Viewer count (INCR/DECR) |
| `live:room:{id}:gifts` | None | Gift leaderboard (sorted set) |
| `creator:{id}:stats` | 5 min | Creator stats cache |
| `rate:{ip}:{endpoint}` | 1 min | Rate limit counters |
| `otp:{userId}` | 5 min | OTP attempt tracking |

---

## 8. Error Handling

```javascript
// middleware/error.middleware.js
class AppError extends Error {
  constructor(code, statusCode, message) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  if (statusCode === 500) {
    logger.error(err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};
```

---

## 9. Logging & Monitoring

| Tool | Purpose |
|------|---------|
| Winston | Structured application logging |
| Morgan | HTTP request logging |
| Sentry | Error tracking & alerting |
| Datadog / New Relic | APM, metrics, dashboards |
| MongoDB Atlas Monitoring | Database performance |
| Redis INFO | Cache hit rates |

---

*End of Volume 6*
