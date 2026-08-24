const { userService } = require('../services/user.service');
const Post = require('../models/Post.model');
const { getPagination } = require('../utils/pagination.util');
const { success, paginated } = require('../utils/response.util');

exports.updateProfile = async (req, res, next) => {
  try {
    const data = await userService.updateProfile(req.user._id, req.body);
    success(res, data, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

exports.getSettings = async (req, res, next) => {
  try {
    const data = await userService.getSettings(req.user._id);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.registerPushToken = async (req, res, next) => {
  try {
    const data = await userService.registerPushToken(req.user._id, req.body.token);
    success(res, data, 'Push token registered');
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const data = await userService.updateSettings(req.user._id, req.body);
    success(res, data, 'Settings updated');
  } catch (err) {
    next(err);
  }
};

exports.getAccountDetail = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    return success(res, {
      id: user._id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isVerified: user.isVerified,
      avatar: user.avatar,
      phone: user.phone,
      createdAt: user.createdAt,
    }, 'Admin account details fetched successfully');
  } catch (err) {
    next(err);
  }
};

exports.getMyPosts = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { userId: req.user._id, isDeleted: false };
    const [posts, total] = await Promise.all([
      Post.find(filter).sort({ publishedAt: -1 }).skip(skip).limit(limit),
      Post.countDocuments(filter),
    ]);
    paginated(res, posts, page, limit, total);
  } catch (err) {
    next(err);
  }
};
