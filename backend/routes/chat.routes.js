const express = require('express');
const chatController = require('../controllers/chat.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/conversations', authenticate, chatController.getConversations);
router.post('/start', authenticate, chatController.startConversation);
router.get('/messages/:conversationId', authenticate, chatController.getMessages);
router.post('/send', authenticate, chatController.sendMessage);

module.exports = router;
