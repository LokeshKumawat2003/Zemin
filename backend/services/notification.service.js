const Notification = require('../models/Notification.model');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');
const config = require('../config/env');
const { getAuthModels } = require('../config/database');
const crypto = require('crypto');

const INVALID_FCM_ERROR_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

let messaging;

const initFirebaseMessaging = () => {
  if (messaging) return messaging;
  try {
    const admin = require('firebase-admin');
    let app;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      app = admin.initializeApp();
    }

    if (app) {
      messaging = admin.messaging();
    }
  } catch (err) {
    console.warn('[NotificationService] Firebase Admin not initialized:', err.message);
  }
  return messaging;
};

const formatPushData = (data) => {
  if (!data) return undefined;
  return Object.entries(data).reduce((acc, [key, value]) => {
    if (value === undefined || value === null) return acc;
    acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
    return acc;
  }, {});
};

class NotificationService {
  async create({ userId, type, title, body, data, sendPush = false }) {
    const notification = await Notification.create({ userId, type, title, body, data });
    if (sendPush) {
      await this.sendPushToUsers([userId], { title, body, data });
    }
    return notification;
  }

  async createForUsers(userIds, { type, title, body, data, sendPush = false, dedupeKey }) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new AppError('VALIDATION_ERROR', 400, 'No users provided for notifications');
    }

    const existing = dedupeKey
      ? await Notification.find({ userId: { $in: userIds }, dedupeKey }).select('userId')
      : [];
    const existingUserIds = new Set(existing.map((notification) => notification.userId.toString()));
    const newUserIds = userIds.filter((userId) => !existingUserIds.has(userId.toString()));
    if (newUserIds.length === 0) return { delivered: 0, skipped: userIds.length, duplicate: true };

    const bulk = newUserIds.map((userId) => ({
      userId,
      type,
      title,
      body,
      data,
      dedupeKey,
      isRead: false,
    }));

    await Notification.insertMany(bulk);
    if (sendPush) {
      await this.sendPushToUsers(newUserIds, { title, body, data });
    }

    return { delivered: newUserIds.length, skipped: userIds.length - newUserIds.length };
  }

  async broadcast({ userIds = [], all = false, type = 'system', title, body, data, sendPush = false, dedupeKey }) {
    if (!title || !body) {
      throw new AppError('VALIDATION_ERROR', 400, 'Notification title and body are required');
    }

    let targets = userIds.map(String);
    if (all) {
      const users = await User.find({ isDeleted: false }).select('_id');
      targets = users.map((u) => u._id.toString());
    }

    if (targets.length === 0) {
      throw new AppError('VALIDATION_ERROR', 400, 'No target users found to broadcast notification');
    }

    const automaticDedupeKey = dedupeKey || crypto
      .createHash('sha256')
      .update(JSON.stringify({ type, title, body, data, minute: Math.floor(Date.now() / 60000) }))
      .digest('hex');
    return this.createForUsers(targets, { type, title, body, data, sendPush, dedupeKey: automaticDedupeKey });
  }

  async notifyAdmins({ type = 'system', title, body, data, dedupeKey }) {
    if (!title || !body) return { delivered: 0 };
    const { User: AuthUser } = getAuthModels();
    const admins = await AuthUser.find({ role: 'admin', isDeleted: false }).select('_id');
    if (!admins.length) return { delivered: 0 };
    return this.createForUsers(admins.map((admin) => admin._id), { type, title, body, data, sendPush: false, dedupeKey });
  }

  async removeInvalidTokens(tokens) {
    if (!tokens.length) return;
    await User.updateMany(
      { fcmTokens: { $in: tokens } },
      { $pull: { fcmTokens: { $in: tokens } } }
    );
  }

  async sendPushToUsers(userIds, { title, body, data }) {
    if (!config.notifications.pushEnabled) return;

    const messagingClient = initFirebaseMessaging();
    if (!messagingClient) return;

    const users = await User.find({
      _id: { $in: userIds },
      fcmTokens: { $exists: true, $ne: [] },
      $or: [
        { 'settings.notifications.push': true },
        { 'settings.notifications.push': { $exists: false } },
      ],
    }).select('fcmTokens');

    const tokens = Array.from(new Set(users.flatMap((user) => user.fcmTokens || [])));
    if (!tokens.length) return;

    const message = {
      notification: { title, body },
      data: formatPushData(data),
      android: { priority: 'high' },
      apns: { headers: { 'apns-priority': '10' } },
      tokens,
    };

    try {
      const response = await messagingClient.sendEachForMulticast(message);
      if (response.failureCount > 0) {
        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
          if (resp.success) return;
          const code = resp.error?.code;
          if (code && INVALID_FCM_ERROR_CODES.has(code)) {
            invalidTokens.push(tokens[idx]);
          }
        });

        if (invalidTokens.length) {
          await this.removeInvalidTokens(invalidTokens);
          console.warn('[NotificationService] Removed invalid FCM tokens:', invalidTokens.length);
        }
      }
    } catch (err) {
      console.error('[NotificationService] Push send error:', err.message || err);
    }
  }

  async getNotifications(userId, { skip, limit, unreadOnly }) {
    const filter = { userId };
    if (unreadOnly) filter.isRead = false;

    const [items, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
    ]);

    return {
      items: items.map((n) => ({
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      total,
    };
  }

  async getUnreadCount(userId) {
    const count = await Notification.countDocuments({ userId, isRead: false });
    return { count };
  }

  async markRead(userId, notificationId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      throw new AppError('NOT_FOUND', 404, 'Notification not found');
    }
    return { read: true, id: notification._id.toString() };
  }

  async markAllRead(userId) {
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });
    return { read: true };
  }
}

module.exports = new NotificationService();
