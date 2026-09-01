const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    supporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Supporter ID is required'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    title: {
      type: String,
      required: [true, 'Please provide a session title'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    startTime: {
      type: Date,
      required: [true, 'Please provide a start time'],
    },
    endTime: {
      type: Date,
      required: [true, 'Please provide an end time'],
    },
    status: {
      type: String,
      enum: ['available', 'booked', 'cancelled', 'completed'],
      default: 'available',
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    sessionType: {
      type: String,
      enum: ['online', 'physical'],
      default: 'online',
    },
    venue: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster querying
sessionSchema.index({ supporterId: 1, startTime: -1 });
sessionSchema.index({ userId: 1, startTime: -1 });
sessionSchema.index({ status: 1, startTime: 1 });

module.exports = mongoose.model('Session', sessionSchema);
