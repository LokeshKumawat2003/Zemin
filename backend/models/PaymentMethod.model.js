const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['bank', 'upi'], required: true },
    label: { type: String },
    details: mongoose.Schema.Types.Mixed, // store accountNumber/ifsc or upi id
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
