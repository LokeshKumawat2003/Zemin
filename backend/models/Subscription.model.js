const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    subscriberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true },
    creatorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tierId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionTier', required: true },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired'],
      default: 'active',
    },
    price: Number,
    currency: { type: String, default: 'USD' },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelledAt: Date,
  },
  { timestamps: true }
);

subscriptionSchema.index({ subscriberId: 1, status: 1 });
subscriptionSchema.index({ creatorUserId: 1, status: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
