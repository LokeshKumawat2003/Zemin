const adminService = require('../services/admin.service');
const { success, paginated } = require('../utils/response.util');
const { getPagination } = require('../utils/pagination.util');

exports.isLoggedIn = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    return success(res, {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        isVerified: user.isVerified,
      },
      isLoggedIn: true,
    }, 'Admin authenticated');
  } catch (err) {
    next(err);
  }
};

// ==== User Management ====
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination({ ...req.query, limit: req.query.limit || 10 });
    const { search, role, isBanned } = req.query;
    const [users, total] = await adminService.getAllUsers({ page, limit, skip, search, role, isBanned });
    paginated(res, users, page, limit, total);
  } catch (err) {
    next(err);
  }
};

exports.getUserDetails = async (req, res, next) => {
  try {
    const data = await adminService.getUserDetails(req.params.userId);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.getUserPaymentMethods = async (req, res, next) => {
  try {
    const data = await adminService.getUserPaymentMethods(req.params.userId);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.deleteUserPaymentMethod = async (req, res, next) => {
  try {
    const data = await adminService.deleteUserPaymentMethod(
      req.params.userId,
      req.params.paymentMethodId,
      req.user._id
    );
    success(res, data, 'User payment method deleted');
  } catch (err) {
    next(err);
  }
};

exports.banUser = async (req, res, next) => {
  try {
    const data = await adminService.banUser(req.params.userId, req.body.reason, req.user._id);
    success(res, data, 'User banned successfully');
  } catch (err) {
    next(err);
  }
};

exports.unbanUser = async (req, res, next) => {
  try {
    const data = await adminService.unbanUser(req.params.userId, req.user._id);
    success(res, data, 'User unbanned successfully');
  } catch (err) {
    next(err);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const data = await adminService.updateUserRole(req.params.userId, req.body.role, req.user._id);
    success(res, data, 'User role updated');
  } catch (err) {
    next(err);
  }
};

// ==== Creator Management ====
exports.getAllCreators = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, verificationStatus, isLive } = req.query;
    const [creators, total] = await adminService.getAllCreators({ skip, limit, search, verificationStatus, isLive });
    paginated(res, creators, page, limit, total);
  } catch (err) {
    next(err);
  }
};

exports.getCreatorDetails = async (req, res, next) => {
  try {
    const data = await adminService.getCreatorDetails(req.params.creatorId);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.approveCreator = async (req, res, next) => {
  try {
    const data = await adminService.approveCreator(req.params.creatorId, req.user._id);
    success(res, data, 'Creator approved');
  } catch (err) {
    next(err);
  }
};

exports.rejectCreator = async (req, res, next) => {
  try {
    const data = await adminService.rejectCreator(req.params.creatorId, req.body.reason, req.user._id);
    success(res, data, 'Creator rejected');
  } catch (err) {
    next(err);
  }
};

exports.suspendCreator = async (req, res, next) => {
  try {
    const data = await adminService.suspendCreator(req.params.creatorId, req.body.reason, req.user._id);
    success(res, data, 'Creator suspended');
  } catch (err) {
    next(err);
  }
};

// ==== Content Management ====
exports.getAllPosts = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [posts, total] = await adminService.getAllPosts({ skip, limit, search: req.query.search, visibility: req.query.visibility, isDeleted: req.query.isDeleted });
    paginated(res, posts, page, limit, total);
  } catch (err) {
    next(err);
  }
};

exports.getPostDetails = async (req, res, next) => {
  try {
    success(res, await adminService.getPostDetails(req.params.postId));
  } catch (err) {
    next(err);
  }
};

exports.hidePost = async (req, res, next) => {
  try {
    success(res, await adminService.hidePost(req.params.postId, req.body.reason, req.user._id), 'Post hidden');
  } catch (err) {
    next(err);
  }
};

exports.restorePost = async (req, res, next) => {
  try {
    success(res, await adminService.restorePost(req.params.postId, req.user._id), 'Post restored');
  } catch (err) {
    next(err);
  }
};

exports.getAllComments = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [comments, total] = await adminService.getAllComments({ skip, limit, search: req.query.search, isDeleted: req.query.isDeleted });
    paginated(res, comments, page, limit, total);
  } catch (err) {
    next(err);
  }
};

exports.getCommentDetails = async (req, res, next) => {
  try {
    success(res, await adminService.getCommentDetails(req.params.commentId));
  } catch (err) {
    next(err);
  }
};

exports.restoreComment = async (req, res, next) => {
  try {
    success(res, await adminService.restoreComment(req.params.commentId, req.user._id), 'Comment restored');
  } catch (err) {
    next(err);
  }
};

exports.getActivity = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [activity, total] = await adminService.getActivity({ skip, limit, action: req.query.action, targetType: req.query.targetType });
    paginated(res, activity, page, limit, total);
  } catch (err) {
    next(err);
  }
};

// ==== Notification Management ====
exports.getAllNotifications = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [notifications, total] = await adminService.getAllNotifications({
      skip,
      limit,
      search: req.query.search,
      type: req.query.type,
      isRead: req.query.isRead,
    });
    paginated(res, notifications, page, limit, total);
  } catch (err) {
    next(err);
  }
};

exports.getUnreadNotificationCount = async (req, res, next) => {
  try {
    success(res, await adminService.getUnreadNotificationCount(req.user._id));
  } catch (err) {
    next(err);
  }
};

exports.getNotificationDetails = async (req, res, next) => {
  try {
    success(res, await adminService.getNotificationDetails(req.params.notificationId));
  } catch (err) {
    next(err);
  }
};

exports.markNotificationRead = async (req, res, next) => {
  try {
    success(res, await adminService.markNotificationRead(req.user._id, req.params.notificationId));
  } catch (err) {
    next(err);
  }
};

exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    success(res, await adminService.markAllNotificationsRead(req.user._id));
  } catch (err) {
    next(err);
  }
};

exports.sendNotification = async (req, res, next) => {
  try {
    const data = await adminService.sendNotification({ ...req.body, adminId: req.user._id });
    success(res, data, 'Notification sent', 201);
  } catch (err) {
    next(err);
  }
};

exports.broadcastNotification = async (req, res, next) => {
  try {
    const data = await adminService.broadcastNotification({ ...req.body, adminId: req.user._id });
    success(res, data, 'Notifications broadcasted', 201);
  } catch (err) {
    next(err);
  }
};

// ==== Chat Management ====
exports.getAllChats = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search } = req.query;
    const [chats, total] = await adminService.getAllChats({ skip, limit, search });
    paginated(res, chats, page, limit, total);
  } catch (err) {
    next(err);
  }
};

exports.getChatDetails = async (req, res, next) => {
  try {
    const data = await adminService.getChatDetails(req.params.conversationId);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.getChatMessages = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [messages, total] = await adminService.getChatMessages(req.params.conversationId, { skip, limit });
    paginated(res, messages, page, limit, total);
  } catch (err) {
    next(err);
  }
};

// ==== Payment Management ====
exports.getAllPayments = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, type, status } = req.query;
    const [payments, total] = await adminService.getAllPayments({ skip, limit, search, type, status });
    paginated(res, payments, page, limit, total);
  } catch (err) {
    next(err);
  }
};

exports.getPaymentDetails = async (req, res, next) => {
  try {
    const data = await adminService.getPaymentDetails(req.params.paymentId);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.getAllPayouts = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, status, method } = req.query;
    const [payouts, total] = await adminService.getAllPayouts({ skip, limit, search, status, method });
    paginated(res, payouts, page, limit, total);
  } catch (err) {
    next(err);
  }
};

exports.getPayoutDetails = async (req, res, next) => {
  try {
    const data = await adminService.getPayoutDetails(req.params.payoutId);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.approvePayout = async (req, res, next) => {
  try {
    const data = await adminService.approvePayout(req.params.payoutId, req.user._id);
    success(res, data, 'Payout approved');
  } catch (err) {
    next(err);
  }
};

exports.rejectPayout = async (req, res, next) => {
  try {
    const data = await adminService.rejectPayout(req.params.payoutId, req.body.reason, req.user._id);
    success(res, data, 'Payout rejected');
  } catch (err) {
    next(err);
  }
};

// ==== Report Management ====
exports.getAllReports = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, status, targetType, reason } = req.query;
    const [reports, total] = await adminService.getAllReports({ page, limit, skip, search, status, targetType, reason });
    paginated(res, reports, page, limit, total);
  } catch (err) {
    next(err);
  }
};

exports.getReportDetails = async (req, res, next) => {
  try {
    const data = await adminService.getReportDetails(req.params.reportId);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.resolveReport = async (req, res, next) => {
  try {
    const data = await adminService.resolveReport(req.params.reportId, req.body, req.user._id);
    success(res, data, 'Report resolved');
  } catch (err) {
    next(err);
  }
};

exports.dismissReport = async (req, res, next) => {
  try {
    const data = await adminService.dismissReport(req.params.reportId, req.body.reason, req.user._id);
    success(res, data, 'Report dismissed');
  } catch (err) {
    next(err);
  }
};

// ==== Content Moderation ====
exports.deletePost = async (req, res, next) => {
  try {
    const data = await adminService.deletePost(req.params.postId, req.body.reason, req.user._id);
    success(res, data, 'Post deleted');
  } catch (err) {
    next(err);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const data = await adminService.deleteComment(req.params.commentId, req.body.reason, req.user._id);
    success(res, data, 'Comment deleted');
  } catch (err) {
    next(err);
  }
};

exports.deleteLiveStream = async (req, res, next) => {
  try {
    const data = await adminService.deleteLiveStream(req.params.liveId, req.body.reason, req.user._id);
    success(res, data, 'Live stream stopped');
  } catch (err) {
    next(err);
  }
};

// ==== Statistics & Analytics ====
exports.getDashboardStats = async (req, res, next) => {
  try {
    const { from, to, role, reportStatus } = req.query;
    const data = await adminService.getDashboardStats({ from, to, role, reportStatus });
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.getUserStats = async (req, res, next) => {
  try {
    const { from, to, role, isVerified, isBanned } = req.query;
    const data = await adminService.getUserStats({ from, to, role, isVerified, isBanned });
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.getReportStats = async (req, res, next) => {
  try {
    const { from, to, status, targetType, reason } = req.query;
    const data = await adminService.getReportStats({ from, to, status, targetType, reason });
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.getFinancialStats = async (req, res, next) => {
  try {
    const { from, to, status, paymentGateway } = req.query;
    const type = req.query.type || req.query.paymentType;
    const data = await adminService.getFinancialStats({ from, to, type, status, paymentGateway });
    success(res, data);
  } catch (err) {
    next(err);
  }
};

// ==== Moderation Log ====
exports.getModerationLog = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { actionType, targetType } = req.query;
    const [logs, total] = await adminService.getModerationLog({ page, limit, skip, actionType, targetType });
    paginated(res, logs, page, limit, total);
  } catch (err) {
    next(err);
  }
};

// ==== Live Management ====
exports.getAllLiveStreams = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status, search } = req.query;
    const [streams, total] = await adminService.getAllLiveStreams({ page, limit, skip, status, search });
    paginated(res, streams, page, limit, total);
  } catch (err) {
    next(err);
  }
};

exports.getLiveStreamDetails = async (req, res, next) => {
  try {
    success(res, await adminService.getLiveStreamDetails(req.params.liveId));
  } catch (err) {
    next(err);
  }
};

exports.warnLiveStream = async (req, res, next) => {
  try {
    success(res, await adminService.warnLiveStream(req.params.liveId, req.body.reason, req.user._id), 'Live stream warning recorded');
  } catch (err) {
    next(err);
  }
};

exports.stopLiveStream = async (req, res, next) => {
  try {
    success(res, await adminService.stopLiveStream(req.params.liveId, req.body.reason, req.user._id), 'Live stream stopped');
  } catch (err) {
    next(err);
  }
};
