const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

achievementSchema.index({ userId: 1, key: 1 }, { unique: true });
achievementSchema.index({ userId: 1, unlockedAt: -1 });

module.exports = mongoose.model('Achievement', achievementSchema);
