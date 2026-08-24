const express = require('express');
const subscriptionController = require('../controllers/subscription.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.get('/tiers/:username', subscriptionController.getTiers);
router.post('/tier/create', authenticate, authorize('creator', 'admin'), subscriptionController.createTier);
router.post('/create', authenticate, subscriptionController.subscribe);
router.post('/cancel', authenticate, subscriptionController.cancel);
router.get('/my-subscriptions', authenticate, subscriptionController.mySubscriptions);

module.exports = router;
