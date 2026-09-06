const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.get('/getAccountDetail', authenticate, authorize('admin'), userController.getAccountDetail);
router.put('/profile', authenticate, userController.updateProfile);
router.get('/posts', authenticate, userController.getMyPosts);
router.get('/settings', authenticate, userController.getSettings);
router.put('/settings', authenticate, userController.updateSettings);
router.post('/push-token', authenticate, userController.registerPushToken);
router.post('/block/:userId', authenticate, userController.blockUser);

module.exports = router;
