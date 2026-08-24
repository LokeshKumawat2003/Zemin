const commentService = require('../services/comment.service');
const { paginated, success } = require('../utils/response.util');
const { getPagination } = require('../utils/pagination.util');

exports.getComments = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { items, total } = await commentService.getComments(req.params.postId, { skip, limit });
    paginated(res, items, page, limit, total);
  } catch (err) {
    next(err);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const data = await commentService.addComment(req.user._id, {
      postId: req.body.postId,
      text: req.body.text,
      parentCommentId: req.body.parentCommentId,
    });
    success(res, data, 'Comment added', 201);
  } catch (err) {
    next(err);
  }
};
