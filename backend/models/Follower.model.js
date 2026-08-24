const mongoose = require('mongoose');

const followerSchema = new mongoose.Schema(
  {
    followerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    followingId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

followerSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
followerSchema.index({ followingId: 1, createdAt: -1 });

module.exports = mongoose.model('Follower', followerSchema);
