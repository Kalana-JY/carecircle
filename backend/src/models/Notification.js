const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../constants/goals');
const { REMINDER_NOTIFICATION_TYPES } = require('../constants/reminders');
const { WELLBEING_NOTIFICATION_TYPES } = require('../constants/wellbeing');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      default: null,
    },
    type: {
      type: String,
      enum: [...NOTIFICATION_TYPES, ...REMINDER_NOTIFICATION_TYPES, ...WELLBEING_NOTIFICATION_TYPES],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    dedupeKey: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true });

module.exports = mongoose.model('Notification', notificationSchema);
