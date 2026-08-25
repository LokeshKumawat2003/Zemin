const Creator = require('../models/Creator.model');
const SubscriptionTier = require('../models/SubscriptionTier.model');
const Subscription = require('../models/Subscription.model');
const Wallet = require('../models/Wallet.model');
const AppError = require('../utils/AppError');
const notificationService = require('./notification.service');
const { getAuthModels } = require('../config/database');

class UserService {
  async updateProfile(userId, data) {
    const { User: AuthUser } = getAuthModels();
    const user = await AuthUser.findById(userId);
    if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');

    if (data.displayName !== undefined) user.displayName = data.displayName;
    if (data.bio !== undefined) user.bio = data.bio;
    if (data.socialLinks) user.socialLinks = { ...user.socialLinks, ...data.socialLinks };
    await user.save();

    return user.toPublicJSON();
  }

  async getSettings(userId) {
    const { User: AuthUser } = getAuthModels();
    const user = await AuthUser.findById(userId).select('settings');
    return user?.settings || {};
  }

  async registerPushToken(userId, token) {
    if (!token) {
      throw new AppError('VALIDATION_ERROR', 400, 'Push token is required');
    }
    const { User: AuthUser } = getAuthModels();
    const user = await AuthUser.findById(userId);
    if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');

    user.fcmTokens = user.fcmTokens || [];
    if (!user.fcmTokens.includes(token)) {
      user.fcmTokens.push(token);
    }
    await user.save();
    return { registered: true };
  }

  async updateSettings(userId, settings) {
    const { User: AuthUser } = getAuthModels();
    const user = await AuthUser.findById(userId);
    if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');

    user.settings = {
      ...user.settings,
      ...settings,
      notifications: { ...user.settings?.notifications, ...settings.notifications },
      privacy: { ...user.settings?.privacy, ...settings.privacy },
    };
    await user.save();
    return user.settings;
  }
}

class SubscriptionService {
  async getTiers(creatorUserId) {
    const creator = await Creator.findOne({ userId: creatorUserId });
    if (!creator) throw new AppError('NOT_FOUND', 404, 'Creator not found');

    const tiers = await SubscriptionTier.find({ creatorId: creator._id, isActive: true }).sort({
      sortOrder: 1,
      price: 1,
    });

    return tiers.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      price: t.price / 100,
      currency: t.currency,
      description: t.description,
      benefits: t.benefits,
      badge: t.badge,
    }));
  }

  async createTier(userId, data) {
    const creator = await Creator.findOne({ userId });
    if (!creator) throw new AppError('FORBIDDEN', 403, 'Creator account required');

    const tier = await SubscriptionTier.create({
      creatorId: creator._id,
      userId,
      name: data.name,
      price: Math.round(data.price * 100),
      currency: data.currency || 'USD',
      description: data.description,
      benefits: data.benefits || [],
      badge: data.badge,
      sortOrder: data.sortOrder || 0,
    });

    return { id: tier._id.toString(), name: tier.name, price: tier.price / 100 };
  }

  async subscribe(subscriberId, tierId) {
    const tier = await SubscriptionTier.findById(tierId);
    if (!tier || !tier.isActive) throw new AppError('NOT_FOUND', 404, 'Tier not found');

    const wallet = await Wallet.findOne({ userId: subscriberId });
    if (!wallet || wallet.fiatBalance < tier.price) {
      throw new AppError('INSUFFICIENT_BALANCE', 400, 'Not enough wallet balance');
    }

    const existing = await Subscription.findOne({
      subscriberId,
      creatorUserId: tier.userId,
      status: 'active',
    });
    if (existing) throw new AppError('VALIDATION_ERROR', 400, 'Already subscribed');

    wallet.fiatBalance -= tier.price;
    await wallet.save();

    const creator = await Creator.findById(tier.creatorId);
    const creatorEarnings = Math.floor(tier.price * 0.8);
    creator.availableBalance += creatorEarnings;
    creator.totalEarnings += creatorEarnings;
    creator.stats.subscribersCount += 1;
    await creator.save();

    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);

    const sub = await Subscription.create({
      subscriberId,
      creatorId: tier.creatorId,
      creatorUserId: tier.userId,
      tierId: tier._id,
      status: 'active',
      price: tier.price,
      currency: tier.currency,
      currentPeriodStart: now,
      currentPeriodEnd: end,
    });

    await notificationService.create({
      userId: tier.userId,
      type: 'subscription',
      title: 'New Subscriber!',
      body: 'Someone subscribed to your tier',
      data: { targetType: 'subscription', targetId: sub._id },
    });

    return {
      subscriptionId: sub._id.toString(),
      tierName: tier.name,
      expiresAt: end,
    };
  }

  async cancel(subscriberId, subscriptionId) {
    const sub = await Subscription.findOne({ _id: subscriptionId, subscriberId, status: 'active' });
    if (!sub) throw new AppError('NOT_FOUND', 404, 'Subscription not found');

    sub.status = 'cancelled';
    sub.cancelledAt = new Date();
    await sub.save();

    const creator = await Creator.findById(sub.creatorId);
    if (creator && creator.stats.subscribersCount > 0) {
      creator.stats.subscribersCount -= 1;
      await creator.save();
    }

    return { cancelled: true, endsAt: sub.currentPeriodEnd };
  }

  async mySubscriptions(subscriberId) {
    const subs = await Subscription.find({ subscriberId, status: 'active' })
      .populate('tierId')
      .populate('creatorUserId', 'username displayName avatar');

    return subs.map((s) => ({
      id: s._id.toString(),
      tierName: s.tierId?.name,
      creator: {
        username: s.creatorUserId?.username,
        displayName: s.creatorUserId?.displayName,
        avatar: s.creatorUserId?.avatar,
      },
      price: s.price / 100,
      expiresAt: s.currentPeriodEnd,
    }));
  }
}

module.exports = { userService: new UserService(), subscriptionService: new SubscriptionService() };
