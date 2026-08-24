const AppError = require('../utils/AppError');

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('TOKEN_MISSING', 401, 'Authentication required'));
  }

  const hasRequiredRole = roles.includes(req.user.role);
  const isCreatorAccess = roles.includes('creator') && req.user.isCreator;

  if (!hasRequiredRole && !isCreatorAccess) {
    return next(new AppError('FORBIDDEN', 403, 'Insufficient permissions'));
  }

  next();
};

module.exports = { authorize };
