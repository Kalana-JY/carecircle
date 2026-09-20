const mongoose = require('mongoose');
const {
  REMINDER_TYPES,
  REMINDER_FREQUENCIES,
  REMINDER_STATUSES,
  TIME_OF_DAY_PATTERN,
  MIN_UTC_OFFSET_MINUTES,
  MAX_UTC_OFFSET_MINUTES,
} = require('../constants/reminders');

const reminderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: REMINDER_TYPES,
      default: 'mood_log',
    },
    title: {
      type: String,
      trim: true,
      maxlength: [120, 'Reminder title cannot exceed 120 characters'],
    },
    message: {
      type: String,
      trim: true,
      maxlength: [300, 'Reminder message cannot exceed 300 characters'],
    },
    timeOfDay: {
      type: String,
      required: [true, 'Please provide a reminder time'],
      validate: {
        validator: (value) => TIME_OF_DAY_PATTERN.test(value),
        message: 'timeOfDay must be in HH:MM 24-hour format',
      },
    },
    frequency: {
      type: String,
      enum: REMINDER_FREQUENCIES,
      default: 'daily',
    },
    // Only used by weekly reminders: 0 is Sunday through 6 is Saturday.
    daysOfWeek: {
      type: [Number],
      default: [],
      validate: {
        validator: (values) => values.every((value) => Number.isInteger(value) && value >= 0 && value <= 6),
        message: 'daysOfWeek must contain integers between 0 (Sunday) and 6 (Saturday)',
      },
    },
    // Only used by one-off reminders.
    startDate: {
      type: String,
      default: null,
    },
    utcOffsetMinutes: {
      type: Number,
      default: 0,
      min: MIN_UTC_OFFSET_MINUTES,
      max: MAX_UTC_OFFSET_MINUTES,
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
    occurrenceCount: {
      type: Number,
      default: 0,
    },
    pausedAt: {
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

reminderSchema.index({ userId: 1, status: 1, nextSendAt: 1 });
reminderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Reminder', reminderSchema);
