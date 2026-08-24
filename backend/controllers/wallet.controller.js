const { walletService, giftService } = require('../services/wallet.service');
const { paymentService } = require('../services/payment.service');
const { success, paginated } = require('../utils/response.util');
const { getPagination } = require('../utils/pagination.util');

exports.getBalance = async (req, res, next) => {
  try {
    const data = await walletService.getBalance(req.user._id);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.getTransactions = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { items, total } = await walletService.getTransactions(req.user._id, {
      skip,
      limit,
      type: req.query.type,
    });
    paginated(res, items, page, limit, total);
  } catch (err) {
    next(err);
  }
};

exports.purchaseCoins = async (req, res, next) => {
  try {
    const { packageId, paymentMethod, currency } = req.body;
    if (!packageId) {
      throw new AppError('INVALID_REQUEST', 400, 'packageId is required');
    }

    if (paymentMethod && currency) {
      const data = await paymentService.createCoinPurchaseOrder({
        userId: req.user._id,
        packageId,
        paymentGateway: String(paymentMethod).toLowerCase(),
        currency: String(currency).toUpperCase(),
      });
      return success(res, data, 'Payment order created');
    }

    const pkg = walletService.resolvePurchasePackage(packageId);
    const wallet = await walletService.addCoins(req.user._id, pkg.totalCoins, `Purchased ${packageId}`);
    success(res, { coinBalance: wallet.coinBalance, coinsAdded: pkg.totalCoins }, 'Coins added');
  } catch (err) {
    console.error('wallet.controller.purchaseCoins error:', err);
    next(err);
  }
};

exports.getGiftCatalog = async (req, res, next) => {
  try {
    const data = await giftService.getCatalog();
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.sendGift = async (req, res, next) => {
  try {
    const data = await giftService.sendGift({
      senderId: req.user._id,
      recipientId: req.body.recipientId,
      giftId: req.body.giftId,
      quantity: req.body.quantity || 1,
      context: req.body.context || { type: 'profile' },
    });
    success(res, data, 'Gift sent', 201);
  } catch (err) {
    next(err);
  }
};

exports.getCoinPackages = async (req, res, next) => {
  success(res, walletService.getCoinPackages());
};

exports.listPaymentMethods = async (req, res, next) => {
  try {
    const BankPaymentMethod = require('../models/BankPaymentMethod.model');
    const UpiPaymentMethod = require('../models/UpiPaymentMethod.model');

    const [bankItems, upiItems] = await Promise.all([
      BankPaymentMethod.find({ userId: req.user._id }).sort({ isDefault: -1, createdAt: -1 }).lean(),
      UpiPaymentMethod.find({ userId: req.user._id }).sort({ isDefault: -1, createdAt: -1 }).lean(),
    ]);

    const items = [
      ...bankItems.map((it) => ({ ...it, type: 'bank' })),
      ...upiItems.map((it) => ({ ...it, type: 'upi' })),
    ].sort((a, b) => Number(b.isDefault || 0) - Number(a.isDefault || 0) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const seen = new Set();
    const deduped = [];
    for (const it of items) {
      let key = null;
      if (it.type === 'upi') {
        key = (it.details?.upiId || it.details?.vpa || '').toString().trim().toLowerCase();
      } else {
        const acct = (it.details?.accountNumber || '').toString().trim();
        const ifsc = (it.details?.ifscCode || '').toString().trim().toUpperCase();
        key = `${acct}|${ifsc}`;
      }
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(it);
    }

    success(res, deduped);
  } catch (err) {
    next(err);
  }
};

exports.deletePaymentMethod = async (req, res, next) => {
  try {
    const BankPaymentMethod = require('../models/BankPaymentMethod.model');
    const UpiPaymentMethod = require('../models/UpiPaymentMethod.model');

    const deletedBank = await BankPaymentMethod.deleteOne({ _id: req.params.id, userId: req.user._id });
    if (deletedBank.deletedCount > 0) {
      return success(res, {}, 'Deleted');
    }

    const deletedUpi = await UpiPaymentMethod.deleteOne({ _id: req.params.id, userId: req.user._id });
    if (deletedUpi.deletedCount > 0) {
      return success(res, {}, 'Deleted');
    }

    success(res, {}, 'Deleted');
  } catch (err) {
    next(err);
  }
};

exports.withdrawEarnings = async (req, res, next) => {
  try {
    const { amount, method, bankDetails, upiId, savePaymentMethod } = req.body;
    const normalizedMethod = method === 'bank_transfer' ? 'bank_transfer' : method === 'upi' ? 'upi' : null;
    const normalizedUpiId = (upiId || (bankDetails && (bankDetails.upiId || bankDetails.vpa)) || '').toString().trim();
    const hasBankDetails = Boolean(bankDetails && (bankDetails.accountNumber || bankDetails.ifscCode || bankDetails.accountName));
    const hasUpiDetails = Boolean(normalizedUpiId);

    // optional: save payment method for reuse — avoid duplicates, set selected as default
    if (savePaymentMethod && (normalizedMethod === 'bank_transfer' || normalizedMethod === 'upi' || hasBankDetails || hasUpiDetails)) {
      const BankPaymentMethod = require('../models/BankPaymentMethod.model');
      const UpiPaymentMethod = require('../models/UpiPaymentMethod.model');

      if (normalizedMethod === 'upi' || hasUpiDetails) {
        await UpiPaymentMethod.updateMany({ userId: req.user._id }, { $set: { isDefault: false } });
        if (normalizedUpiId) {
          let existing = await UpiPaymentMethod.findOne({ userId: req.user._id, $or: [{ 'details.upiId': normalizedUpiId }, { 'details.vpa': normalizedUpiId }] });
          if (existing) {
            existing.label = `UPI: ${normalizedUpiId}`;
            existing.details = { upiId: normalizedUpiId, vpa: normalizedUpiId };
            existing.isDefault = true;
            await existing.save();
          } else {
            await UpiPaymentMethod.create({
              userId: req.user._id,
              label: `UPI: ${normalizedUpiId}`,
              details: { upiId: normalizedUpiId, vpa: normalizedUpiId },
              isDefault: true,
            });
          }
        }
      } else {
        await BankPaymentMethod.updateMany({ userId: req.user._id }, { $set: { isDefault: false } });
        const acct = (bankDetails?.accountNumber || '').toString().trim();
        const ifsc = (bankDetails?.ifscCode || '').toString().trim().toUpperCase();
        if (acct) {
          let existing = await BankPaymentMethod.findOne({ userId: req.user._id, 'details.accountNumber': acct });
          if (!existing && acct && ifsc) {
            existing = await BankPaymentMethod.findOne({ userId: req.user._id, 'details.accountNumber': acct, 'details.ifscCode': ifsc });
          }
          if (existing) {
            existing.label = 'Bank account';
            existing.details = bankDetails;
            existing.isDefault = true;
            await existing.save();
          } else {
            await BankPaymentMethod.create({
              userId: req.user._id,
              label: 'Bank account',
              details: bankDetails,
              isDefault: true,
            });
          }
        }
      }
    }

    // Create payout via payment provider if configured (Razorpay payouts)
    let payoutResult = null;
    let payoutError = null;
    if (method === 'bank_transfer' || method === 'upi') {
      try {
        payoutResult = await paymentService.createPayout({
          userId: req.user._id,
          amount, // rupees
          method: method === 'upi' ? 'upi' : 'bank',
          bankDetails: bankDetails || null,
          upiId: upiId || null,
        });
      } catch (pErr) {
        payoutError = pErr;
        console.warn('Payout creation failed; proceeding with internal withdrawal. Error:', pErr);
      }
    }

    // finalize internal balance transfer
    const data = await walletService.withdrawEarnings(req.user._id, amount, method, bankDetails);

    // record provider response into Payout model (always create a record so we have an audit)
    if (method === 'bank_transfer' || method === 'upi') {
      const Payout = require('../models/Payout.model');
      const record = {
        userId: req.user._id,
        amount: Math.round(Number(amount) * 100),
        currency: 'INR',
        method: method === 'upi' ? 'upi' : 'bank',
        status: payoutResult ? payoutResult.status || 'processing' : 'pending',
        bankDetails: bankDetails || null,
        upiId: upiId || null,
        providerResponse: payoutResult || (payoutError ? { error: payoutError.message, code: payoutError.code || null } : null),
        referenceId: payoutResult ? payoutResult.id || payoutResult.reference_id || null : null,
      };
      try {
        const payout = await Payout.create(record);
        try {
          const notificationService = require('../services/notification.service');
          await notificationService.notifyAdmins({
            type: 'payout',
            title: 'New payout request',
            body: `A ${record.method} payout request requires review`,
            data: { targetType: 'payout', targetId: payout._id.toString(), action: 'review_payout' },
          });
        } catch (notificationError) {
          console.warn('Payout admin notification failed:', notificationError.message || notificationError);
        }
      } catch (pe) {
        console.error('Failed to create Payout record:', pe);
      }
    }

    success(res, { ...data, payout: payoutResult || null }, 'Earnings withdrawn successfully');
  } catch (err) {
    next(err);
  }
};
