const express = require('express');
const creatorController = require('../controllers/creator.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/follow', authenticate, creatorController.follow);
router.post('/unfollow', authenticate, creatorController.unfollow);
router.post('/apply', authenticate, creatorController.applyCreator);
router.get('/:username/followers', optionalAuth, creatorController.getFollowers);
router.get('/:username/following', optionalAuth, creatorController.getFollowing);
router.get('/:username/posts', optionalAuth, creatorController.getCreatorPosts);
router.get('/:username', optionalAuth, creatorController.getCreator);

module.exports = router;
