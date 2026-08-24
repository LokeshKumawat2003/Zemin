const Comment = require('../models/Comment.model');
const Post = require('../models/Post.model');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');
const notificationService = require('./notification.service');

class CommentService {
  async getComments(postId, { skip, limit }) {
    const post = await Post.findById(postId);
    if (!post || post.isDeleted) throw new AppError('NOT_FOUND', 404, 'Post not found');

    const [items, total] = await Promise.all([
      Comment.find({ postId, isDeleted: false, parentCommentId: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username displayName avatar isVerified'),
      Comment.countDocuments({ postId, isDeleted: false, parentCommentId: null }),
    ]);

    return {
      items: items.map((c) => ({
        id: c._id.toString(),
        postId: c.postId.toString(),
        text: c.text,
        likesCount: c.likesCount,
        user: {
          id: c.userId._id.toString(),
          username: c.userId.username,
          displayName: c.userId.displayName,
          avatar: c.userId.avatar,
          isVerified: c.userId.isVerified,
        },
        createdAt: c.createdAt,
      })),
      total,
    };
  }

  async addComment(userId, { postId, text, parentCommentId }) {
    const post = await Post.findById(postId);
    if (!post || post.isDeleted) throw new AppError('NOT_FOUND', 404, 'Post not found');

    const comment = await Comment.create({
      postId,
      userId,
      text,
      parentCommentId: parentCommentId || null,
    });

    post.stats.commentsCount += 1;
    await post.save();

    const user = await User.findById(userId).select('username displayName avatar isVerified');

    if (post.userId.toString() !== userId.toString()) {
      try {
        await notificationService.create({
          userId: post.userId,
          type: 'comment',
          title: 'New comment',
          body: `${user?.displayName || user?.username || 'Someone'} commented on your post`,
          data: {
            targetType: 'post',
            targetId: postId,
            commentId: comment._id,
            actorUsername: user?.username,
          },
          sendPush: true,
        });
      } catch (err) {
        console.warn('[CommentService] comment notification failed:', err.message || err);
      }
    }

    return {
      id: comment._id.toString(),
      postId: postId.toString(),
      text: comment.text,
      likesCount: 0,
      user: {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        isVerified: user.isVerified,
      },
      createdAt: comment.createdAt,
    };
  }
}

module.exports = new CommentService();
