const User = require('../models/User.model');
const Report = require('../models/Report.model');
const Post = require('../models/Post.model');
const Comment = require('../models/Comment.model');
const LiveRoom = require('../models/LiveRoom.model');
const Notification = require('../models/Notification.model');
const Transaction = require('../models/Transaction.model');
const Payout = require('../models/Payout.model');
const Conversation = require('../models/Conversation.model');
const Message = require('../models/Message.model');
const Creator = require('../models/Creator.model');
const BankPaymentMethod = require('../models/BankPaymentMethod.model');
const UpiPaymentMethod = require('../models/UpiPaymentMethod.model');
const AppError = require('../utils/AppError');

const getAnalyticsRange = ({ from, to } = {}) => {
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - 24 * 60 * 60 * 1000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    throw new AppError('VALIDATION_ERROR', 400, 'Invalid analytics date range');
  }
  return { start, end, dateFilter: { $gte: start, $lte: end } };
};

// Admin action log model - we'll create a simple log collection
const adminActionSchema = new (require('mongoose')).Schema({
  adminId: { type: require('mongoose').Schema.Types.ObjectId, ref: 'User', required: true },
  action: String,
  targetType: String,
  targetId: String,
  reason: String,
  details: require('mongoose').Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});

const AdminAction = require('mongoose').model('AdminAction', adminActionSchema);

class AdminService {
  // ==== Notification Management ====
  async getAllNotifications({ skip, limit, search, type, isRead }) {
    const { User: AuthUser } = require('../config/database').getAuthModels();
    const adminUsers = await AuthUser.find({ role: 'admin', isDeleted: false }).select('_id username email displayName role').lean();
    const adminIds = adminUsers.map((admin) => admin._id);
    const filter = { userId: { $in: adminIds } };
    if (type) filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matchingUsers = await User.find({
        $or: [
          { username: { $regex: escapedSearch, $options: 'i' } },
          { email: { $regex: escapedSearch, $options: 'i' } },
          { displayName: { $regex: escapedSearch, $options: 'i' } },
        ],
      }).select('_id').lean();
      const matchingAdmins = adminUsers.filter((admin) =>
        [admin.username, admin.email, admin.displayName].some((value) =>
          value && value.toLowerCase().includes(search.toLowerCase())
        )
      );
      filter.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { body: { $regex: escapedSearch, $options: 'i' } },
        { userId: { $in: [...matchingUsers, ...matchingAdmins].map((user) => user._id) } },
      ];
    }
    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
    ]);
    const notificationUserIds = notifications.map((notification) => notification.userId).filter(Boolean);
    const [mainUsers, authUsers] = await Promise.all([
      User.find({ _id: { $in: notificationUserIds } }).select('username email displayName role').lean(),
      AuthUser.find({ _id: { $in: notificationUserIds } }).select('username email displayName role').lean(),
    ]);
    const usersById = new Map([...mainUsers, ...authUsers].map((user) => [user._id.toString(), user]));
    return [notifications.map((notification) => ({
      ...notification,
      userId: usersById.get(notification.userId.toString()) || notification.userId,
    })), total];
  }

  async getNotificationDetails(notificationId) {
    const notification = await Notification.findById(notificationId)
      .populate('userId', 'username email displayName role phone')
      .lean();
    if (!notification) throw new AppError('NOT_FOUND', 404, 'Notification not found');
    return notification;
  }

  async getUnreadNotificationCount(userId) {
    return { count: await Notification.countDocuments({ userId, isRead: false }) };
  }

  async markNotificationRead(userId, notificationId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { isRead: true } },
      { new: true }
    ).lean();
    if (!notification) throw new AppError('NOT_FOUND', 404, 'Notification not found');
    return { read: true, id: notification._id.toString() };
  }

  async markAllNotificationsRead(userId) {
    const result = await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
    return { read: true, updated: result.modifiedCount };
  }

  async sendNotification({ userId, type = 'system', title, body, data, sendPush = false, dedupeKey, adminId }) {
    const user = await User.findOne({ _id: userId, isDeleted: false }).select('_id username email');
    if (!user) throw new AppError('NOT_FOUND', 404, 'Target user not found');
    if (!title || !body) throw new AppError('VALIDATION_ERROR', 400, 'Notification title and body are required');
    const notification = await Notification.create({ userId, type, title, body, data, dedupeKey, isRead: false });
    if (sendPush) await require('./notification.service').sendPushToUsers([userId], { title, body, data });
    await AdminAction.create({ adminId, action: 'send_notification', targetType: 'user', targetId: userId.toString(), details: { notificationId: notification._id, type, sendPush } });
    return { delivered: 1, notification };
  }

  async broadcastNotification({ userIds, all, type = 'system', title, body, data, sendPush = false, dedupeKey, adminId }) {
    const result = await require('./notification.service').broadcast({ userIds, all, type, title, body, data, sendPush, dedupeKey });
    await AdminAction.create({ adminId, action: 'broadcast_notification', targetType: 'notification', targetId: 'broadcast', details: { ...result, all: Boolean(all), type, sendPush } });
    return result;
  }

  // ==== Creator Management ====
  async getAllCreators({ skip, limit, search, verificationStatus, isLive }) {
    const creatorFilter = {};
    if (verificationStatus) creatorFilter.verificationStatus = verificationStatus;
    if (isLive !== undefined) creatorFilter.isLive = isLive === 'true';
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const users = await User.find({
        $or: [
          { username: { $regex: escapedSearch, $options: 'i' } },
          { email: { $regex: escapedSearch, $options: 'i' } },
          { displayName: { $regex: escapedSearch, $options: 'i' } },
        ],
      }).select('_id').lean();
      creatorFilter.userId = { $in: users.map((user) => user._id) };
    }
    const [creators, total] = await Promise.all([
      Creator.find(creatorFilter).populate('userId', 'username email displayName avatar role isVerified isBanned').sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      Creator.countDocuments(creatorFilter),
    ]);
    return [creators, total];
  }

  async getCreatorDetails(creatorId) {
    const creator = await Creator.findById(creatorId).populate('userId', 'username email displayName avatar role phone isVerified isBanned').lean();
    if (!creator) throw new AppError('NOT_FOUND', 404, 'Creator not found');
    const [postCount, reportCount] = await Promise.all([
      Post.countDocuments({ creatorId, isDeleted: false }),
      Report.countDocuments({ targetType: 'user', targetId: creator.userId._id.toString() }),
    ]);
    return { creator, stats: { postCount, reportCount } };
  }

  async updateCreatorStatus(creatorId, status, adminId, reason) {
    const creator = await Creator.findById(creatorId);
    if (!creator) throw new AppError('NOT_FOUND', 404, 'Creator not found');
    const user = await User.findById(creator.userId);
    if (!user) throw new AppError('NOT_FOUND', 404, 'Creator user not found');
    creator.verificationStatus = status;
    if (status === 'approved') {
      user.role = 'creator';
      user.isCreator = true;
    }
    await Promise.all([creator.save(), user.save()]);
    await AdminAction.create({ adminId, action: `${status}_creator`, targetType: 'creator', targetId: creatorId, reason });
    return { updated: true, creator, user: user.toPublicJSON() };
  }

  async approveCreator(creatorId, adminId) { return this.updateCreatorStatus(creatorId, 'approved', adminId); }

  async rejectCreator(creatorId, reason, adminId) { return this.updateCreatorStatus(creatorId, 'rejected', adminId, reason); }

  async suspendCreator(creatorId, reason, adminId) {
    const creator = await Creator.findById(creatorId);
    if (!creator) throw new AppError('NOT_FOUND', 404, 'Creator not found');
    const user = await User.findByIdAndUpdate(creator.userId, { isBanned: true, banReason: reason || 'Creator suspended' }, { new: true });
    if (!user) throw new AppError('NOT_FOUND', 404, 'Creator user not found');
    await AdminAction.create({ adminId, action: 'suspend_creator', targetType: 'creator', targetId: creatorId, reason: reason || 'Creator suspended' });
    return { suspended: true, creator, user: user.toPublicJSON() };
  }

  // ==== Content Management ====
  async getAllPosts({ skip, limit, search, visibility, isDeleted }) {
    const filter = {};
    if (visibility) filter.visibility = visibility;
    if (isDeleted !== undefined) filter.isDeleted = isDeleted === 'true';
    if (search) filter.caption = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const [posts, total] = await Promise.all([
      Post.find(filter).populate('userId', 'username email displayName').populate('creatorId', 'userId').sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      Post.countDocuments(filter),
    ]);
    return [posts, total];
  }

  async getPostDetails(postId) {
    const post = await Post.findById(postId).populate('userId', 'username email displayName role').populate('creatorId').lean();
    if (!post) throw new AppError('NOT_FOUND', 404, 'Post not found');
    return { post, commentCount: await Comment.countDocuments({ postId, isDeleted: false }), reportCount: await Report.countDocuments({ targetType: 'post', targetId: postId }) };
  }

  async updatePostVisibility(postId, isDeleted, reason, adminId) {
    const post = await Post.findByIdAndUpdate(postId, { isDeleted }, { new: true });
    if (!post) throw new AppError('NOT_FOUND', 404, 'Post not found');
    await AdminAction.create({ adminId, action: isDeleted ? 'hide_post' : 'restore_post', targetType: 'post', targetId: postId, reason });
    return { updated: true, post };
  }

  async hidePost(postId, reason, adminId) { return this.updatePostVisibility(postId, true, reason, adminId); }

  async restorePost(postId, adminId) { return this.updatePostVisibility(postId, false, null, adminId); }

  async getAllComments({ skip, limit, search, isDeleted }) {
    const filter = {};
    if (isDeleted !== undefined) filter.isDeleted = isDeleted === 'true';
    if (search) filter.text = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const [comments, total] = await Promise.all([
      Comment.find(filter).populate('userId', 'username email displayName').populate('postId', 'caption userId').sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      Comment.countDocuments(filter),
    ]);
    return [comments, total];
  }

  async getCommentDetails(commentId) {
    const comment = await Comment.findById(commentId).populate('userId', 'username email displayName role').populate('postId', 'caption userId').lean();
    if (!comment) throw new AppError('NOT_FOUND', 404, 'Comment not found');
    return comment;
  }

  async restoreComment(commentId, adminId) {
    const comment = await Comment.findByIdAndUpdate(commentId, { isDeleted: false }, { new: true });
    if (!comment) throw new AppError('NOT_FOUND', 404, 'Comment not found');
    await AdminAction.create({ adminId, action: 'restore_comment', targetType: 'comment', targetId: commentId });
    return { updated: true, comment };
  }

  async getActivity({ skip, limit, action, targetType }) {
    const filter = {};
    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;
    const [activity, total] = await Promise.all([
      AdminAction.find(filter).populate('adminId', 'username email displayName').sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      AdminAction.countDocuments(filter),
    ]);
    return [activity, total];
  }

  // ==== Chat Management ====
  async getAllChats({ skip, limit, search }) {
    const filter = {};
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matchingUsers = await User.find({
        $or: [
          { username: { $regex: escapedSearch, $options: 'i' } },
          { email: { $regex: escapedSearch, $options: 'i' } },
          { displayName: { $regex: escapedSearch, $options: 'i' } },
        ],
      }).select('_id').lean();
      filter.participants = { $in: matchingUsers.map((user) => user._id) };
    }

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .populate('participants', 'username email displayName avatar role isBanned')
        .sort({ updatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(filter),
    ]);

    return [conversations, total];
  }

  async getChatDetails(conversationId) {
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'username email displayName avatar role isVerified isBanned')
      .lean();
    if (!conversation) throw new AppError('NOT_FOUND', 404, 'Conversation not found');

    const messageCount = await Message.countDocuments({ conversationId, isDeleted: false });
    return { conversation, messageCount };
  }

  async getChatMessages(conversationId, { skip, limit }) {
    const conversationExists = await Conversation.exists({ _id: conversationId });
    if (!conversationExists) throw new AppError('NOT_FOUND', 404, 'Conversation not found');

    const filter = { conversationId, isDeleted: false };
    const [messages, total] = await Promise.all([
      Message.find(filter)
        .populate('senderId', 'username email displayName avatar role')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments(filter),
    ]);

    return [messages.reverse(), total];
  }

  // ==== Payment Management ====
  async getAllPayments({ skip, limit, search, type, status }) {
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matchingUsers = await User.find({
        $or: [
          { username: { $regex: escapedSearch, $options: 'i' } },
          { email: { $regex: escapedSearch, $options: 'i' } },
        ],
      }).select('_id').lean();
      filter.$or = [
        { description: { $regex: escapedSearch, $options: 'i' } },
        { gatewayTransactionId: { $regex: escapedSearch, $options: 'i' } },
        { userId: { $in: matchingUsers.map((user) => user._id) } },
      ];
    }

    const [payments, total] = await Promise.all([
      Transaction.find(filter)
        .populate('userId', 'username email displayName role')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(filter),
    ]);
    return [payments, total];
  }

  async getPaymentDetails(paymentId) {
    const payment = await Transaction.findById(paymentId)
      .populate('userId', 'username email displayName role phone')
      .lean();
    if (!payment) throw new AppError('NOT_FOUND', 404, 'Payment not found');
    return payment;
  }

  async getAllPayouts({ skip, limit, search, status, method }) {
    const filter = {};
    if (status) filter.status = status;
    if (method) filter.method = method;
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matchingUsers = await User.find({
        $or: [
          { username: { $regex: escapedSearch, $options: 'i' } },
          { email: { $regex: escapedSearch, $options: 'i' } },
        ],
      }).select('_id').lean();
      filter.userId = { $in: matchingUsers.map((user) => user._id) };
    }
    const [payouts, total] = await Promise.all([
      Payout.find(filter)
        .populate('userId', 'username email displayName role')
        .populate('reviewedBy', 'username email displayName')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payout.countDocuments(filter),
    ]);
    return [payouts, total];
  }

  async getPayoutDetails(payoutId) {
    const payout = await Payout.findById(payoutId)
      .populate('userId', 'username email displayName role phone')
      .populate('reviewedBy', 'username email displayName')
      .lean();
    if (!payout) throw new AppError('NOT_FOUND', 404, 'Payout not found');
    return payout;
  }

  async approvePayout(payoutId, adminId) {
    const payout = await Payout.findById(payoutId);
    if (!payout) throw new AppError('NOT_FOUND', 404, 'Payout not found');
    if (!['pending', 'rejected'].includes(payout.status)) {
      throw new AppError('INVALID_PAYOUT_STATUS', 400, 'Only pending or rejected payouts can be approved');
    }
    payout.status = 'approved';
    payout.rejectionReason = null;
    payout.reviewedBy = adminId;
    payout.reviewedAt = new Date();
    await payout.save();
    await AdminAction.create({
      adminId,
      action: 'approve_payout',
      targetType: 'payout',
      targetId: payoutId,
    });
    return { approved: true, payout };
  }

  async rejectPayout(payoutId, reason, adminId) {
    const payout = await Payout.findById(payoutId);
    if (!payout) throw new AppError('NOT_FOUND', 404, 'Payout not found');
    if (!['pending', 'approved'].includes(payout.status)) {
      throw new AppError('INVALID_PAYOUT_STATUS', 400, 'Only pending or approved payouts can be rejected');
    }
    payout.status = 'rejected';
    payout.rejectionReason = reason || 'Rejected by administrator';
    payout.reviewedBy = adminId;
    payout.reviewedAt = new Date();
    await payout.save();
    await AdminAction.create({
      adminId,
      action: 'reject_payout',
      targetType: 'payout',
      targetId: payoutId,
      reason: payout.rejectionReason,
    });
    return { rejected: true, payout };
  }

  // ==== User Management ====
  async getAllUsers({ skip, limit, search, role, isBanned }) {
    const filter = { isDeleted: false };

    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) filter.role = role;
    if (isBanned) filter.isBanned = isBanned === 'true';

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash -fcmTokens')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return [
      users.map((u) => ({
        id: u._id,
        username: u.username,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        isCreator: u.isCreator,
        isVerified: u.isVerified,
        isBanned: u.isBanned,
        banReason: u.banReason,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
      })),
      total,
    ];
  }

  async getUserDetails(userId) {
    const user = await User.findById(userId).select('-passwordHash -fcmTokens');
    if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');

    const postCount = await Post.countDocuments({ userId, isDeleted: false });
    const commentCount = await Comment.countDocuments({ userId, isDeleted: false });

    return {
      ...user.toObject(),
      stats: {
        posts: postCount,
        comments: commentCount,
        accountAge: Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)),
      },
    };
  }

  async getUserPaymentMethods(userId) {
    const user = await User.findById(userId).select('_id username email displayName');
    if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');

    const [bankMethods, upiMethods] = await Promise.all([
      BankPaymentMethod.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean(),
      UpiPaymentMethod.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean(),
    ]);

    return {
      user,
      paymentMethods: [
        ...bankMethods.map((method) => ({ ...method, type: 'bank' })),
        ...upiMethods.map((method) => ({ ...method, type: 'upi' })),
      ],
    };
  }

  async deleteUserPaymentMethod(userId, paymentMethodId, adminId) {
    const user = await User.findById(userId).select('_id');
    if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');

    let deletedMethod = await BankPaymentMethod.findOneAndDelete({ _id: paymentMethodId, userId });
    let paymentType = 'bank';
    if (!deletedMethod) {
      deletedMethod = await UpiPaymentMethod.findOneAndDelete({ _id: paymentMethodId, userId });
      paymentType = 'upi';
    }
    if (!deletedMethod) throw new AppError('NOT_FOUND', 404, 'Payment method not found');

    await AdminAction.create({
      adminId,
      action: 'delete_payment_method',
      targetType: 'user',
      targetId: userId,
      details: { paymentMethodId, paymentType },
    });

    return { deleted: true, paymentMethodId, paymentType };
  }

  async banUser(userId, reason, adminId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');

    user.isBanned = true;
    user.banReason = reason;
    await user.save();

    await AdminAction.create({
      adminId,
      action: 'ban_user',
      targetType: 'user',
      targetId: userId,
      reason,
    });

    return { banned: true, user: user.toPublicJSON() };
  }

  async unbanUser(userId, adminId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');

    user.isBanned = false;
    user.banReason = null;
    await user.save();

    await AdminAction.create({
      adminId,
      action: 'unban_user',
      targetType: 'user',
      targetId: userId,
    });

    return { unbanned: true, user: user.toPublicJSON() };
  }

  async updateUserRole(userId, newRole, adminId) {
    if (!['fan', 'creator', 'moderator', 'admin'].includes(newRole)) {
      throw new AppError('VALIDATION_ERROR', 400, 'Invalid role');
    }

    const user = await User.findById(userId);
    if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');

    const oldRole = user.role;
    user.role = newRole;
    await user.save();

    await AdminAction.create({
      adminId,
      action: 'update_role',
      targetType: 'user',
      targetId: userId,
      details: { oldRole, newRole },
    });

    return { updated: true, user: user.toPublicJSON() };
  }

  // ==== Report Management ====
  async getAllReports({ skip, limit, search, status, targetType, reason }) {
    const filter = {};

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matchingReporters = await User.find({
        $or: [
          { username: { $regex: escapedSearch, $options: 'i' } },
          { email: { $regex: escapedSearch, $options: 'i' } },
          { displayName: { $regex: escapedSearch, $options: 'i' } },
        ],
      }).select('_id').lean();

      filter.$or = [
        { description: { $regex: escapedSearch, $options: 'i' } },
        { reporterId: { $in: matchingReporters.map((reporter) => reporter._id) } },
      ];
    }
    if (status) filter.status = status;
    if (targetType) filter.targetType = targetType;
    if (reason) filter.reason = reason;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate('reporterId', 'username email displayName role isVerified isBanned')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments(filter),
    ]);

    return [reports, total];
  }

  async getReportDetails(reportId) {
    const report = await Report.findById(reportId).populate('reporterId', 'username email displayName');
    if (!report) throw new AppError('NOT_FOUND', 404, 'Report not found');

    let targetDetails = null;
    if (report.targetType === 'user') {
      targetDetails = await User.findById(report.targetId).select('-passwordHash -fcmTokens');
    } else if (report.targetType === 'post') {
      targetDetails = await Post.findById(report.targetId).populate('userId', 'username displayName');
    } else if (report.targetType === 'live') {
      targetDetails = await LiveRoom.findById(report.targetId).populate('creatorId', 'username displayName');
    }

    return {
      report: report.toObject(),
      targetDetails,
    };
  }

  async resolveReport(reportId, { action, reason }, adminId) {
    const report = await Report.findById(reportId);
    if (!report) throw new AppError('NOT_FOUND', 404, 'Report not found');

    report.status = 'resolved';
    await report.save();

    // Take action based on report
    if (action === 'ban_user' && report.targetType === 'user') {
      const targetUser = await User.findById(report.targetId);
      if (targetUser) {
        targetUser.isBanned = true;
        targetUser.banReason = `Report resolved: ${reason}`;
        await targetUser.save();
      }
    } else if (action === 'delete_content') {
      if (report.targetType === 'post') {
        await Post.findByIdAndUpdate(report.targetId, { isDeleted: true, deletedReason: reason });
      } else if (report.targetType === 'comment') {
        await Comment.findByIdAndUpdate(report.targetId, { isDeleted: true, deletedReason: reason });
      }
    }

    await AdminAction.create({
      adminId,
      action: 'resolve_report',
      targetType: 'report',
      targetId: reportId,
      reason,
      details: { action, targetType: report.targetType },
    });

    return { resolved: true, report };
  }

  async dismissReport(reportId, reason, adminId) {
    const report = await Report.findById(reportId);
    if (!report) throw new AppError('NOT_FOUND', 404, 'Report not found');

    report.status = 'reviewed';
    await report.save();

    await AdminAction.create({
      adminId,
      action: 'dismiss_report',
      targetType: 'report',
      targetId: reportId,
      reason,
    });

    return { dismissed: true, report };
  }

  // ==== Content Moderation ====
  async deletePost(postId, reason, adminId) {
    const post = await Post.findById(postId);
    if (!post) throw new AppError('NOT_FOUND', 404, 'Post not found');

    post.isDeleted = true;
    post.deletedReason = reason;
    post.deletedAt = new Date();
    await post.save();

    await AdminAction.create({
      adminId,
      action: 'delete_post',
      targetType: 'post',
      targetId: postId,
      reason,
    });

    return { deleted: true, post };
  }

  async deleteComment(commentId, reason, adminId) {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new AppError('NOT_FOUND', 404, 'Comment not found');

    comment.isDeleted = true;
    comment.deletedReason = reason;
    comment.deletedAt = new Date();
    await comment.save();

    await AdminAction.create({
      adminId,
      action: 'delete_comment',
      targetType: 'comment',
      targetId: commentId,
      reason,
    });

    return { deleted: true, comment };
  }

  async deleteLiveStream(liveId, reason, adminId) {
    return this.stopLiveStream(liveId, reason, adminId);
  }

  // ==== Statistics & Analytics ====
  async getDashboardStats({ from, to, role, reportStatus } = {}) {
    const range = getAnalyticsRange({ from, to });
    const userFilter = { isDeleted: false, createdAt: range.dateFilter };
    if (role) userFilter.role = role;
    const reportFilter = { createdAt: range.dateFilter };
    if (reportStatus) reportFilter.status = reportStatus;
    const [totalUsers, bannedUsers, totalReports, pendingReports, totalPosts, totalLive] = await Promise.all([
      User.countDocuments(userFilter),
      User.countDocuments({ ...userFilter, isBanned: true }),
      Report.countDocuments(reportFilter),
      Report.countDocuments({ ...reportFilter, status: 'pending' }),
      Post.countDocuments({ isDeleted: false, createdAt: range.dateFilter }),
      LiveRoom.countDocuments({ status: 'live', createdAt: range.dateFilter }),
    ]);

    return {
      users: {
        total: totalUsers,
        banned: bannedUsers,
        active: totalUsers - bannedUsers,
      },
      reports: {
        total: totalReports,
        pending: pendingReports,
        resolved: totalReports - pendingReports,
      },
      content: {
        posts: totalPosts,
        liveStreams: totalLive,
      },
      range: { from: range.start, to: range.end },
      timestamp: new Date(),
    };
  }

  async getUserStats({ from, to, role, isVerified, isBanned } = {}) {
    const range = getAnalyticsRange({ from, to });
    const periodFilter = { isDeleted: false, createdAt: range.dateFilter };
    if (role) periodFilter.role = role;
    if (isVerified !== undefined) periodFilter.isVerified = isVerified === 'true' || isVerified === true;
    if (isBanned !== undefined) periodFilter.isBanned = isBanned === 'true' || isBanned === true;

    const [newUsers, verifiedUsers, creatorUsers, bannedUsers] = await Promise.all([
      User.countDocuments(periodFilter),
      User.countDocuments({ ...periodFilter, isVerified: true }),
      User.countDocuments({ ...periodFilter, isCreator: true }),
      User.countDocuments({ ...periodFilter, isBanned: true }),
    ]);

    const roleDistribution = await User.aggregate([
      { $match: periodFilter },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    return {
      newUsers,
      newUsersToday: newUsers,
      verifiedUsers,
      creatorUsers,
      bannedUsers,
      roleDistribution: roleDistribution.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      range: { from: range.start, to: range.end },
    };
  }

  async getReportStats({ from, to, status, targetType, reason } = {}) {
    const range = getAnalyticsRange({ from, to });
    const filter = { createdAt: range.dateFilter };
    if (status) filter.status = status;
    if (targetType) filter.targetType = targetType;
    if (reason) filter.reason = reason;
    const statusDistribution = await Report.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const reasonDistribution = await Report.aggregate([
      { $match: filter },
      { $group: { _id: '$reason', count: { $sum: 1 } } },
    ]);

    const targetDistribution = await Report.aggregate([
      { $match: filter },
      { $group: { _id: '$targetType', count: { $sum: 1 } } },
    ]);

    return {
      statusDistribution: statusDistribution.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      reasonDistribution: reasonDistribution.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      targetDistribution: targetDistribution.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      range: { from: range.start, to: range.end },
    };
  }

  async getFinancialStats({ from, to, type, status, paymentGateway } = {}) {
    const range = getAnalyticsRange({ from, to });
    const transactionFilter = { createdAt: range.dateFilter };
    if (type) transactionFilter.type = type;
    if (status) transactionFilter.status = status;
    if (paymentGateway) transactionFilter.paymentGateway = paymentGateway;

    const [revenue, payoutTotals] = await Promise.all([
      Transaction.aggregate([
        { $match: { ...transactionFilter, status: status || 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payout.aggregate([
        { $match: { createdAt: range.dateFilter, status: { $in: ['approved', 'processing', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const totalRevenue = revenue[0]?.total || 0;
    const totalPayouts = payoutTotals[0]?.total || 0;
    return {
      totalRevenue,
      totalPayouts,
      profit: totalRevenue - totalPayouts,
      transactionCount: await Transaction.countDocuments({ ...transactionFilter, status: status || 'completed' }),
      payoutCount: await Payout.countDocuments({ createdAt: range.dateFilter, status: { $in: ['approved', 'processing', 'completed'] } }),
      range: { from: range.start, to: range.end },
      timestamp: new Date(),
    };
  }

  // ==== Moderation Log ====
  async getModerationLog({ skip, limit, actionType, targetType }) {
    const filter = {};
    if (actionType) filter.action = actionType;
    if (targetType) filter.targetType = targetType;

    const [logs, total] = await Promise.all([
      AdminAction.find(filter)
        .populate('adminId', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AdminAction.countDocuments(filter),
    ]);

    return [logs, total];
  }

  // ==== Live Management ====
  async getAllLiveStreams({ skip, limit, status, search }) {
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matchingUsers = await User.find({
        $or: [
          { username: { $regex: escapedSearch, $options: 'i' } },
          { email: { $regex: escapedSearch, $options: 'i' } },
          { displayName: { $regex: escapedSearch, $options: 'i' } },
        ],
      }).select('_id').lean();
      filter.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { category: { $regex: escapedSearch, $options: 'i' } },
        { userId: { $in: matchingUsers.map((user) => user._id) } },
      ];
    }
    const [streams, total] = await Promise.all([
      LiveRoom.find(filter)
        .populate('userId', 'username email displayName avatar role isVerified isBanned')
        .populate({
          path: 'hostId',
          select: 'userId categories verificationStatus isLive',
          populate: {
            path: 'userId',
            select: 'username email displayName avatar role isVerified isBanned',
          },
        })
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
      LiveRoom.countDocuments(),
    ]);

    return [streams, total];
  }

  async getLiveStreamDetails(liveId) {
    const stream = await LiveRoom.findById(liveId)
      .populate('userId', 'username email displayName avatar role phone isVerified isBanned')
      .populate({
        path: 'hostId',
        populate: {
          path: 'userId',
          select: 'username email displayName avatar role isVerified isBanned',
        },
      })
      .lean();
    if (!stream) throw new AppError('NOT_FOUND', 404, 'Live stream not found');
    return { stream, reportCount: await Report.countDocuments({ targetType: 'live', targetId: liveId }) };
  }

  async warnLiveStream(liveId, reason, adminId) {
    const stream = await LiveRoom.findById(liveId);
    if (!stream) throw new AppError('NOT_FOUND', 404, 'Live stream not found');
    await AdminAction.create({ adminId, action: 'warn_live', targetType: 'live', targetId: liveId, reason: reason || 'Live stream warning' });
    return { warned: true, liveId, reason: reason || 'Live stream warning' };
  }

  async stopLiveStream(liveId, reason, adminId) {
    const stream = await LiveRoom.findById(liveId);
    if (!stream) throw new AppError('NOT_FOUND', 404, 'Live stream not found');
    stream.status = 'ended';
    stream.endedAt = new Date();
    stream.stats.currentViewers = 0;
    await stream.save();
    await Creator.findOneAndUpdate({ userId: stream.userId }, { isLive: false, $unset: { currentLiveRoomId: 1 } });
    await AdminAction.create({ adminId, action: 'stop_live', targetType: 'live', targetId: liveId, reason });
    return { stopped: true, live: stream };
  }
}

module.exports = new AdminService();
