const mongoose = require('mongoose');

const creatorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    categories: [String],
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    dmPrice: { type: Number, default: 0 },
    dmCurrency: { type: String, default: 'USD' },
    totalEarnings: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    stats: {
      followersCount: { type: Number, default: 0 },
      subscribersCount: { type: Number, default: 0 },
      postsCount: { type: Number, default: 0 },
      liveHours: { type: Number, default: 0 },
      totalGiftsReceived: { type: Number, default: 0 },
    },
    isLive: { type: Boolean, default: false },
    currentLiveRoomId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveRoom' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Creator', creatorSchema);
