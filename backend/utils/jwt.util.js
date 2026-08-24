const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');

const signAccessToken = (payload) =>
  jwt.sign(payload, jwtConfig.accessSecret, { expiresIn: jwtConfig.accessExpires });

const signRefreshToken = (payload) =>
  jwt.sign(payload, jwtConfig.refreshSecret, { expiresIn: jwtConfig.refreshExpires });

const verifyAccessToken = (token) => jwt.verify(token, jwtConfig.accessSecret);

const verifyRefreshToken = (token) => jwt.verify(token, jwtConfig.refreshSecret);

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
