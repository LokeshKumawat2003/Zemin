const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getAuthModels } = require('../config/database');
// Main database models
const Wallet = require('../models/Wallet.model');
const Creator = require('../models/Creator.model');
const AppError = require('../utils/AppError');
const { hashPassword, comparePassword } = require('../utils/bcrypt.util');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt.util');

const LOCK_TIME_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const OTP_EXPIRY_MS = 5 * 60 * 1000;

const generateOtp = () => String(crypto.randomInt(100000, 999999));

const issueTokens = async (user, deviceId) => {
  const { RefreshToken } = getAuthModels();
  const accessToken = signAccessToken({ userId: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken({ userId: user._id.toString(), tokenId: uuidv4() });

  await RefreshToken.create({
    userId: user._id,
    tokenHash: RefreshToken.hashToken(refreshToken),
    deviceId,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresIn: 900,
    refreshTokenExpiresIn: 30 * 24 * 60 * 60,
  };
};

class AuthService {
  async checkUsername(username) {
    const { User } = getAuthModels();
    const exists = await User.findOne({ username: username.toLowerCase(), isDeleted: false });
    return { available: !exists };
  }

  async register({ username, email, phone, password, registrationMethod }) {
    const { User, OtpCode } = getAuthModels();
    const normalizedUsername = username.toLowerCase();

    if (await User.findOne({ username: normalizedUsername })) {
      throw new AppError('USERNAME_TAKEN', 409, 'Username already taken');
    }
    if (email && (await User.findOne({ email: email.toLowerCase() }))) {
      throw new AppError('EMAIL_EXISTS', 409, 'Email already registered');
    }
    if (phone && (await User.findOne({ phone }))) {
      throw new AppError('PHONE_EXISTS', 409, 'Phone already registered');
    }

    const user = await User.create({
      username: normalizedUsername,
      email: email?.toLowerCase(),
      phone,
      passwordHash: await hashPassword(password),
      displayName: normalizedUsername,
      isVerified: false,
      isCreator: true,
    });

    await Wallet.create({ userId: user._id });
    await Creator.create({ userId: user._id });

    const otp = generateOtp();
    await OtpCode.findOneAndUpdate(
      { userId: user._id, purpose: 'registration' },
      {
        codeHash: OtpCode.hashCode(otp),
        attempts: 0,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      },
      { upsert: true }
    );

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV OTP] user=${user._id} otp=${otp}`);
    }

    return {
      userId: user._id,
      username: user.username,
      email: user.email,
      otpSent: true,
      otpExpiresIn: 300,
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
    };
  }

  async verifyOtp({ userId, otp, purpose }) {
    const { User, OtpCode } = getAuthModels();
    const record = await OtpCode.findOne({ userId, purpose });
    if (!record || record.expiresAt < new Date()) {
      throw new AppError('OTP_EXPIRED', 400, 'Code expired. Request a new one');
    }
    if (record.attempts >= 3) {
      throw new AppError('OTP_MAX_ATTEMPTS', 400, 'Too many attempts. Request new code');
    }

    if (OtpCode.hashCode(otp) !== record.codeHash) {
      record.attempts += 1;
      await record.save();
      throw new AppError('OTP_INVALID', 400, 'Invalid verification code');
    }

    await OtpCode.deleteOne({ _id: record._id });

    const user = await User.findById(userId);
    if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');

    user.isVerified = true;
    await user.save();

    const tokens = await issueTokens(user);
    return { verified: true, user: user.toPublicJSON(), tokens };
  }

  async login({ identifier, password, deviceId, fcmToken }) {
    const { User } = getAuthModels();
    const query = identifier.includes('@')
      ? { email: identifier.toLowerCase() }
      : identifier.startsWith('+')
        ? { phone: identifier }
        : { username: identifier.toLowerCase() };

    const user = await User.findOne({ ...query, isDeleted: false });
    if (!user) throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');

    if (user.lockUntil && user.lockUntil > new Date()) {
      const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
      throw new AppError('ACCOUNT_LOCKED', 423, `Account locked. Try again in ${mins} minutes`);
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
        user.loginAttempts = 0;
      }
      await user.save();
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
    }

    if (!user.isVerified) {
      throw new AppError('OTP_NOT_VERIFIED', 403, 'Please verify your account first');
    }

    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    user.lastActiveAt = new Date();
    if (fcmToken) {
      user.fcmTokens = user.fcmTokens || [];
      if (!user.fcmTokens.includes(fcmToken)) {
        user.fcmTokens.push(fcmToken);
      }
    }
    await user.save();

    const tokens = await issueTokens(user, deviceId);
    return { user: user.toPublicJSON(), tokens };
  }

  async refreshToken(refreshToken) {
    const { User, RefreshToken } = getAuthModels();
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('TOKEN_INVALID', 401, 'Invalid refresh token');
    }

    const stored = await RefreshToken.findOne({
      userId: decoded.userId,
      tokenHash: RefreshToken.hashToken(refreshToken),
      isRevoked: false,
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError('TOKEN_INVALID', 401, 'Refresh token expired');
    }

    stored.isRevoked = true;
    await stored.save();

    const user = await User.findById(decoded.userId);
    if (!user || user.isBanned) {
      throw new AppError('FORBIDDEN', 403, 'Account unavailable');
    }

    const tokens = await issueTokens(user, stored.deviceId);
    return tokens;
  }

  async logout(refreshToken) {
    const { RefreshToken } = getAuthModels();
    if (!refreshToken) return;
    await RefreshToken.findOneAndUpdate(
      { tokenHash: RefreshToken.hashToken(refreshToken) },
      { isRevoked: true }
    );
  }

  async getMe(userId) {
    const { User } = getAuthModels();
    const user = await User.findById(userId);
    if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');

    const wallet = await Wallet.findOne({ userId });
    const profile = user.toPublicJSON();

    return {
      ...profile,
      coinBalance: wallet?.coinBalance || 0,
      walletBalance: (wallet?.fiatBalance || 0) / 100,
    };
  }

  async forgotPassword({ identifier }) {
    const { User, OtpCode } = getAuthModels();
    const query = identifier.includes('@')
      ? { email: identifier.toLowerCase() }
      : { username: identifier.toLowerCase() };

    const user = await User.findOne({ ...query, isDeleted: false });
    if (!user) {
      throw new AppError('NOT_FOUND', 404, 'No account found with that email or username');
    }

    const otp = generateOtp();
    await OtpCode.findOneAndUpdate(
      { userId: user._id, purpose: 'password_reset' },
      {
        codeHash: OtpCode.hashCode(otp),
        attempts: 0,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      },
      { upsert: true }
    );

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV OTP reset] user=${user._id} otp=${otp}`);
    }

    return {
      userId: user._id,
      otpSent: true,
      otpExpiresIn: 300,
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
    };
  }

  async resetPassword({ userId, otp, newPassword }) {
    const { User, OtpCode } = getAuthModels();
    const record = await OtpCode.findOne({ userId, purpose: 'password_reset' });
    if (!record || record.expiresAt < new Date()) {
      throw new AppError('OTP_EXPIRED', 400, 'Code expired. Request a new one');
    }
    if (record.attempts >= 3) {
      throw new AppError('OTP_MAX_ATTEMPTS', 400, 'Too many attempts. Request new code');
    }

    if (OtpCode.hashCode(otp) !== record.codeHash) {
      record.attempts += 1;
      await record.save();
      throw new AppError('OTP_INVALID', 400, 'Invalid verification code');
    }

    await OtpCode.deleteOne({ _id: record._id });

    const user = await User.findById(userId);
    if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');

    user.passwordHash = await hashPassword(newPassword);
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    return { reset: true };
  }

  // ==== Admin Authentication ====
  async adminLogin({ username, email, identifier, password, deviceId, fcmToken }) {
    const { User } = getAuthModels();
    const loginValue = (identifier ?? username ?? email ?? '').trim();
    const normalizedLogin = loginValue.toLowerCase();

    const user = await User.findOne({
      isDeleted: false,
      $or: [
        { username: normalizedLogin },
        { email: normalizedLogin },
      ],
    });

    if (!user) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email/username or password');
    }

    if (user.role !== 'admin') {
      throw new AppError('FORBIDDEN', 403, 'Admin access required');
    }

    if (user.isBanned) {
      throw new AppError('ACCOUNT_BANNED', 423, 'Admin account has been banned');
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
      throw new AppError('ACCOUNT_LOCKED', 423, `Account locked. Try again in ${mins} minutes`);
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
        user.loginAttempts = 0;
      }
      await user.save();
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid username or password');
    }

    if (!user.isVerified) {
      throw new AppError('EMAIL_NOT_VERIFIED', 403, 'Admin account not verified');
    }

    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    user.lastActiveAt = new Date();
    if (fcmToken) {
      user.fcmTokens = user.fcmTokens || [];
      if (!user.fcmTokens.includes(fcmToken)) {
        user.fcmTokens.push(fcmToken);
      }
    }
    await user.save();

    const tokens = await issueTokens(user, deviceId);
    
    return { 
      user: {
        ...user.toPublicJSON(),
        role: 'admin',
        permissions: ['all'], // Admins have all permissions
      }, 
      tokens 
    };
  }

  async adminRegister({ username, email, password, adminSecret }) {
    const { User, OtpCode } = getAuthModels();
    
    // Verify admin secret (should be in environment variable)
    if (adminSecret !== process.env.ADMIN_SECRET_KEY) {
      throw new AppError('INVALID_SECRET', 403, 'Invalid admin secret key');
    }

    const normalizedUsername = username.toLowerCase();

    if (await User.findOne({ username: normalizedUsername })) {
      throw new AppError('USERNAME_TAKEN', 409, 'Username already taken');
    }
    if (email && (await User.findOne({ email: email.toLowerCase() }))) {
      throw new AppError('EMAIL_EXISTS', 409, 'Email already registered');
    }

    const user = await User.create({
      username: normalizedUsername,
      email: email?.toLowerCase(),
      passwordHash: await hashPassword(password),
      displayName: username,
      isVerified: false,
      role: 'admin',
      isCreator: false,
    });

    const otp = generateOtp();
    await OtpCode.findOneAndUpdate(
      { userId: user._id, purpose: 'registration' },
      {
        codeHash: OtpCode.hashCode(otp),
        attempts: 0,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      },
      { upsert: true }
    );

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV ADMIN OTP] user=${user._id} otp=${otp}`);
    }

    return {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: 'admin',
      otpSent: true,
      otpExpiresIn: 300,
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
    };
  }

  async verifyAdminOtp({ userId, otp }) {
    const { User, OtpCode } = getAuthModels();
    
    const record = await OtpCode.findOne({ userId, purpose: 'registration' });
    if (!record || record.expiresAt < new Date()) {
      throw new AppError('OTP_EXPIRED', 400, 'Code expired. Request a new one');
    }
    if (record.attempts >= 3) {
      throw new AppError('OTP_MAX_ATTEMPTS', 400, 'Too many attempts. Request new code');
    }

    if (OtpCode.hashCode(otp) !== record.codeHash) {
      record.attempts += 1;
      await record.save();
      throw new AppError('OTP_INVALID', 400, 'Invalid verification code');
    }

    await OtpCode.deleteOne({ _id: record._id });

    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      throw new AppError('NOT_FOUND', 404, 'Admin account not found');
    }

    user.isVerified = true;
    await user.save();

    const tokens = await issueTokens(user);
    return { 
      verified: true, 
      user: {
        ...user.toPublicJSON(),
        role: 'admin',
      }, 
      tokens 
    };
  }
}

module.exports = new AuthService();
