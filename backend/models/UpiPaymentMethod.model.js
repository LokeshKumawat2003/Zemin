const mongoose = require('mongoose');

const upiPaymentMethodSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, default: 'upi' },
    label: { type: String, default: 'UPI account' },
    details: mongoose.Schema.Types.Mixed,
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UpiPaymentMethod', upiPaymentMethodSchema, 'upi_payment_methods');
