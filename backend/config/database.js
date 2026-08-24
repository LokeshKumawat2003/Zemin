const mongoose = require('mongoose');
const crypto = require('crypto');
const { mongodbUri, mongodbAuthUri } = require('./env');

// Main database connection (for general operations)
const connectDB = async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongodbUri);
  console.log(`MongoDB Main connected: ${mongoose.connection.name}`);
};

// Auth database connection (for login/signup)
let authConnection;
let authModels = {};

const connectAuthDB = async () => {
  authConnection = await mongoose.createConnection(mongodbAuthUri);
  const dbName = authConnection.db?.name || 'Auth';
  console.log(`MongoDB Auth connected: ${dbName}`);
  
  // Initialize auth models after connection is established
  initializeAuthModels(authConnection);
  
  return authConnection;
};

// Initialize auth models
const initializeAuthModels = (connection) => {
  // User model for auth DB
  const userSchema = new mongoose.Schema(
    {
      username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minlength: 3,
        maxlength: 20,
      },
      email: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
      phone: { type: String, unique: true, sparse: true, trim: true },
      passwordHash: { type: String, required: true },
      displayName: { type: String, trim: true, maxlength: 50 },
      avatar: String,
      banner: String,
      bio: { type: String, maxlength: 500 },
      role: {
        type: String,
        enum: ['fan', 'creator', 'moderator', 'admin'],
        default: 'fan',
      },
      isVerified: { type: Boolean, default: false },
      isCreator: { type: Boolean, default: false },
      isBanned: { type: Boolean, default: false },
      banReason: String,
      socialLinks: {
        instagram: String,
        twitter: String,
        youtube: String,
        website: String,
      },
      settings: {
        notifications: {
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
          liveAlerts: { type: Boolean, default: true },
        },
        privacy: {
          profileVisibility: { type: String, default: 'public' },
          allowMessagesFrom: { type: String, default: 'everyone' },
        },
        language: { type: String, default: 'en' },
        theme: { type: String, default: 'dark' },
      },
      fcmTokens: [String],
      loginAttempts: { type: Number, default: 0 },
      lockUntil: Date,
      isDeleted: { type: Boolean, default: false },
      deletedAt: Date,
      lastLoginAt: Date,
      lastActiveAt: Date,
    },
    { timestamps: true }
  );

  userSchema.index({ role: 1 });
  userSchema.index({ createdAt: -1 });

  userSchema.methods.toPublicJSON = function toPublicJSON() {
    return {
      id: this._id,
      username: this.username,
      displayName: this.displayName || this.username,
      email: this.email,
      phone: this.phone,
      avatar: this.avatar,
      banner: this.banner,
      bio: this.bio,
      role: this.role,
      isVerified: this.isVerified,
      isCreator: this.isCreator,
      socialLinks: this.socialLinks,
      createdAt: this.createdAt,
    };
  };

  authModels.User = connection.model('User', userSchema);

  // OtpCode model for auth DB
  const otpSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    codeHash: { type: String, required: true },
    purpose: {
      type: String,
      enum: ['registration', 'password_reset', 'phone_change'],
      required: true,
    },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  });

  otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  otpSchema.statics.hashCode = (code) =>
    crypto.createHash('sha256').update(String(code)).digest('hex');

  authModels.OtpCode = connection.model('OtpCode', otpSchema);

  // RefreshToken model for auth DB
  const refreshTokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true },
    deviceId: String,
    expiresAt: { type: Date, required: true },
    isRevoked: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  });

  refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  refreshTokenSchema.index({ userId: 1 });

  refreshTokenSchema.statics.hashToken = (token) =>
    crypto.createHash('sha256').update(token).digest('hex');

  authModels.RefreshToken = connection.model('RefreshToken', refreshTokenSchema);
};

// Get auth connection
const getAuthConnection = () => {
  if (!authConnection) {
    throw new Error('Auth database connection not initialized. Make sure connectAuthDB was called.');
  }
  return authConnection;
};

// Get auth models
const getAuthModels = () => {
  if (!authModels.User) {
    throw new Error('Auth models not initialized. Make sure connectAuthDB was called.');
  }
  return authModels;
};

module.exports = { connectDB, connectAuthDB, getAuthConnection, getAuthModels };
