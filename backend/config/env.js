const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8081',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://zemin.alc.onl',
  "https://zemin.alc.onl",
  'http://127.0.0.1:8081',
];

const configuredOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  // Auth database (login/signup)
  mongodbAuthUri: process.env.MONGODB_AUTH_URI || 'mongodb://127.0.0.1:27017/Zemin-Auth',
  // Main database (other operations)
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Zemin',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'Zemin-dev-access-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'Zemin-dev-refresh-secret-change-in-production',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '30d',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '30d',
  },
  allowedOrigins: [...new Set([...defaultAllowedOrigins, ...configuredOrigins])],
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  notifications: {
    pushEnabled: process.env.NOTIFICATION_PUSH_ENABLED !== 'false',
  },
};
