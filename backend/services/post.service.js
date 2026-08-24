const Post = require('../models/Post.model');
const Like = require('../models/Like.model');
const Follower = require('../models/Follower.model');
const Creator = require('../models/Creator.model');
const Wallet = require('../models/Wallet.model');
const PpvPurchase = require('../models/PpvPurchase.model');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');
const notificationService = require('./notification.service');

class PostService {
  async createPost(userId, data) {
    let creatorId = null;
    const creator = await Creator.findOne({ userId });
    if (creator) creatorId = creator._id;

    const hashtags = (data.caption?.match(/#\w+/g) || []).map((t) => t.slice(1).toLowerCase());

    const post = await Post.create({
      userId,
      creatorId,
      type: data.type,
      media: data.media || [],
      caption: data.caption,
      visibility: data.visibility || 'public',
      isPPV: data.isPPV || false,
      ppvPrice: data.ppvPrice,
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
    if (viewerId) {
      userHasLiked = !!(await Like.findOne({ userId: viewerId, targetType: 'post', targetId: post._id }));
      if (post.isPPV) {
        hasPurchased = !!(await PpvPurchase.findOne({ userId: viewerId, postId: post._id }));
      }
    }

    const isOwner = viewerId && post.userId._id.toString() === viewerId.toString();
    const isLocked = post.isPPV && !hasPurchased && !isOwner;

    return {
      id: post._id.toString(),
      type: post.type,
      media: isLocked ? [] : post.media,
      caption: isLocked ? 'Unlock this post to view content' : post.caption,
      visibility: post.visibility,
      isPPV: post.isPPV,
      ppvPrice: post.ppvPrice,
      isLocked,
      hasPurchased: hasPurchased || isOwner,
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
