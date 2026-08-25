const Wallet = require('../models/Wallet.model');
const Gift = require('../models/Gift.model');
const Creator = require('../models/Creator.model');
const LiveRoom = require('../models/LiveRoom.model');
const Transaction = require('../models/Transaction.model');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');
const notificationService = require('./notification.service');
const { DEFAULT_GIFTS } = require('../config/defaultGifts');

const COIN_VALUE_CENTS = 100; // 1 coin = 100 cents = 1 INR
const GST_RATE = 0.2; // 20% GST charged on withdrawal and purchase value
const NET_VALUE_MULTIPLIER = 1 - GST_RATE; // user receives/gets 80% of the nominal value
const CREATOR_SHARE = 1.0; // Creator receives full coin value for payouts
const COIN_PURCHASE_PACKAGES = [
  { id: 'pkg_100', coins: 100, bonusCoins: 0, priceINR: 100, isPopular: false },
  { id: 'pkg_500', coins: 500, bonusCoins: 50, priceINR: 550, isPopular: false },
  { id: 'pkg_1000', coins: 1000, bonusCoins: 100, priceINR: 1100, isPopular: true },
  { id: 'pkg_5000', coins: 5000, bonusCoins: 500, priceINR: 5500, isPopular: false },
  { id: 'pkg_10000', coins: 10000, bonusCoins: 1000, priceINR: 11000, isPopular: false },
];

class WalletService {
  async getBalance(userId) {
    const wallet = await Wallet.findOne({ userId });
    const creator = await Creator.findOne({ userId });

    return {
      coinBalance: wallet?.coinBalance || 0,
      walletBalance: (wallet?.fiatBalance || 0) / 100,
      currency: wallet?.currency || 'USD',
      pendingEarnings: (creator?.pendingBalance || 0) / 100,
      availableEarnings: (creator?.availableBalance || 0) / 100,
      totalEarned: (creator?.totalEarnings || 0) / 100,
      totalSpent: ((wallet?.totalCoinsSpent || 0) * COIN_VALUE_CENTS) / 100,
    };
  }

  async getTransactions(userId, { skip, limit, type }) {
    const filter = { userId };
    if (type && type !== 'all') filter.type = type;

    const [items, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(filter),
    ]);

    return { items, total };
  }

  getCoinPackages() {
    return COIN_PURCHASE_PACKAGES.map(({ id, coins, bonusCoins, priceINR, isPopular }) => ({
      id,
      coins,
      bonusCoins,
      priceINR,
      isPopular,
      currency: 'INR',
    }));
  }

  resolvePurchasePackage(packageId) {
    const pkg = COIN_PURCHASE_PACKAGES.find((item) => item.id === packageId);
    if (!pkg) {
      const fallback = packageId === 'pkg_50' ? 50 : null;
      if (fallback !== null && fallback < 100) {
        throw new AppError('MINIMUM_PURCHASE', 400, 'Minimum purchase is 100 coins');
      }
      throw new AppError('INVALID_PACKAGE', 400, 'Invalid coin package');
    }

    const totalCoins = pkg.coins + (pkg.bonusCoins || 0);
    if (totalCoins < 100) {
      throw new AppError('MINIMUM_PURCHASE', 400, 'Minimum purchase is 100 coins');
    }

    return { ...pkg, totalCoins, currency: 'INR' };
  }

  async addCoins(userId, coins, description = 'Coin purchase', amount = 0) {
    if (coins < 100) {
      throw new AppError('MINIMUM_PURCHASE', 400, 'Minimum purchase is 100 coins');
    }

    const netCoins = Math.floor(coins * NET_VALUE_MULTIPLIER);

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) throw new AppError('NOT_FOUND', 404, 'Wallet not found');

    wallet.coinBalance += netCoins;
    wallet.totalCoinsPurchased += netCoins;
    await wallet.save();

    await Transaction.create({
      userId,
      type: 'coin_purchase',
      amount,
      coinAmount: netCoins,
      status: 'completed',
      description: `${description} (20% GST applied, net coins credited: ${netCoins})`,
    });

    return wallet;
  }

  async withdrawEarnings(userId, amount = null, method = 'bank_transfer', bankDetails = {}) {
    const creator = await Creator.findOne({ userId });
    if (!creator) {
      throw new AppError('CREATOR_NOT_FOUND', 404, 'Creator profile not found');
    }

    const availableBalanceCents = creator.availableBalance || 0;
    if (availableBalanceCents <= 0) {
      throw new AppError('NO_AVAILABLE_BALANCE', 400, 'No earnings available to withdraw');
    }

    const requestedAmountCents = amount == null ? availableBalanceCents : Math.round(Number(amount) * 100);
    if (Number.isNaN(requestedAmountCents) || requestedAmountCents <= 0) {
      throw new AppError('INVALID_AMOUNT', 400, 'Withdrawal amount must be greater than 0');
    }

    if (requestedAmountCents > availableBalanceCents) {
      throw new AppError('INSUFFICIENT_BALANCE', 400, 'Withdrawal amount exceeds available balance');
    }

    const gstCents = Math.round(requestedAmountCents * GST_RATE);
    const netPayoutCents = requestedAmountCents - gstCents;

    const wallet = await Wallet.findOneAndUpdate(
      { userId },
      {
        $inc: { fiatBalance: netPayoutCents, totalFiatWithdrawn: netPayoutCents },
        $set: { currency: 'INR' },
      },
      { new: true, upsert: true }
    );

    await Creator.findOneAndUpdate(
      { userId },
      {
        $inc: { availableBalance: -requestedAmountCents, totalWithdrawn: requestedAmountCents },
      },
      { upsert: true }
    );

    await Transaction.create({
      userId,
      type: 'withdrawal',
      amount: requestedAmountCents,
      currency: 'INR',
      status: 'completed',
      description: `Creator earnings withdrawn via ${method} (GST 20%, net payout ₹${(netPayoutCents / 100).toFixed(2)})`,
      metadata: { method, bankDetails, gstPercent: 20, grossAmount: requestedAmountCents / 100, netAmount: netPayoutCents / 100 },
    });

    return {
      amount: netPayoutCents / 100,
      walletBalance: (wallet?.fiatBalance || netPayoutCents) / 100,
      gstAmount: gstCents / 100,
      grossAmount: requestedAmountCents / 100,
    };
  }
}

class GiftService {
  async ensureDefaultGifts() {
    const ops = DEFAULT_GIFTS.map((gift) => ({
      updateOne: {
        filter: { giftId: gift.giftId },
        update: { $set: { ...gift, isActive: true } },
        upsert: true,
      },
    }));
    await Gift.bulkWrite(ops, { ordered: false });
  }

  async getCatalog() {
    await this.ensureDefaultGifts();

    const gifts = await Gift.find({ isActive: true }).sort({ sortOrder: 1, coinCost: 1 });
    const categories = [...new Set(gifts.map((g) => g.category))];
    return { categories, gifts };
  }

  async sendGift({ senderId, recipientId, giftId, quantity, context }) {
    const gift = await Gift.findOne({ giftId, isActive: true });
    if (!gift) throw new AppError('GIFT_NOT_FOUND', 404, 'Gift not found');

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      throw new AppError('RECIPIENT_NOT_FOUND', 404, 'Recipient not found');
    }

    const totalCost = gift.coinCost * quantity;
    const creatorEarningsCents = Math.floor(totalCost * COIN_VALUE_CENTS * CREATOR_SHARE);
    const platformFeeCents = Math.floor(totalCost * COIN_VALUE_CENTS * (1 - CREATOR_SHARE));

    // Standalone MongoDB (local dev) does not support transactions — use atomic updates instead.
    let wallet = null;

    try {
      wallet = await Wallet.findOneAndUpdate(
        { userId: senderId, coinBalance: { $gte: totalCost } },
        { $inc: { coinBalance: -totalCost, totalCoinsSpent: totalCost } },
        { new: true }
      );

      if (!wallet) {
        throw new AppError('INSUFFICIENT_COINS', 400, 'Not enough coins');
      }

      // Add coins to recipient's wallet
      await Wallet.findOneAndUpdate(
        { userId: recipientId },
        {
          $inc: {
            coinBalance: totalCost,
          },
        },
        { upsert: true }
      );

      // Only update Creator earnings if recipient is a creator
      if (recipient?.isCreator || recipient?.role === 'creator') {
        await Creator.findOneAndUpdate(
          { userId: recipientId },
          {
            $inc: {
              availableBalance: creatorEarningsCents,
              totalEarnings: creatorEarningsCents,
              'stats.totalGiftsReceived': quantity,
            },
          },
          { upsert: true }
        );
      }

      if (context?.type === 'live' && context?.roomId) {
        await LiveRoom.findByIdAndUpdate(context.roomId, {
          $inc: {
            'stats.totalGifts': quantity,
            'stats.totalGiftCoins': totalCost,
          },
        });
      }

      const tx = await Transaction.create({
        userId: senderId,
        type: 'gift_sent',
        coinAmount: totalCost,
        amount: creatorEarningsCents,
        status: 'completed',
        description: `Sent ${quantity}x ${gift.name} to @${recipient.username}`,
        metadata: {
          giftId: gift.giftId,
          recipientId,
          platformFee: platformFeeCents,
          creatorEarnings: creatorEarningsCents,
          context,
        },
      });

      const sender = await User.findById(senderId).select('username displayName avatar');

      if (recipientId.toString() !== senderId.toString()) {
        try {
          await notificationService.create({
            userId: recipientId,
            type: 'gift',
            title: 'You received a gift!',
            body: `${sender?.displayName || sender?.username || 'Someone'} sent you ${quantity}x ${gift.name}`,
            data: {
              targetType: 'gift',
              targetId: tx._id,
              actorUsername: sender?.username,
              giftName: gift.name,
            },
            sendPush: true,
          });
        } catch (err) {
          console.warn('[GiftService] gift notification failed:', err.message || err);
        }
      }

      if (context?.type === 'live' && context?.roomId) {
        try {
          const { getIO } = require('../sockets');
          const io = getIO();
          if (io) {
            io.to(`live:${context.roomId}`).emit('live:gift', {
              roomId: context.roomId,
              senderId: senderId.toString(),
              senderName: sender?.displayName || sender?.username || 'Viewer',
              senderAvatar: sender?.avatar || null,
              giftId: gift.giftId,
              giftName: gift.name,
              giftEmoji: gift.emoji || '🎁',
              coinCost: gift.coinCost,
              quantity,
              totalCoins: totalCost,
              sentAt: new Date().toISOString(),
            });
          }
        } catch {
          // Socket emit is best-effort; gift already persisted.
        }
      }

      return {
        transactionId: tx._id,
        giftName: gift.name,
        coinCost: gift.coinCost,
        quantity,
        totalCost,
        remainingBalance: wallet.coinBalance,
        creatorEarnings: creatorEarningsCents / 100,
      };
    } catch (err) {
      if (wallet) {
        await Wallet.findOneAndUpdate(
          { userId: senderId },
          { $inc: { coinBalance: totalCost, totalCoinsSpent: -totalCost } }
        );
      }
      throw err;
    }
  }
}

module.exports = { walletService: new WalletService(), giftService: new GiftService() };
