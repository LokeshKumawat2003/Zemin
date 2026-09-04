const { subscriptionService } = require('../services/user.service');
const { success } = require('../utils/response.util');

exports.getTiers = async (req, res, next) => {
  try {
    const creator = await require('../models/User.model').findOne({
      username: req.params.username.toLowerCase(),
    });
    if (!creator) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    const data = await subscriptionService.getTiers(creator._id);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.createTier = async (req, res, next) => {
  try {
    const data = await subscriptionService.createTier(req.user._id, req.body);
    success(res, data, 'Tier created', 201);
  } catch (err) {
    next(err);
  }
};

exports.updateTier = async (req, res, next) => {
  try {
    const data = await subscriptionService.updateTier(req.user._id, req.params.tierId, req.body);
    success(res, data, 'Subscription plan updated');
  } catch (err) {
    next(err);
  }
};

exports.subscribe = async (req, res, next) => {
  try {
    const data = await subscriptionService.subscribe(req.user._id, req.body.tierId);
    success(res, data, 'Subscribed successfully', 201);
  } catch (err) {
    next(err);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const data = await subscriptionService.cancel(req.user._id, req.body.subscriptionId);
    success(res, data, 'Subscription cancelled');
  } catch (err) {
    next(err);
  }
};

exports.mySubscriptions = async (req, res, next) => {
  try {
    const data = await subscriptionService.mySubscriptions(req.user._id);
    success(res, data);
  } catch (err) {
    next(err);
  }
};
