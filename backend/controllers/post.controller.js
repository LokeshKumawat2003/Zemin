const { postService, feedService } = require('../services/post.service');
const { success, paginated } = require('../utils/response.util');
const { getPagination } = require('../utils/pagination.util');

exports.createPost = async (req, res, next) => {
  try {
    const post = await postService.createPost(req.user._id, req.body);
    success(res, { postId: post._id, type: post.type, visibility: post.visibility }, 'Post created', 201);
  } catch (err) {
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  try {
    const post = await postService.getPost(req.params.postId, req.user?._id);
    success(res, post);
  } catch (err) {
    next(err);
  }
};

exports.likePost = async (req, res, next) => {
  try {
    const data = await postService.likePost(req.user._id, req.body.postId);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.unlikePost = async (req, res, next) => {
  try {
    const data = await postService.unlikePost(req.user._id, req.body.postId);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.followingFeed = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { posts, total } = await feedService.getFollowingFeed(req.user._id, { skip, limit });
    paginated(res, posts, page, limit, total);
  } catch (err) {
    next(err);
  }
};

exports.forYouFeed = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { posts, total } = await feedService.getForYouFeed({ skip, limit });
    paginated(res, posts, page, limit, total);
  } catch (err) {
    next(err);
  }
};

exports.purchasePpv = async (req, res, next) => {
  try {
    const data = await postService.purchasePpv(req.user._id, req.body.postId);
    success(res, data, 'Post unlocked');
  } catch (err) {
    next(err);
  }
};
