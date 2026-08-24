const authService = require('../services/auth.service');
const { success } = require('../utils/response.util');

exports.register = async (req, res, next) => {
  try {
    const data = await authService.register(req.body);
    success(res, data, 'Registration successful. OTP sent.', 201);
  } catch (err) {
    next(err);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const data = await authService.verifyOtp(req.body);
    success(res, data, 'Verification successful');
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const data = await authService.login(req.body);
    success(res, data, 'Login successful');
  } catch (err) {
    next(err);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const tokens = await authService.refreshToken(req.body.refreshToken);
    success(res, tokens, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await authService.logout(req.body.refreshToken);
    success(res, null, 'Logged out');
  } catch (err) {
    next(err);
  }
};

exports.checkUsername = async (req, res, next) => {
  try {
    const data = await authService.checkUsername(req.query.username);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const data = await authService.getMe(req.user._id);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const data = await authService.forgotPassword(req.body);
    success(res, data, 'Reset code sent');
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const data = await authService.resetPassword(req.body);
    success(res, data, 'Password reset successful');
  } catch (err) {
    next(err);
  }
};

// ==== Admin Authentication ====
exports.adminLogin = async (req, res, next) => {
  try {
    const data = await authService.adminLogin(req.body);
    success(res, data, 'Admin login successful');
  } catch (err) {
    next(err);
  }
};

exports.adminRegister = async (req, res, next) => {
  try {
    const data = await authService.adminRegister(req.body);
    success(res, data, 'Admin registration successful. OTP sent.', 201);
  } catch (err) {
    next(err);
  }
};

exports.verifyAdminOtp = async (req, res, next) => {
  try {
    const data = await authService.verifyAdminOtp(req.body);
    success(res, data, 'Admin verification successful');
  } catch (err) {
    next(err);
  }
};
