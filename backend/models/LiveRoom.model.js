const mongoose = require("mongoose");

const liveRoomSchema = new mongoose.Schema(
  {
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "Creator" },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, maxlength: 100 },
    category: { type: String, default: "general" },
    thumbnail: String,
    playbackType: {
      type: String,
      enum: ["livekit", "video"],
      default: "livekit",
    },
    playbackUrl: String,
    videoDurationSeconds: { type: Number, default: null, min: 0 },
    playbackStartedAt: { type: Date, default: null },
    autoConvertToPrivate: { type: Boolean, default: false },
    autoPrivateAfterSeconds: { type: Number, default: null, min: 1 },
    autoPrivateEntryGiftId: String,
    fakeComments: [
      {
        name: { type: String, required: true, maxlength: 40 },
        text: { type: String, required: true, maxlength: 200 },
        delaySeconds: { type: Number, default: 30, min: 5, max: 86400 },
      },
    ],
    fakeGifts: [
      {
        name: { type: String, required: true, maxlength: 40 },
        giftId: { type: String, default: "rose" },
        giftName: { type: String, maxlength: 80 },
        giftEmoji: { type: String, default: "🎁" },
        coinCost: { type: Number, default: 1, min: 0 },
        quantity: { type: Number, default: 1, min: 1, max: 100 },
        delaySeconds: { type: Number, default: 60, min: 5, max: 86400 },
      },
    ],
    fakeViewerIds: [{ type: String }],
    status: {
      type: String,
      enum: ["waiting", "live", "ended"],
      default: "waiting",
    },
    visibility: {
      type: String,
      enum: ["public", "subscribers"],
      default: "public",
    },
    roomType: { type: String, enum: ["public", "vip"], default: "public" },
    entryFeeCoins: { type: Number, default: 0, min: 0 },
    entryGiftId: String,
    scheduledAt: Date,
    maxViewers: { type: Number, default: null },
    paidEntries: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        paidAt: { type: Date, default: Date.now },
        amount: { type: Number, default: 0 },
        giftId: String,
      },
    ],
    streamKey: { type: String, unique: true, sparse: true },
    livekitRoom: String,
    enableRecording: { type: Boolean, default: false },
    enableGuest: { type: Boolean, default: true },
    maxGuests: { type: Number, default: 1000000, min: 0, max: 1000000 },
    removedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    guests: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
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
  { timestamps: true },
);

liveRoomSchema.index({ status: 1, category: 1 });
liveRoomSchema.index({ userId: 1, status: 1 });
liveRoomSchema.index({ roomType: 1, status: 1, scheduledAt: 1 });

module.exports = mongoose.model("LiveRoom", liveRoomSchema);
