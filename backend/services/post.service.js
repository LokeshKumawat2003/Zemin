const Post = require('../models/Post.model');
const Like = require('../models/Like.model');
const Follower = require('../models/Follower.model');
const Creator = require('../models/Creator.model');
const Wallet = require('../models/Wallet.model');
const PpvPurchase = require('../models/PpvPurchase.model');
const Subscription = require('../models/Subscription.model');
const User = require('../models/User.model');
const Gift = require('../models/Gift.model');
const AppError = require('../utils/AppError');
const notificationService = require('./notification.service');
const { giftService } = require('./wallet.service');

class PostService {
  async createPost(userId, data) {
    let creatorId = null;
    const creator = await Creator.findOne({ userId });
    if (creator) creatorId = creator._id;

    const hashtags = (data.caption?.match(/#\w+/g) || []).map((t) => t.slice(1).toLowerCase());
    const isPPV = data.isPPV || data.visibility === 'ppv';
    const unlockGiftId = data.unlockGiftId;

    if (isPPV && !unlockGiftId) {
      throw new AppError('VALIDATION_ERROR', 400, 'Choose a gift to unlock this post');
    }
    if (isPPV) {
      await giftService.ensureDefaultGifts();
      const gift = await Gift.findOne({ giftId: unlockGiftId, isActive: true });
      if (!gift) throw new AppError('GIFT_NOT_FOUND', 404, 'Unlock gift not found');
    }

    const post = await Post.create({
      userId,
      creatorId,
      type: data.type,
      media: data.media || [],
      caption: data.caption,
      visibility: data.visibility || 'public',
      isPPV,
      ppvPrice: data.ppvPrice,
      unlockGiftId,
      tags: data.tags || [],
      hashtags,
      publishedAt: new Date(),
    });

    if (creator) {
      creator.stats.postsCount += 1;
      await creator.save();
    }

    return post;
  }

  async getPost(postId, viewerId) {
    const post = await Post.findById(postId).populate('userId', 'username displayName avatar isVerified isCreator');
    if (!post || post.isDeleted) throw new AppError('NOT_FOUND', 404, 'Post not found');

    let userHasLiked = false;
    let hasPurchased = false;
    let unlockGift = null;
    let hasSubscriptionAccess = false;
    const requiresSubscription = post.visibility === 'subscribers';
    if (viewerId) {
      userHasLiked = !!(await Like.findOne({ userId: viewerId, targetType: 'post', targetId: post._id }));
      if (post.isPPV) {
        hasPurchased = !!(await PpvPurchase.findOne({ userId: viewerId, postId: post._id }));
      }
      if (post.isPPV || requiresSubscription) {
        const subscription = await Subscription.findOne({
          subscriberId: viewerId,
          creatorUserId: post.userId._id,
          status: 'active',
          currentPeriodEnd: { $gt: new Date() },
        }).populate('tierId', 'unlockAllPosts');
        hasSubscriptionAccess = Boolean(subscription && (requiresSubscription || subscription.tierId?.unlockAllPosts));
        hasPurchased = hasPurchased || hasSubscriptionAccess;
      }
    }
    if (post.isPPV && post.unlockGiftId) {
      await giftService.ensureDefaultGifts();
      unlockGift = await Gift.findOne({ giftId: post.unlockGiftId, isActive: true }).lean();
    }

    const isOwner = viewerId && post.userId._id.toString() === viewerId.toString();
    const isLocked = (post.isPPV || requiresSubscription) && !hasPurchased && !isOwner;

    return {
      id: post._id.toString(),
      type: post.type,
      media: isLocked ? [] : post.media,
      caption: isLocked ? 'Unlock this post to view content' : post.caption,
      visibility: post.visibility,
      isPPV: post.isPPV,
      ppvPrice: post.ppvPrice,
      unlockGift: unlockGift
        ? { giftId: unlockGift.giftId, name: unlockGift.name, emoji: unlockGift.emoji, coinCost: unlockGift.coinCost }
        : null,
      isLocked,
      hasPurchased: hasPurchased || isOwner,
      hasSubscriptionAccess,
      stats: post.stats,
      creator: {
        id: post.userId._id.toString(),
        username: post.userId.username,
        displayName: post.userId.displayName,
        avatar: post.userId.avatar,
        isVerified: post.userId.isVerified,
        isCreator: post.userId.isCreator,
      },
      userHasLiked,
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
    };
  }

  async purchasePpv(userId, postId) {
    const post = await Post.findById(postId);
    if (!post || post.isDeleted) throw new AppError('NOT_FOUND', 404, 'Post not found');
    if (!post.isPPV) throw new AppError('VALIDATION_ERROR', 400, 'Post is not pay-per-view');

    const subscription = await Subscription.findOne({
      subscriberId: userId,
      creatorUserId: post.userId,
      status: 'active',
      currentPeriodEnd: { $gt: new Date() },
    }).populate('tierId', 'unlockAllPosts');
    if (subscription?.tierId?.unlockAllPosts) {
      post.stats.viewsCount += 1;
      await post.save();
      return { purchased: true, postId: post._id.toString(), hasSubscriptionAccess: true };
    }

    if (post.unlockGiftId) return this.unlockWithGift(userId, post);

    const existing = await PpvPurchase.findOne({ userId, postId });
    if (existing) {
      post.stats.viewsCount += 1;
      await post.save();
      return { purchased: true, postId: post._id.toString(), coinCost: existing.coinCost || post.ppvPrice || 100 };
    }

    const coinCost = post.ppvPrice || 100;
    const wallet = await Wallet.findOne({ userId });
    if (!wallet || wallet.coinBalance < coinCost) {
      throw new AppError('INSUFFICIENT_COINS', 400, 'Not enough coins to unlock this post');
    }

    wallet.coinBalance -= coinCost;
    wallet.totalCoinsSpent += coinCost;
    await wallet.save();

    await PpvPurchase.create({ userId, postId, coinCost });

    const { COIN_VALUE_CENTS, CREATOR_SHARE } = require('./wallet.service') || {};
    const coinValue = typeof COIN_VALUE_CENTS === 'number' ? COIN_VALUE_CENTS : 100;
    const creatorShare = typeof CREATOR_SHARE === 'number' ? CREATOR_SHARE : 1.0;
    const creatorEarningsCents = Math.floor(coinCost * coinValue * creatorShare);
    await Creator.findOneAndUpdate(
      { userId: post.userId },
      { $inc: { availableBalance: creatorEarningsCents, totalEarnings: creatorEarningsCents } },
      { upsert: true }
    );

    post.stats.viewsCount += 1;
    await post.save();

    return { purchased: true, postId: post._id.toString(), coinCost, remainingBalance: wallet.coinBalance };
  }

  async getCreatorPosts(userId, creatorUserId, { skip, limit }) {
    const posts = await Post.find({
      userId: creatorUserId,
      isDeleted: false,
      visibility: { $in: ['public', 'ppv', 'subscribers'] },
    })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const ppvPosts = posts.filter((post) => post.isPPV);
    const purchases = userId && ppvPosts.length
      ? await PpvPurchase.find({ userId, postId: { $in: ppvPosts.map((post) => post._id) } }).select('postId').lean()
      : [];
    const purchasedIds = new Set(purchases.map((purchase) => purchase.postId.toString()));
    const subscription = userId
      ? await Subscription.findOne({
          subscriberId: userId,
          creatorUserId,
          status: 'active',
          currentPeriodEnd: { $gt: new Date() },
        }).populate('tierId', 'unlockAllPosts')
      : null;
    const hasSubscriptionAccess = Boolean(
      subscription && posts.some((post) => post.visibility === 'subscribers')
    );
    const giftIds = ppvPosts.map((post) => post.unlockGiftId).filter(Boolean);
    const gifts = giftIds.length
      ? await Gift.find({ giftId: { $in: giftIds }, isActive: true }).lean()
      : [];
    const giftMap = new Map(gifts.map((gift) => [gift.giftId, gift]));

    return posts.map((post) => {
      const isOwner = userId && post.userId.toString() === userId.toString();
      const hasPurchased = purchasedIds.has(post._id.toString()) ||
        (post.visibility === 'subscribers' && hasSubscriptionAccess) ||
        (post.isPPV && Boolean(subscription?.tierId?.unlockAllPosts));
      const isLocked = (post.isPPV || post.visibility === 'subscribers') && !isOwner && !hasPurchased;
      const gift = post.unlockGiftId ? giftMap.get(post.unlockGiftId) : null;

      return {
        ...post,
        id: post._id.toString(),
        media: isLocked ? [] : post.media,
        caption: isLocked ? 'Unlock this post to view content' : post.caption,
        isLocked,
        hasPurchased: hasPurchased || Boolean(isOwner),
        hasSubscriptionAccess,
        unlockGift: gift
          ? { giftId: gift.giftId, name: gift.name, emoji: gift.emoji, coinCost: gift.coinCost }
          : null,
      };
    });
  }

  async unlockWithGift(userId, post) {
    const existing = await PpvPurchase.findOne({ userId, postId: post._id });
    if (existing) return { purchased: true, postId: post._id.toString(), giftId: post.unlockGiftId };
    if (post.userId.toString() === userId.toString()) {
      throw new AppError('VALIDATION_ERROR', 400, 'You cannot unlock your own post');
    }

    await giftService.ensureDefaultGifts();
    const gift = await Gift.findOne({ giftId: post.unlockGiftId, isActive: true });
    if (!gift) throw new AppError('GIFT_NOT_FOUND', 404, 'Unlock gift not found');

    const giftResult = await giftService.sendGift({
      senderId: userId,
      recipientId: post.userId,
      giftId: gift.giftId,
      quantity: 1,
      context: { type: 'post', postId: post._id.toString() },
    });
    await PpvPurchase.create({ userId, postId: post._id, coinCost: giftResult.totalCost });
    post.stats.viewsCount += 1;
    await post.save();

    return {
      purchased: true,
      postId: post._id.toString(),
      giftId: gift.giftId,
      giftName: gift.name,
      coinCost: giftResult.totalCost,
      remainingBalance: giftResult.remainingBalance,
    };
  }

  async likePost(userId, postId) {
    const post = await Post.findById(postId);
    if (!post || post.isDeleted) throw new AppError('NOT_FOUND', 404, 'Post not found');

    const existing = await Like.findOne({ userId, targetType: 'post', targetId: postId });
    if (existing) return { liked: true };

    await Like.create({ userId, targetType: 'post', targetId: postId });
    post.stats.likesCount += 1;
    await post.save();

    if (post.userId.toString() !== userId.toString()) {
      const actor = await User.findById(userId).select('username displayName');
      try {
        await notificationService.create({
          userId: post.userId,
          type: 'like',
          title: 'New like',
          body: `${actor?.displayName || actor?.username || 'Someone'} liked your post`,
          data: {
            targetType: 'post',
            targetId: postId,
            actorUsername: actor?.username,
          },
          sendPush: true,
        });
      } catch (err) {
        console.warn('[PostService] like notification failed:', err.message || err);
      }
    }

    return { liked: true, likesCount: post.stats.likesCount };
  }

  async unlikePost(userId, postId) {
    const deleted = await Like.findOneAndDelete({ userId, targetType: 'post', targetId: postId });
    if (deleted) {
      await Post.findByIdAndUpdate(postId, { $inc: { 'stats.likesCount': -1 } });
    }
    return { liked: false };
  }
}

class FeedService {
  async getFollowingFeed(userId, { skip, limit }) {
    const following = await Follower.find({ followerId: userId }).select('followingId');
    const ids = following.map((f) => f.followingId);
    ids.push(userId);

    const [posts, total] = await Promise.all([
      Post.find({ userId: { $in: ids }, isDeleted: false, visibility: 'public' })
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username displayName avatar isVerified'),
      Post.countDocuments({ userId: { $in: ids }, isDeleted: false, visibility: 'public' }),
    ]);

    return { posts: posts.map(formatFeedPost), total };
  }

  async getForYouFeed({ skip, limit }) {
    const [posts, total] = await Promise.all([
      Post.find({ isDeleted: false, visibility: 'public' })
        .sort({ 'stats.likesCount': -1, publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username displayName avatar isVerified'),
      Post.countDocuments({ isDeleted: false, visibility: 'public' }),
    ]);

    return { posts: posts.map(formatFeedPost), total };
  }
}

const formatFeedPost = (post) => ({
  id: post._id.toString(),
  type: post.type,
  media: post.isPPV ? [] : post.media,
  caption: post.caption,
  isPPV: post.isPPV,
  ppvPrice: post.ppvPrice,
  stats: post.stats,
  creator: {
    id: post.userId._id.toString(),
    username: post.userId.username,
    displayName: post.userId.displayName,
    avatar: post.userId.avatar,
    isVerified: post.userId.isVerified,
  },
  publishedAt: post.publishedAt,
});

module.exports = { postService: new PostService(), feedService: new FeedService() };
