const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: {
      type: String,
      enum: ['user', 'post', 'live', 'message'],
      required: true,
    },
    targetId: { type: String, required: true },
    reason: {
      type: String,
      enum: [
        'spam',
        'harassment',
        'nudity',
        'sexual_content',
        'inappropriate',
        'violence',
        'hate_speech',
        'fake_account',
        'self_harm',
        'scam',
        'copyright',
        'other',
      ],
      required: true,
    },
    description: { type: String, maxlength: 500 },
    status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },
  },
  { timestamps: true }
);

reportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 });

module.exports = mongoose.model('Report', reportSchema);
