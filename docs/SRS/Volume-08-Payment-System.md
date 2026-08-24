# Volume 8 — Payment System

**Document ID:** Zemin-SRS-V08  
**Version:** 1.0.0  
**Pages:** ~35  

---

## 1. Payment Architecture Overview

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Fan      │────│  Zemin API    │────│  MongoDB     │
│  (Mobile) │    │  (Payment     │    │  (wallets,   │
└──────────┘     │   Service)    │    │  transactions)│
                 └──────┬───────┘     └──────────────┘
                        │
              ┌─────────┼─────────┐
              ▼         ▼         ▼
        ┌─────────┐ ┌───────┐ ┌─────────┐
        │ Stripe  │ │Razorpay│ │ Webhook │
        │ (US/EU) │ │(India) │ │ Handler │
        └─────────┘ └───────┘ └─────────┘
```

---

## 2. Razorpay Integration (India)

### 2.1 Configuration

```javascript
// config/razorpay.js
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
```

### 2.2 Coin Purchase Flow

```
1. Fan selects coin package
2. POST /api/coin/purchase → Create Razorpay order
3. Mobile opens Razorpay checkout (SDK)
4. Fan completes payment (UPI/card/netbanking/wallet)
5. Razorpay webhook → payment.captured
6. Verify signature → Credit coins to wallet
7. Create transaction record
8. Notify fan (success toast + notification)
```

### 2.3 Order Creation

```javascript
// services/payment.service.js
async createRazorpayOrder({ userId, packageId, currency }) {
  const pkg = await Coin.findOne({ packageId, isActive: true });
  const amount = currency === 'INR' ? pkg.priceINR : pkg.priceUSD;

  const order = await razorpay.orders.create({
    amount,                    // in paise
    currency: 'INR',
    receipt: `coin_${userId}_${Date.now()}`,
    notes: { userId, packageId, purpose: 'coin_purchase' },
  });

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    gatewayKey: process.env.RAZORPAY_KEY_ID,
  };
}
```

### 2.4 Payment Verification

```javascript
async verifyRazorpayPayment({ orderId, paymentId, signature }) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  if (expectedSignature !== signature) {
    throw new AppError('PAYMENT_VERIFICATION_FAILED', 400);
  }

  const payment = await razorpay.payments.fetch(paymentId);
  if (payment.status !== 'captured') {
    throw new AppError('PAYMENT_NOT_CAPTURED', 400);
  }

  // Credit coins
  const { userId, packageId } = payment.notes;
  await this.creditCoins(userId, packageId, paymentId);
}
```

### 2.5 Webhook Events

| Event | Action |
|-------|--------|
| `payment.captured` | Credit coins/subscription |
| `payment.failed` | Log failure, notify user |
| `refund.created` | Deduct coins, update transaction |
| `subscription.charged` | Renew subscription |
| `subscription.cancelled` | Mark subscription cancelled |

---

## 3. Stripe Integration (US/EU)

### 3.1 Configuration

```javascript
// config/stripe.js
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
```

### 3.2 Subscription Flow

```
1. Fan selects subscription tier
2. POST /api/subscription/create
3. Create Stripe Checkout Session (or Payment Intent)
4. Mobile opens Stripe payment sheet
5. Payment succeeds → webhook: checkout.session.completed
6. Create subscription record
7. Grant tier access
8. Notify creator
```

### 3.3 Checkout Session

```javascript
async createStripeCheckout({ userId, tierId, creatorId }) {
  const tier = await SubscriptionTier.findById(tierId);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: await this.getOrCreateStripeCustomer(userId),
    line_items: [{
      price: tier.stripePriceId,
      quantity: 1,
    }],
    metadata: { userId, tierId, creatorId },
    success_url: 'Zemin://subscription/success',
    cancel_url: 'Zemin://subscription/cancel',
  });

  return { sessionId: session.id, url: session.url };
}
```

### 3.4 Stripe Webhook Events

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Activate subscription |
| `invoice.paid` | Renew subscription period |
| `invoice.payment_failed` | Notify user, grace period |
| `customer.subscription.deleted` | Cancel subscription |
| `charge.refunded` | Process refund |

---

## 4. Wallet System

### 4.1 Wallet Structure

Each user has one wallet with two balance types:

| Balance | Type | Usage |
|---------|------|-------|
| coinBalance | Integer | Virtual coins for gifts |
| fiatBalance | Integer (cents) | Real money for PPV, subscriptions, DMs |

### 4.2 Wallet Operations

```javascript
// services/wallet.service.js
class WalletService {
  async creditCoins(userId, amount, description, metadata) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await Wallet.findOneAndUpdate(
        { userId },
        { $inc: { coinBalance: amount, totalCoinsPurchased: amount } },
        { session }
      );
      await Transaction.create([{
        userId, type: 'coin_purchase', coinAmount: amount,
        status: 'completed', description, metadata,
      }], { session });
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async debitCoins(userId, amount, description, metadata) {
    const wallet = await Wallet.findOne({ userId });
    if (wallet.coinBalance < amount) throw new AppError('INSUFFICIENT_COINS', 400);
    // Atomic debit with transaction record...
  }

  async creditCreatorEarnings(creatorId, amountCents, source, metadata) {
    const platformFee = Math.floor(amountCents * 0.20);
    const creatorEarnings = amountCents - platformFee;
    await Creator.findOneAndUpdate(
      { userId: creatorId },
      { $inc: { availableBalance: creatorEarnings, totalEarnings: creatorEarnings } }
    );
    // Transaction record...
  }
}
```

---

## 5. Coins System

### 5.1 Coin Packages

| Package ID | Coins | Bonus | USD | INR |
|-----------|-------|-------|-----|-----|
| pkg_100 | 100 | 0 | $0.99 | ₹79 |
| pkg_500 | 500 | 50 | $4.99 | ₹399 |
| pkg_1000 | 1,000 | 150 | $9.99 | ₹799 |
| pkg_5000 | 5,000 | 1,000 | $39.99 | ₹3,199 |
| pkg_10000 | 10,000 | 2,500 | $74.99 | ₹5,999 |

### 5.2 Coin Value

```
1 coin = $0.008 USD (0.8 cents)
100 coins = $0.80 USD
1000 coins = $8.00 USD

Platform margin on coin sales: ~30%
Creator receives 80% of coin value when gifted
Platform retains 20% as commission
```

---

## 6. Gifts System

### 6.1 Gift Economics

```
Fan buys 1000 coins for $9.99 (platform margin: ~$3)
Fan sends Rocket gift (1000 coins) to creator
  → Creator earns: 1000 × $0.008 × 80% = $6.40
  → Platform earns: 1000 × $0.008 × 20% = $1.60
  → Platform already earned ~$3 on coin sale
  → Total platform revenue: ~$4.60 on $9.99 purchase
```

---

## 7. Creator Earnings

### 7.1 Earnings Sources

| Source | Creator % | Platform % |
|--------|----------|-----------|
| Subscriptions | 80% | 20% |
| PPV purchases | 80% | 20% |
| Gifts/Coins | 80% | 20% |
| Paid DMs | 80% | 20% |
| Tips | 85% | 15% |

### 7.2 Earnings Dashboard Data

```javascript
// GET /api/creator/dashboard earnings section
{
  today: 25.50,
  thisWeek: 180.00,
  thisMonth: 650.00,
  total: 5200.00,
  available: 125.50,     // can withdraw
  pending: 45.00,        // processing
  breakdown: {
    subscriptions: 350.00,
    gifts: 200.00,
    ppv: 75.00,
    dms: 25.00
  }
}
```

---

## 8. Withdraw Requests

### 8.1 Withdrawal Flow

```
Creator requests withdrawal (≥ $50 / ₹500)
  → Status: pending
  → Admin reviews (KYC check, fraud check)
  → Admin approves → Status: approved
  → Background job processes payout
    → Razorpay Payouts (India) or Stripe Connect (US/EU)
  → Status: completed
  → Creator notified
```

### 8.2 Withdrawal Rules

| Rule | Value |
|------|-------|
| Minimum amount | $50 / ₹500 |
| Maximum per request | $10,000 / ₹8,00,000 |
| Processing time | 3–5 business days |
| Max pending requests | 1 at a time |
| KYC required | Yes (verified creator) |
| Supported methods | Bank transfer, UPI, PayPal |
| Frequency limit | 2 per week |

### 8.3 Payout Processing

```javascript
// jobs/withdrawalProcess.job.js
async processWithdrawal(withdrawId) {
  const request = await WithdrawRequest.findById(withdrawId);
  if (request.status !== 'approved') return;

  request.status = 'processing';
  await request.save();

  try {
    if (request.method === 'bank_transfer' && request.currency === 'INR') {
      const payout = await razorpay.payouts.create({
        account_number: process.env.RAZORPAY_ACCOUNT,
        amount: request.amount,
        currency: 'INR',
        mode: 'IMPS',
        purpose: 'payout',
        fund_account: { /* creator bank details */ },
      });
      request.gatewayPayoutId = payout.id;
    } else if (request.method === 'paypal') {
      // PayPal payout API
    }

    request.status = 'completed';
    request.processedAt = new Date();
    await request.save();

    // Deduct from creator available balance
    await Creator.findOneAndUpdate(
      { userId: request.userId },
      { $inc: { availableBalance: -request.amount, totalWithdrawn: request.amount } }
    );
  } catch (err) {
    request.status = 'pending';
    await request.save();
    logger.error('Withdrawal failed', { withdrawId, error: err });
  }
}
```

---

## 9. Refund Handling

### 9.1 Refund Policy

| Type | Refundable | Conditions |
|------|-----------|------------|
| Coin purchase | No | Virtual goods, non-refundable |
| Subscription | Partial | Pro-rated within 7 days |
| PPV purchase | Case-by-case | Admin review within 48 hours |
| Paid DM | No | Service rendered |
| Gift | No | Virtual goods delivered |

### 9.2 Refund Process

```
User requests refund → Admin reviews
  → Approved: Process via Stripe/Razorpay refund API
  → Deduct creator earnings (if already credited)
  → Update transaction status to 'refunded'
  → Notify user
```

---

## 10. Transaction Audit Trail

Every financial operation creates an immutable transaction record:

```javascript
{
  userId: ObjectId,
  type: 'gift_sent',
  amount: 800,              // cents value
  coinAmount: 1000,
  currency: 'USD',
  status: 'completed',
  description: 'Sent Rocket gift to @creator1',
  metadata: {
    giftId: 'gift_rocket',
    recipientId: ObjectId,
    roomId: ObjectId,
    platformFee: 160,
    creatorEarnings: 640,
  },
  paymentGateway: 'wallet',
  createdAt: Date,
}
```

---

*End of Volume 8*
