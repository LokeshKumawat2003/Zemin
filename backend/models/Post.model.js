const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['photo', 'video', 'text', 'carousel'],
      required: true,
    },
    media: [
      {
        url: String,
        thumbnail: String,
        type: { type: String, enum: ['image', 'video'] },
        width: Number,
        height: Number,
        duration: Number,
        size: Number,
      },
    ],
    caption: { type: String, maxlength: 2200 },
    visibility: {
      type: String,
      enum: ['public', 'subscribers', 'ppv', 'tier'],
      default: 'public',
    },
    subscriptionTierId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionTier' },
    isPPV: { type: Boolean, default: false },
    ppvPrice: Number,
    ppvCurrency: { type: String, default: 'USD' },
    unlockGiftId: String,
    tags: [String],
    hashtags: [String],
    stats: {
      likesCount: { type: Number, default: 0 },
      commentsCount: { type: Number, default: 0 },
      sharesCount: { type: Number, default: 0 },
      viewsCount: { type: Number, default: 0 },
      giftsCount: { type: Number, default: 0 },
    },
    isPinned: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ visibility: 1, publishedAt: -1 });
postSchema.index({ hashtags: 1 });

module.exports = mongoose.model('Post', postSchema);
