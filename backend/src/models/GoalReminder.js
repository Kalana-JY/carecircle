const mongoose = require('mongoose');
const { REMINDER_FREQUENCIES, REMINDER_STATUSES } = require('../constants/goals');

const goalReminderSchema = new mongoose.Schema(
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
    remindAt: {
      type: Date,
      required: [true, 'Please provide a reminder time'],
    },
    frequency: {
      type: String,
      enum: REMINDER_FREQUENCIES,
      default: 'once',
    },
    message: {
      type: String,
      trim: true,
      maxlength: [300, 'Reminder message cannot exceed 300 characters'],
    },
    status: {
      type: String,
      enum: REMINDER_STATUSES,
      default: 'active',
    },
    nextSendAt: {
      type: Date,
      default: null,
    },
    lastSentAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

goalReminderSchema.index({ goalId: 1 }, { unique: true });
goalReminderSchema.index({ userId: 1, status: 1, nextSendAt: 1 });

module.exports = mongoose.model('GoalReminder', goalReminderSchema);
