const Conversation = require('../models/Conversation.model');
const Message = require('../models/Message.model');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');
const notificationService = require('./notification.service');

const getUnreadCount = (unreadCounts, userId) => {
  if (!unreadCounts) return 0;
  if (typeof unreadCounts.get === 'function') {
    return unreadCounts.get(userId.toString()) || 0;
  }
  return unreadCounts[userId.toString()] || 0;
};

class ChatService {
  async getConversations(userId, { skip, limit }) {
    const filter = { participants: userId };
    const [items, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Conversation.countDocuments(filter),
    ]);

    const enriched = await Promise.all(
      items.map(async (conv) => {
        const otherId = conv.participants.find((p) => p.toString() !== userId.toString());
        const participant = await User.findById(otherId).select('username displayName avatar isVerified isCreator');
        return {
          conversationId: conv._id,
          participant: participant
            ? {
                id: participant._id,
                username: participant.username,
                displayName: participant.displayName,
                avatar: participant.avatar,
                isVerified: participant.isVerified,
                isCreator: participant.isCreator,
              }
            : null,
          lastMessage: conv.lastMessage,
          unreadCount: getUnreadCount(conv.unreadCounts, userId),
          updatedAt: conv.updatedAt,
        };
      })
    );

    return { items: enriched, total };
  }

  async startConversation(userId, recipientId) {
    if (userId.toString() === recipientId.toString()) {
      throw new AppError('VALIDATION_ERROR', 400, 'Cannot message yourself');
    }

    const recipient = await User.findById(recipientId);
    if (!recipient || recipient.isDeleted) {
      throw new AppError('NOT_FOUND', 404, 'User not found');
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [userId, recipientId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, recipientId],
        unreadCounts: new Map(),
      });
    }

    return { conversationId: conversation._id };
  }

  async getMessages(userId, conversationId, { skip, limit }) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.some((p) => p.equals(userId))) {
      throw new AppError('FORBIDDEN', 403, 'Access denied');
    }

    const [messages, total] = await Promise.all([
      Message.find({ conversationId, isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'username displayName avatar'),
      Message.countDocuments({ conversationId, isDeleted: false }),
    ]);

    await Message.updateMany(
      { conversationId, senderId: { $ne: userId }, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return {
      items: messages.reverse().map((m) => ({
        id: m._id,
        conversationId: m.conversationId,
        senderId: m.senderId._id,
        sender: {
          username: m.senderId.username,
          displayName: m.senderId.displayName,
          avatar: m.senderId.avatar,
        },
        type: m.type,
        text: m.text,
        isRead: m.isRead,
        sentAt: m.createdAt,
        isMine: m.senderId._id.equals(userId),
      })),
      total,
    };
  }

  async sendMessage(userId, { conversationId, text, type = 'text' }) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.some((p) => p.equals(userId))) {
      throw new AppError('FORBIDDEN', 403, 'Access denied');
    }

    const message = await Message.create({
      conversationId,
      senderId: userId,
      type,
      text,
    });

    const recipientId = conversation.participants.find((p) => !p.equals(userId));
    const unread = conversation.unreadCounts || new Map();
    const key = recipientId.toString();
    unread.set(key, (unread.get(key) || 0) + 1);

    conversation.lastMessage = {
      text,
      type,
      senderId: userId,
      sentAt: message.createdAt,
    };
    conversation.unreadCounts = unread;
    conversation.updatedAt = new Date();
    await conversation.save();

    const sender = await User.findById(userId).select('username displayName avatar');

    const payload = {
      id: message._id.toString(),
      conversationId: conversationId.toString(),
      senderId: userId.toString(),
      text,
      type,
      sentAt: message.createdAt,
      sender: {
        username: sender.username,
        displayName: sender.displayName,
        avatar: sender.avatar,
      },
      isMine: true,
    };

    try {
      await notificationService.create({
        userId: recipientId,
        type: 'message',
        title: 'New message',
        body: `${sender.displayName || sender.username} sent you a message`,
        data: {
          targetType: 'chat',
          targetId: conversationId,
          actorUsername: sender.username,
          actorName: sender.displayName || sender.username,
        },
        sendPush: true,
      });
    } catch (err) {
      console.warn('[ChatService] notification create failed:', err.message || err);
    }

    try {
      const { getIO } = require('../sockets');
      const io = getIO();
      if (io) {
        io.to(`user:${recipientId.toString()}`).emit('chat:message', payload);
        io.to(`user:${userId.toString()}`).emit('chat:message', payload);
      }
    } catch {
      // socket optional during tests
    }

    return payload;
  }
}

module.exports = new ChatService();
