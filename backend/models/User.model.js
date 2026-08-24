const mongoose = require('mongoose');

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

module.exports = mongoose.model('User', userSchema);
