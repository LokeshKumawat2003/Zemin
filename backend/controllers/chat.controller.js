const chatService = require('../services/chat.service');
const { success, paginated } = require('../utils/response.util');
const { getPagination } = require('../utils/pagination.util');

exports.getConversations = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { items, total } = await chatService.getConversations(req.user._id, { skip, limit });
    paginated(res, items, page, limit, total);
  } catch (err) {
    next(err);
  }
};

exports.startConversation = async (req, res, next) => {
  try {
    const data = await chatService.startConversation(req.user._id, req.body.recipientId);
    success(res, data, 'Conversation ready', 201);
  } catch (err) {
    next(err);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { items, total } = await chatService.getMessages(req.user._id, req.params.conversationId, {
      skip,
      limit,
    });
    paginated(res, items, page, limit, total);
  } catch (err) {
    next(err);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const data = await chatService.sendMessage(req.user._id, req.body);
    success(res, data, 'Message sent', 201);
  } catch (err) {
    next(err);
  }
};
