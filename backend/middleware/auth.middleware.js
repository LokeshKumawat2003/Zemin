const AppError = require('../utils/AppError');
const { getAuthModels } = require('../config/database');
const { verifyAccessToken } = require('../utils/jwt.util');

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('TOKEN_MISSING', 401, 'Authentication required');
    }

    const token = header.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const { User } = getAuthModels();
    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user || user.isDeleted) {
      throw new AppError('NOT_FOUND', 404, 'User not found');
    }
    if (user.isBanned) {
      throw new AppError('ACCOUNT_BANNED', 403, 'Account has been suspended');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('TOKEN_EXPIRED', 401, 'Access token expired'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError('TOKEN_INVALID', 401, 'Invalid access token'));
    }
    next(err);
  }
};

const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  return authenticate(req, res, next);
};

module.exports = { authenticate, optionalAuth };
