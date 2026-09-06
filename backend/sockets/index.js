const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwt.util');
const { allowedOrigins } = require('../config/env');
const Conversation = require('../models/Conversation.model');
const Message = require('../models/Message.model');

let io;
const onlineUsers = new Map();

const emitLiveViewerCount = (roomId) => {
  if (!roomId) return;
  const count = io.sockets.adapter.rooms.get(`live:${roomId}`)?.size || 0;
  io.to(`live:${roomId}`).emit('live:viewer_count', {
    roomId,
    count,
  });
};

const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: allowedOrigins, credentials: true },
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = verifyAccessToken(token);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    onlineUsers.set(socket.userId, (onlineUsers.get(socket.userId) || 0) + 1);
    io.emit('presence:update', { userId: socket.userId, online: true });

    socket.on('live:join', ({ roomId }) => {
      if (!roomId) return;
      socket.join(`live:${roomId}`);
      socket.data.liveRooms = socket.data.liveRooms || new Set();
      socket.data.liveRooms.add(roomId);
      emitLiveViewerCount(roomId);
    });

    socket.on('live:leave', ({ roomId }) => {
      if (!roomId) return;
      socket.leave(`live:${roomId}`);
      socket.data.liveRooms = socket.data.liveRooms || new Set();
      socket.data.liveRooms.delete(roomId);
      emitLiveViewerCount(roomId);
    });

    socket.on('live:chat', ({ roomId, text }) => {
      if (!text?.trim()) return;
      io.to(`live:${roomId}`).emit('live:chat_message', {
        userId: socket.userId,
        text: text.trim().slice(0, 200),
        sentAt: new Date().toISOString(),
      });
    });

    socket.on('chat:join', async ({ conversationId }) => {
      if (!conversationId) return;
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: socket.userId,
      }).select('participants');
      if (!conversation) return;

      socket.join(`chat:${conversationId}`);
      conversation.participants.forEach((userId) => {
        const id = userId.toString();
        socket.emit('presence:update', { userId: id, online: onlineUsers.has(id) });
      });
    });

    socket.on('chat:leave', ({ conversationId }) => {
      if (conversationId) socket.leave(`chat:${conversationId}`);
    });

    socket.on('chat:read', async ({ conversationId }) => {
      if (!conversationId) return;
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: socket.userId,
      }).select('_id');
      if (!conversation) return;

      const unreadMessages = await Message.find({
        conversationId,
        senderId: { $ne: socket.userId },
        isRead: false,
        isDeleted: false,
      }).select('_id');
      if (!unreadMessages.length) return;

      const messageIds = unreadMessages.map((message) => message._id.toString());
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { isRead: true, readAt: new Date() }
      );
      io.to(`chat:${conversationId}`).emit('chat:read', { conversationId, messageIds });
    });

    socket.on('chat:typing', ({ conversationId }) => {
      if (conversationId) {
        socket.to(`chat:${conversationId}`).emit('chat:typing', {
          conversationId,
          userId: socket.userId,
        });
      }
    });

    socket.on('disconnect', () => {
      const connections = (onlineUsers.get(socket.userId) || 1) - 1;
      if (connections > 0) {
        onlineUsers.set(socket.userId, connections);
      } else {
        onlineUsers.delete(socket.userId);
        io.emit('presence:update', { userId: socket.userId, online: false });
      }

      const liveRooms = socket.data.liveRooms || [];
      for (const roomId of liveRooms) {
        emitLiveViewerCount(roomId);
      }
    });
  });

  console.log('Socket.IO initialized');
  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
