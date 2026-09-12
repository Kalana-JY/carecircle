const mongoose = require('mongoose');
const { GOAL_STATUSES } = require('../constants/goals');

const goalHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      required: true,
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'],
    },
    goalTitle: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: GOAL_STATUSES,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    recordedProgress: {
      type: Number,
      default: 0,
      min: 0,
    },
    steps: {
      type: Number,
      default: null,
    },
    source: {
      type: String,
      enum: ['create', 'progress', 'status', 'steps', 'snapshot'],
      default: 'snapshot',
    },
  },
  { timestamps: true }
);

goalHistorySchema.index({ userId: 1, date: 1 });
goalHistorySchema.index({ userId: 1, goalId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('GoalHistory', goalHistorySchema);
