const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'coin_purchase',
        'gift_sent',
        'gift_received',
        'subscription',
        'ppv',
        'dm',
        'tip',
        'withdrawal',
        'refund',
      ],
      required: true,
    },
    amount: { type: Number, default: 0 },
    coinAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed',
    },
    description: String,
    metadata: mongoose.Schema.Types.Mixed,
    paymentGateway: String,
    gatewayTransactionId: String,
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
