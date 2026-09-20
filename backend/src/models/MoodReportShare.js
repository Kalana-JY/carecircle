const mongoose = require('mongoose');

const moodReportShareSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Unguessable link segment; the share is only as private as the URL.
    token: {
      type: String,
      required: true,
      unique: true,
    },
    startKey: {
      type: String,
      required: true,
    },
    endKey: {
      type: String,
      required: true,
    },
    recipientNote: {
      type: String,
      trim: true,
      maxlength: [300, 'Recipient note cannot exceed 300 characters'],
    },
    includeNotes: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    lastViewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

moodReportShareSchema.index({ userId: 1, createdAt: -1 });

moodReportShareSchema.methods.isUsable = function isUsable(now = new Date()) {
  return !this.revokedAt && this.expiresAt > now;
};

module.exports = mongoose.model('MoodReportShare', moodReportShareSchema);
