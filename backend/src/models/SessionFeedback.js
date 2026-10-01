const mongoose = require('mongoose');

const sessionFeedbackSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: [true, 'Session ID is required'],
    },
    supporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Supporter ID is required'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    sessionTitle: {
      type: String,
      trim: true,
    },
    sessionType: {
      type: String,
      enum: ['online', 'physical'],
      default: 'online',
    },
  },
  {
    timestamps: true,
  }
);

// Unique feedback per user per session
sessionFeedbackSchema.index({ sessionId: 1, userId: 1 }, { unique: true });
sessionFeedbackSchema.index({ supporterId: 1, createdAt: -1 });

module.exports = mongoose.model('SessionFeedback', sessionFeedbackSchema);
