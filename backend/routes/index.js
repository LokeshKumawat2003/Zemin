const express = require('express');
const authRoutes = require('./auth.routes');
const postRoutes = require('./post.routes');
const creatorRoutes = require('./creator.routes');
const walletRoutes = require('./wallet.routes');
const giftRoutes = require('./gift.routes');
const liveRoutes = require('./live.routes');
const chatRoutes = require('./chat.routes');
const notificationRoutes = require('./notification.routes');
const searchRoutes = require('./search.routes');
const userRoutes = require('./user.routes');
const subscriptionRoutes = require('./subscription.routes');
const uploadRoutes = require('./upload.routes');
const reportRoutes = require('./report.routes');
const paymentRoutes = require('./payment.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/feed', postRoutes);
router.use('/post', postRoutes);
router.use('/creator', creatorRoutes);
router.use('/wallet', walletRoutes);
router.use('/coin', walletRoutes);
router.use('/gift', giftRoutes);
router.use('/live', liveRoutes);
router.use('/chat', chatRoutes);
router.use('/notifications', notificationRoutes);
router.use('/search', searchRoutes);
router.use('/user', userRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/upload', uploadRoutes);
router.use('/report', reportRoutes);
router.use('/payment', paymentRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
