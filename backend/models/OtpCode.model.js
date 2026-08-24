const mongoose = require('mongoose');
const crypto = require('crypto');

const otpSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  codeHash: { type: String, required: true },
  purpose: {
    type: String,
    enum: ['registration', 'password_reset', 'phone_change'],
    required: true,
  },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

otpSchema.statics.hashCode = (code) =>
  crypto.createHash('sha256').update(String(code)).digest('hex');

module.exports = mongoose.model('OtpCode', otpSchema);
