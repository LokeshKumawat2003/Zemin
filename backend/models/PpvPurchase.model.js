const mongoose = require('mongoose');

const ppvPurchaseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    coinCost: { type: Number, required: true },
  },
  { timestamps: true }
);

ppvPurchaseSchema.index({ userId: 1, postId: 1 }, { unique: true });

module.exports = mongoose.model('PpvPurchase', ppvPurchaseSchema);
