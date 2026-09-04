const { followService, creatorService } = require('../services/social.service');
const { postService } = require('../services/post.service');
const { success } = require('../utils/response.util');
const Post = require('../models/Post.model');
const { getPagination } = require('../utils/pagination.util');
const { paginated } = require('../utils/response.util');

exports.follow = async (req, res, next) => {
  try {
    const data = await followService.follow(req.user._id, req.body.creatorId);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.unfollow = async (req, res, next) => {
  try {
    const data = await followService.unfollow(req.user._id, req.body.creatorId);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.getFollowers = async (req, res, next) => {
  try {
    const profile = await creatorService.getByUsername(req.params.username, req.user?._id);
    const { page, limit, skip } = getPagination(req.query);
    const data = await followService.getRelationshipList(profile.id, req.user?._id, 'followers', { page, limit, skip });
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.getFollowing = async (req, res, next) => {
  try {
    const profile = await creatorService.getByUsername(req.params.username, req.user?._id);
    const { page, limit, skip } = getPagination(req.query);
    const data = await followService.getRelationshipList(profile.id, req.user?._id, 'following', { page, limit, skip });
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.getCreator = async (req, res, next) => {
  try {
    const data = await creatorService.getByUsername(req.params.username, req.user?._id);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.applyCreator = async (req, res, next) => {
  try {
    const data = await creatorService.applyCreator(req.user._id, req.body);
    success(res, data, 'Creator application submitted', 201);
  } catch (err) {
    next(err);
  }
};

exports.getCreatorPosts = async (req, res, next) => {
  try {
    const user = await creatorService.getByUsername(req.params.username);
    const { page, limit, skip } = getPagination(req.query);
    const filter = { userId: user.id, isDeleted: false, visibility: { $in: ['public', 'ppv'] } };
    const [posts, total] = await Promise.all([
      postService.getCreatorPosts(req.user?._id, user.id, { skip, limit }),
      Post.countDocuments(filter),
    ]);
    paginated(res, posts, page, limit, total);
  } catch (err) {
    next(err);
  }
};
