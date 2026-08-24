const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

router.get('/isLoggedIn', adminController.isLoggedIn);
router.get('/me', adminController.isLoggedIn);

// ==== User Management ====
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.get('/users/:userId/payment-methods', adminController.getUserPaymentMethods);
router.delete('/users/:userId/payment-methods/:paymentMethodId', adminController.deleteUserPaymentMethod);
router.patch('/users/:userId/ban', adminController.banUser);
router.patch('/users/:userId/unban', adminController.unbanUser);
router.patch('/users/:userId/role', adminController.updateUserRole);

// ==== Creator Management ====
router.get('/creators', adminController.getAllCreators);
router.get('/creators/:creatorId', adminController.getCreatorDetails);
router.patch('/creators/:creatorId/approve', adminController.approveCreator);
router.patch('/creators/:creatorId/reject', adminController.rejectCreator);
router.patch('/creators/:creatorId/suspend', adminController.suspendCreator);

// ==== Content Management ====
router.get('/content/posts', adminController.getAllPosts);
router.get('/content/posts/:postId', adminController.getPostDetails);
router.patch('/content/posts/:postId/hide', adminController.hidePost);
router.patch('/content/posts/:postId/restore', adminController.restorePost);
router.get('/content/comments', adminController.getAllComments);
router.get('/content/comments/:commentId', adminController.getCommentDetails);
router.patch('/content/comments/:commentId/restore', adminController.restoreComment);

// ==== Admin Activity ====
router.get('/activity', adminController.getActivity);

// ==== Notification Management ====
router.get('/notifications', adminController.getAllNotifications);
router.get('/notifications/unread-count', adminController.getUnreadNotificationCount);
router.get('/notifications/:notificationId', adminController.getNotificationDetails);
router.put('/notifications/:notificationId/read', adminController.markNotificationRead);
router.put('/notifications/read-all', adminController.markAllNotificationsRead);
router.post('/notifications/send', adminController.sendNotification);
router.post('/notifications/broadcast', adminController.broadcastNotification);

// ==== Chat Management ====
router.get('/chats', adminController.getAllChats);
router.get('/chats/:conversationId', adminController.getChatDetails);
router.get('/chats/:conversationId/messages', adminController.getChatMessages);

// ==== Payment Management ====
router.get('/payments', adminController.getAllPayments);
router.get('/payments/:paymentId', adminController.getPaymentDetails);
router.get('/payouts', adminController.getAllPayouts);
router.get('/payouts/:payoutId', adminController.getPayoutDetails);
router.patch('/payouts/:payoutId/approve', adminController.approvePayout);
router.patch('/payouts/:payoutId/reject', adminController.rejectPayout);

// ==== Report Management ====
router.get('/reports', adminController.getAllReports);
router.get('/reports/:reportId', adminController.getReportDetails);
router.patch('/reports/:reportId/resolve', adminController.resolveReport);
router.patch('/reports/:reportId/dismiss', adminController.dismissReport);

// ==== Content Moderation ====
router.delete('/content/posts/:postId', adminController.deletePost);
router.delete('/content/comments/:commentId', adminController.deleteComment);
router.delete('/content/live/:liveId', adminController.deleteLiveStream);

// ==== Statistics & Analytics ====
router.get('/stats/dashboard', adminController.getDashboardStats);
router.get('/stats/users', adminController.getUserStats);
router.get('/stats/reports', adminController.getReportStats);
router.get('/stats/financial', adminController.getFinancialStats);

// ==== Moderation Log ====
router.get('/logs/moderation', adminController.getModerationLog);

// ==== Live Management ====
router.get('/live', adminController.getAllLiveStreams);
router.get('/live/:liveId', adminController.getLiveStreamDetails);
router.patch('/live/:liveId/warn', adminController.warnLiveStream);
router.delete('/live/:liveId/stop', adminController.stopLiveStream);

module.exports = router;
