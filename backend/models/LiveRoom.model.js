const mongoose = require('mongoose');

const liveRoomSchema = new mongoose.Schema(
  {
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 100 },
    category: { type: String, default: 'general' },
    thumbnail: String,
    status: { type: String, enum: ['waiting', 'live', 'ended'], default: 'waiting' },
    visibility: { type: String, enum: ['public', 'subscribers'], default: 'public' },
    roomType: { type: String, enum: ['public', 'vip'], default: 'public' },
    entryFeeCoins: { type: Number, default: 0, min: 0 },
    entryGiftId: String,
    scheduledAt: Date,
    maxViewers: { type: Number, default: null },
    paidEntries: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        paidAt: { type: Date, default: Date.now },
        amount: { type: Number, default: 0 },
        giftId: String,
      },
    ],
    streamKey: { type: String, unique: true },
    livekitRoom: String,
    enableRecording: { type: Boolean, default: false },
    enableGuest: { type: Boolean, default: true },
    maxGuests: { type: Number, default: 1000000, min: 0, max: 1000000 },
    guests: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        joinedAt: Date,
        slot: Number,
      },
    ],
    stats: {
      peakViewers: { type: Number, default: 0 },
      currentViewers: { type: Number, default: 0 },
      totalViewers: { type: Number, default: 0 },
      totalGifts: { type: Number, default: 0 },
      totalGiftCoins: { type: Number, default: 0 },
      entryFeeCoins: { type: Number, default: 0 },
      duration: { type: Number, default: 0 },
    },
    startedAt: Date,
    endedAt: Date,
  },
  { timestamps: true }
);

liveRoomSchema.index({ status: 1, category: 1 });
liveRoomSchema.index({ userId: 1, status: 1 });
liveRoomSchema.index({ roomType: 1, status: 1, scheduledAt: 1 });

module.exports = mongoose.model('LiveRoom', liveRoomSchema);
