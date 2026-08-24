const mongoose = require('mongoose');
const Follower = require('../models/Follower.model');
const Creator = require('../models/Creator.model');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');
const notificationService = require('./notification.service');

class FollowService {
  async follow(followerId, followingId) {
    if (followerId.toString() === followingId.toString()) {
      throw new AppError('VALIDATION_ERROR', 400, 'Cannot follow yourself');
    }

    const target = await User.findById(followingId);
    if (!target || target.isDeleted) throw new AppError('NOT_FOUND', 404, 'User not found');

    const follower = await User.findById(followerId).select('username displayName');
    const existing = await Follower.findOne({ followerId, followingId });
    if (existing) return { following: true };

    await Follower.create({ followerId, followingId });

    const creator = await Creator.findOne({ userId: followingId });
    if (creator) {
      creator.stats.followersCount += 1;
      await creator.save();
    }

    await notificationService.create({
      userId: followingId,
      type: 'follow',
      title: 'New follower',
      body: `${follower?.displayName || follower?.username || 'Someone'} started following you`,
      data: { targetType: 'user', targetId: followerId, actorUsername: follower?.username },
      sendPush: true,
    });

    return { following: true };
  }

  async unfollow(followerId, followingId) {
    const deleted = await Follower.findOneAndDelete({ followerId, followingId });
    if (deleted) {
      const creator = await Creator.findOne({ userId: followingId });
      if (creator && creator.stats.followersCount > 0) {
        creator.stats.followersCount -= 1;
        await creator.save();
      }
    }
    return { following: false };
  }

  async getRelationshipList(targetUserId, viewerId, type, { page = 1, limit = 20, skip = 0 } = {}) {
    const relationField = type === 'followers' ? 'followerId' : 'followingId';
    const filter = type === 'followers' ? { followingId: targetUserId } : { followerId: targetUserId };

    const [items, total] = await Promise.all([
      Follower.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(relationField, 'username displayName avatar bio isVerified isCreator'),
      Follower.countDocuments(filter),
    ]);

    const users = items
      .map((item) => item[relationField])
      .filter(Boolean)
      .map((user) => ({
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar,
        bio: user.bio,
        isVerified: !!user.isVerified,
        isCreator: !!user.isCreator,
      }));

    let followedSet = new Set();
    if (viewerId) {
      const relationships = await Follower.find({
        followerId: viewerId,
        followingId: { $in: users.map((user) => user.id) },
      }).select('followingId');
      followedSet = new Set(relationships.map((rel) => rel.followingId.toString()));
    }

    return {
      items: users.map((user) => ({ ...user, isFollowing: followedSet.has(user.id) })),
      page,
      limit,
      total,
      hasMore: skip + users.length < total,
    };
  }
}

class CreatorService {
  async getByUsername(username, viewerId) {
    const user = await User.findOne({ username: username.toLowerCase(), isDeleted: false });
    if (!user) throw new AppError('NOT_FOUND', 404, 'Creator not found');

    const [creator, followersCount, followingCount, isFollowing] = await Promise.all([
      Creator.findOne({ userId: user._id }),
      Follower.countDocuments({ followingId: user._id }),
      Follower.countDocuments({ followerId: user._id }),
      viewerId
        ? Follower.exists({ followerId: viewerId, followingId: user._id })
        : false,
    ]);

    return {
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      banner: user.banner,
      bio: user.bio,
      isVerified: user.isVerified,
      isCreator: user.isCreator,
      isLive: creator?.isLive || false,
      liveRoomId: creator?.currentLiveRoomId ? creator.currentLiveRoomId.toString() : null,
      stats: {
        followersCount,
        followingCount,
        postsCount: creator?.stats.postsCount || 0,
        subscribersCount: creator?.stats.subscribersCount || 0,
      },
      isFollowing: !!isFollowing,
    };
  }

  async applyCreator(userId, data) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');
    if (user.isCreator) throw new AppError('VALIDATION_ERROR', 400, 'Already a creator');

    await Creator.findOneAndUpdate(
      { userId },
      {
        userId,
        categories: data.categories || [],
        verificationStatus: 'pending',
      },
      { upsert: true, new: true }
    );

    user.isCreator = true;
    user.role = 'creator';
    if (data.displayName) user.displayName = data.displayName;
    if (data.bio) user.bio = data.bio;
    await user.save();

    return { status: 'pending', message: 'Creator application submitted' };
  }
}

module.exports = { followService: new FollowService(), creatorService: new CreatorService() };
