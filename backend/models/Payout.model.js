const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true }, // in cents
    currency: { type: String, default: 'INR' },
    method: { type: String, enum: ['bank', 'upi', 'razorpay'], required: true },
    status: { type: String, enum: ['pending', 'approved', 'processing', 'completed', 'failed', 'rejected'], default: 'pending' },
    bankDetails: mongoose.Schema.Types.Mixed,
    upiId: String,
    rejectionReason: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    providerResponse: mongoose.Schema.Types.Mixed,
    referenceId: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payout', payoutSchema);
