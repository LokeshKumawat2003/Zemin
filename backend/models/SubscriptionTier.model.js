const mongoose = require('mongoose');

const subscriptionTierSchema = new mongoose.Schema(
  {
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, maxlength: 50 },
    price: { type: Number, required: true, min: 100 },
    currency: { type: String, default: 'USD' },
    description: String,
    benefits: [String],
    badge: String,
    accessAllLive: { type: Boolean, default: false },
    unlockAllPosts: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subscriptionTierSchema.index({ creatorId: 1, sortOrder: 1 });

module.exports = mongoose.model('SubscriptionTier', subscriptionTierSchema);
