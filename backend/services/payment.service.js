const crypto = require('crypto');
const Razorpay = require('razorpay');
const AppError = require('../utils/AppError');
const { walletService } = require('./wallet.service');
const notificationService = require('./notification.service');

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_SECRET_KEY } = process.env;
const razorpaySecret = RAZORPAY_KEY_SECRET || RAZORPAY_SECRET_KEY;

class PaymentService {
  constructor() {
    this.razorpay = null;
    if (RAZORPAY_KEY_ID && razorpaySecret) {
      this.razorpay = new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: razorpaySecret,
      });
    }
  }

  isRazorpayConfigured() {
    return !!this.razorpay;
  }

  async createRazorpayOrder({ amount, currency, receipt, notes = {} }) {
    if (!this.isRazorpayConfigured()) {
      throw new AppError(
        'PAYMENT_PROVIDER_NOT_CONFIGURED',
        500,
        'Razorpay is not configured on the server'
      );
    }

    const order = await this.razorpay.orders.create({
      amount,
      currency,
      receipt,
      payment_capture: 1,
      notes,
    });

    return {
      gateway: 'razorpay',
      order,
      keyId: RAZORPAY_KEY_ID,
    };
  }

  async createCoinPurchaseOrder({ userId, packageId, paymentGateway, currency }) {
    if (!paymentGateway || paymentGateway.toLowerCase() !== 'razorpay') {
      throw new AppError('UNSUPPORTED_PAYMENT_GATEWAY', 400, 'Only Razorpay is supported for coin purchase');
    }

    const pkg = walletService.resolvePurchasePackage(packageId);
    if (currency !== 'INR') {
      throw new AppError('UNSUPPORTED_CURRENCY', 400, 'Only INR payments are supported for Razorpay coin purchases');
    }

    if (!this.isRazorpayConfigured()) {
      throw new AppError(
        'PAYMENT_PROVIDER_NOT_CONFIGURED',
        500,
        'Razorpay is not configured on the server. Set RAZORPAY_KEY_ID and either RAZORPAY_KEY_SECRET or RAZORPAY_SECRET_KEY in backend/.env.'
      );
    }

    const amount = Math.round(pkg.priceINR * 100);
    const receipt = `cp_${packageId}_${Date.now()}`.slice(0, 40);
    const notes = {
      purpose: 'coin_purchase',
      userId: userId.toString(),
      packageId,
    };

    return this.createRazorpayOrder({ amount, currency, receipt, notes });
  }

  verifyRazorpaySignature({ orderId, paymentId, signature }) {
    if (!this.isRazorpayConfigured()) {
      throw new AppError('PAYMENT_PROVIDER_NOT_CONFIGURED', 500, 'Razorpay is not configured on the server');
    }

    const generatedSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      throw new AppError('PAYMENT_VERIFICATION_FAILED', 400, 'Invalid Razorpay signature');
    }

    return true;
  }

  async fetchRazorpayPayment(orderId, paymentId) {
    try {
      return await this.razorpay.payments.fetch(paymentId);
    } catch (err) {
      if (err.statusCode !== 404 || !this.razorpay.orders?.fetchPayments) {
        throw err;
      }

      const payments = await this.razorpay.orders.fetchPayments(orderId);
      return payments.items?.find((item) => item.id === paymentId) || null;
    }
  }

  async verifyPayment({ gateway, orderId, paymentId, signature, sessionId }) {
    if (gateway === 'razorpay') {
      this.verifyRazorpaySignature({ orderId, paymentId, signature });
      const payment = await this.fetchRazorpayPayment(orderId, paymentId);
      if (!payment || payment.status !== 'captured') {
        throw new AppError('PAYMENT_NOT_CAPTURED', 400, 'Razorpay payment was not captured');
      }

      const { notes } = payment;
      if (!notes?.purpose || notes.purpose !== 'coin_purchase') {
        throw new AppError('INVALID_PAYMENT_NOTES', 400, 'Payment metadata is invalid or missing');
      }

      if (!notes.userId || !notes.packageId) {
        throw new AppError('INVALID_PAYMENT_NOTES', 400, 'Payment metadata must include userId and packageId');
      }

      const purchasePackage = walletService.resolvePurchasePackage(notes.packageId);
      await walletService.addCoins(
        notes.userId,
        purchasePackage.totalCoins,
        `Purchased ${notes.packageId} via Razorpay`,
        payment.amount,
        {
          currency: payment.currency || 'INR',
          paymentGateway: 'razorpay',
          gatewayTransactionId: paymentId,
        }
      );

      try {
        await notificationService.notifyAdmins({
          type: 'payment',
          title: 'Payment completed',
          body: `Coin purchase completed: ${notes.packageId}`,
          data: { targetType: 'payment', targetId: paymentId, action: 'view_payment' },
        });
      } catch (err) {
        console.warn('[PaymentService] admin notification failed:', err.message || err);
      }

      return {
        gateway: 'razorpay',
        paymentId,
        orderId,
        status: 'completed',
      };
    }

    throw new AppError('UNSUPPORTED_PAYMENT_GATEWAY', 400, 'Unsupported payment gateway');
  }

  async createPayout({ userId, amount, method = 'bank', bankDetails = null, upiId = null }) {
    // amount: rupees
    if (!this.isRazorpayConfigured()) {
      throw new AppError('PAYMENT_PROVIDER_NOT_CONFIGURED', 500, 'Razorpay is not configured on the server');
    }

    const amountCents = Math.round(Number(amount) * 100);

    // Build a minimal payout payload. In production, you'd create a beneficiary/contact first
    // and then create a payout using that beneficiary. This implementation attempts a best-effort
    // call and returns the provider response for logging.
    try {
      // Some razorpay SDK installs or accounts do not expose `payouts` on the client.
      if (!this.razorpay.payouts || typeof this.razorpay.payouts.create !== 'function') {
        throw new AppError('PAYOUT_NOT_AVAILABLE', 501, 'Razorpay payouts are not available for this account');
      }
      const payload = {
        account_number: bankDetails?.accountNumber || undefined,
        amount: amountCents,
        currency: 'INR',
        mode: method === 'upi' ? 'UPI' : 'NEFT',
        purpose: 'payout',
        narration: `Payout to user ${userId}`,
        // Razorpay expects beneficiary or vpa for UPI; include minimal fields in notes
        fund_account: bankDetails
          ? {
              account_type: 'bank_account',
              bank_account: {
                name: bankDetails.accountName || 'Recipient',
                ifsc: bankDetails.ifscCode || '',
                account_number: bankDetails.accountNumber,
              },
              contact: {
                name: bankDetails.accountName || 'Recipient',
                email: bankDetails.email || undefined,
                contact: bankDetails.phone || undefined,
              },
            }
          : undefined,
        vpa: upiId || undefined,
        reference_id: `payout_${userId}_${Date.now()}`,
      };

      // The SDK may not expose payouts for all accounts; wrap in try/catch
      const resp = await this.razorpay.payouts.create(payload);
      return resp;
    } catch (err) {
      // Normalize AppError / Error to AppError for upstream handling
      if (err instanceof AppError) throw err;
      throw new AppError('PAYOUT_FAILED', 500, err.message || 'Payout creation failed');
    }
  }
}

const paymentService = new PaymentService();
module.exports = { paymentService, PaymentService };
