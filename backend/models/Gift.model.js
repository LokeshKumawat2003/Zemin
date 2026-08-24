const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema(
  {
    giftId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    emoji: { type: String, default: '🎁' },
    coinCost: { type: Number, required: true, min: 1 },
    category: {
      type: String,
      enum: ['popular', 'basic', 'premium', 'exclusive'],
      default: 'basic',
    },
    animationUrl: String,
    iconUrl: String,
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Gift', giftSchema);
