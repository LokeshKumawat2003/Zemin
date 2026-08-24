const express = require('express');
const liveController = require('../controllers/live.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/active', liveController.active);
router.get('/vip', liveController.vipRooms);
router.get('/:roomId', liveController.getRoom);
router.post('/create', authenticate, liveController.create);
router.post('/create-vip', authenticate, liveController.createVip);
router.post('/start', authenticate, liveController.start);
router.post('/join', authenticate, liveController.join);
router.post('/leave', authenticate, liveController.leave);
router.post('/end', authenticate, liveController.end);

module.exports = router;
