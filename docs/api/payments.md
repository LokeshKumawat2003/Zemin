# Payments & Wallet API Reference

**Base URL:** `/api/v1`  
**Endpoints:** 15  

---

## GET /coin/packages

Returns available coin packages.

**Response:**
```json
{
  "data": [
    {
      "id": "pkg_1000",
      "coins": 1000,
      "bonusCoins": 150,
      "priceUSD": 999,
      "priceINR": 79900,
      "isPopular": true
    }
  ]
}
```

---

## POST /coin/purchase

**Auth:** Bearer  
**Request:**
```json
{
  "packageId": "pkg_1000",
  "paymentMethod": "razorpay | stripe",
  "currency": "INR | USD"
}
```

**Response:** Order details for payment gateway checkout.

---

## POST /payment/create-order

**Request:**
```json
{
  "amount": 79900,
  "currency": "INR",
  "purpose": "coin_purchase | subscription | ppv",
  "metadata": { "packageId": "pkg_1000", "userId": "..." }
}
```

---

## POST /payment/verify

**Request (Razorpay):**
```json
{
  "gateway": "razorpay",
  "orderId": "order_xxx",
  "paymentId": "pay_xxx",
  "signature": "hash"
}
```

**Request (Stripe):**
```json
{
  "gateway": "stripe",
  "sessionId": "cs_xxx"
}
```

**Effect:** Verify payment, credit coins/wallet, create transaction.

---

## POST /payment/webhook/razorpay

**Auth:** Razorpay webhook signature  
**Events:** payment.captured, payment.failed, refund.created, subscription.charged

---

## POST /payment/webhook/stripe

**Auth:** Stripe webhook signature  
**Events:** checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.deleted

---

## GET /wallet/balance

**Auth:** Bearer  
**Response:**
```json
{
  "data": {
    "coinBalance": 5000,
    "walletBalance": 12550,
    "currency": "USD",
    "pendingEarnings": 4500,
    "totalEarned": 125000,
    "totalSpent": 35000
  }
}
```

---

## GET /wallet/transactions?type=&page=&limit=

**Types:** all, purchase, gift_sent, gift_received, subscription, ppv, dm, withdrawal, refund

---

## POST /wallet/withdraw

**Auth:** Bearer (Creator)  
**Request:**
```json
{
  "amount": 10000,
  "method": "bank_transfer | upi | paypal",
  "bankDetails": {
    "accountNumber": "string",
    "ifscCode": "string",
    "accountName": "string"
  }
}
```

**Validation:**
- Minimum: $50 (5000 cents) / ₹500 (50000 paise)
- amount ≤ availableBalance
- Creator must be verified
- Max 1 pending withdrawal

---

## POST /gift/send

**Request:**
```json
{
  "giftId": "gift_rocket",
  "recipientId": "ObjectId",
  "quantity": 1,
  "context": {
    "type": "live | post | profile | chat",
    "roomId": "ObjectId (if live)"
  }
}
```

**Business Logic:**
1. Verify coin balance ≥ gift cost × quantity
2. Deduct coins atomically
3. Credit creator 80% of coin value
4. Emit socket event for animation
5. Create gift_transaction record

---

## POST /subscription/create

**Request:**
```json
{
  "tierId": "ObjectId",
  "paymentMethod": "stripe | razorpay",
  "currency": "USD | INR"
}
```

---

## POST /subscription/cancel

**Request:** `{ "subscriptionId": "ObjectId" }`  
**Effect:** Cancel at period end

---

## POST /post/purchase-ppv

**Request:** `{ "postId": "ObjectId" }`  
**Effect:** Deduct wallet balance, grant access, credit creator

---

## GET /subscription/my-subscriptions

Returns user's active subscriptions.

---

## GET /subscription/my-subscribers

**Auth:** Creator  
Returns creator's subscriber list with tier info.
