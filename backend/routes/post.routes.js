const express = require('express');
const postController = require('../controllers/post.controller');
const commentController = require('../controllers/comment.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.get('/following', authenticate, postController.followingFeed);
router.get('/for-you', optionalAuth, postController.forYouFeed);

router.post('/create', authenticate, authorize('creator', 'admin'), postController.createPost);
router.post('/purchase-ppv', authenticate, postController.purchasePpv);
router.get('/:postId/comments', optionalAuth, commentController.getComments);
router.post('/comment', authenticate, commentController.addComment);
router.get('/:postId', optionalAuth, postController.getPost);
router.post('/like', authenticate, postController.likePost);
router.post('/unlike', authenticate, postController.unlikePost);

module.exports = router;
