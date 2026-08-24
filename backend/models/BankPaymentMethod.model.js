const mongoose = require('mongoose');

const bankPaymentMethodSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, default: 'bank' },
    label: { type: String, default: 'Bank account' },
    details: mongoose.Schema.Types.Mixed,
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BankPaymentMethod', bankPaymentMethodSchema, 'bank_payment_methods');
