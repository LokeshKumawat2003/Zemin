const notificationService = require('../services/notification.service');
const { paginated, success } = require('../utils/response.util');
const { getPagination } = require('../utils/pagination.util');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const unreadOnly = req.query.unreadOnly === 'true';
    const { items, total } = await notificationService.getNotifications(req.user._id, {
      skip,
      limit,
      unreadOnly,
    });
    paginated(res, items, page, limit, total);
  } catch (err) {
    next(err);
  }
};

exports.unreadCount = async (req, res, next) => {
  try {
    const data = await notificationService.getUnreadCount(req.user._id);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.broadcast = async (req, res, next) => {
  try {
    const { userIds, all, type, title, body, data, sendPush } = req.body;
    const payload = await notificationService.broadcast({
      userIds,
      all,
      type,
      title,
      body,
      data,
      sendPush: Boolean(sendPush),
    });
    success(res, payload, 'Notifications broadcasted', 201);
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const data = await notificationService.markRead(req.user._id, req.params.id);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    const data = await notificationService.markAllRead(req.user._id);
    success(res, data);
  } catch (err) {
    next(err);
  }
};
