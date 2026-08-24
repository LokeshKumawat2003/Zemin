const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    coinBalance: { type: Number, default: 0, min: 0 },
    fiatBalance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'NRI' },
    totalCoinsPurchased: { type: Number, default: 0 },
    totalCoinsSpent: { type: Number, default: 0 },
    totalFiatDeposited: { type: Number, default: 0 },
    totalFiatWithdrawn: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wallet', walletSchema);
