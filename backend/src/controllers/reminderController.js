const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Reminder = require('../models/Reminder');
const Notification = require('../models/Notification');
const {
  computeNextSendAt,
  syncReminderNotifications,
  isValidDateKey,
  instantFor,
} = require('../services/reminderService');
const {
  DEFAULT_REMINDER_TITLE,
  DEFAULT_REMINDER_BODY,
  MAX_ACTIVE_REMINDERS,
} = require('../constants/reminders');

const handleError = (res, error) => {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: error.message || 'Invalid reminder input' });
  }

  console.error(error);
  return res.status(500).json({ message: 'Server error' });
};

const validationFailed = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  return true;
};

const reminderPayload = (reminder) => ({
  ...reminder.toObject(),
  resolvedTitle: reminder.title || DEFAULT_REMINDER_TITLE[reminder.type],
  resolvedMessage: reminder.message || DEFAULT_REMINDER_BODY[reminder.type],
});

const findOwnedReminder = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid reminder id' });
    return null;
  }

  const reminder = await Reminder.findById(req.params.id);
  if (!reminder) {
    res.status(404).json({ message: 'Reminder not found' });
    return null;
  }
  if (reminder.userId.toString() !== req.user._id.toString()) {
    res.status(403).json({ message: 'Not authorized to access this reminder' });
    return null;
  }

  return reminder;
};

// Frequency drives which extra fields are mandatory.
const scheduleProblem = ({ frequency, daysOfWeek, startDate, timeOfDay, utcOffsetMinutes }) => {
  if (frequency === 'weekly' && (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0)) {
    return 'daysOfWeek is required for weekly reminders';
  }
  if (frequency === 'once') {
    if (!startDate) return 'startDate is required for one-off reminders';
    if (!isValidDateKey(startDate)) return 'startDate must be a valid date in YYYY-MM-DD format';
    if (instantFor(startDate, timeOfDay, utcOffsetMinutes) <= new Date()) {
      return 'A one-off reminder must be scheduled in the future';
    }
  }
  return null;
};

// US-30 - Set reminder
exports.createReminder = async (req, res) => {
  try {
    if (validationFailed(req, res)) return undefined;

    const draft = {
      userId: req.user._id,
      type: req.body.type || 'mood_log',
      title: req.body.title,
      message: req.body.message,
      timeOfDay: req.body.timeOfDay,
      frequency: req.body.frequency || 'daily',
      daysOfWeek: req.body.frequency === 'weekly' ? req.body.daysOfWeek : [],
      startDate: req.body.frequency === 'once' ? req.body.startDate : null,
      utcOffsetMinutes: req.body.utcOffsetMinutes ?? 0,
    };

    const problem = scheduleProblem(draft);
    if (problem) return res.status(400).json({ message: problem });

    const activeCount = await Reminder.countDocuments({ userId: req.user._id, status: 'active' });
    if (activeCount >= MAX_ACTIVE_REMINDERS) {
      return res.status(409).json({ message: `You can have at most ${MAX_ACTIVE_REMINDERS} active reminders` });
    }

    const reminder = await Reminder.create({ ...draft, nextSendAt: computeNextSendAt(draft) });

    return res.status(201).json({ message: 'Reminder created', data: reminderPayload(reminder) });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.listReminders = async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    else filter.status = { $ne: 'cancelled' };
    if (req.query.type) filter.type = req.query.type;

    const reminders = await Reminder.find(filter).sort({ nextSendAt: 1, createdAt: -1 });

    return res.json({
      items: reminders.map(reminderPayload),
      meta: {
        total: reminders.length,
        active: reminders.filter((reminder) => reminder.status === 'active').length,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getReminder = async (req, res) => {
  try {
    const reminder = await findOwnedReminder(req, res);
    if (!reminder) return undefined;
    return res.json({ data: reminderPayload(reminder) });
  } catch (error) {
    return handleError(res, error);
  }
};

// US-31 - Edit reminder
exports.updateReminder = async (req, res) => {
  try {
    if (validationFailed(req, res)) return undefined;

    const reminder = await findOwnedReminder(req, res);
    if (!reminder) return undefined;
    if (reminder.status === 'cancelled') {
      return res.status(409).json({ message: 'Cancelled reminders cannot be edited' });
    }

    const editable = ['type', 'title', 'message', 'timeOfDay', 'frequency', 'daysOfWeek', 'startDate', 'utcOffsetMinutes'];
    const updates = editable.filter((field) => req.body[field] !== undefined);
    if (updates.length === 0) {
      return res.status(400).json({ message: 'At least one field is required to update a reminder' });
    }

    updates.forEach((field) => {
      reminder[field] = req.body[field];
    });

    // Clear fields that no longer apply once the frequency changes.
    if (reminder.frequency !== 'weekly') reminder.daysOfWeek = [];
    if (reminder.frequency !== 'once') reminder.startDate = null;

    const problem = scheduleProblem(reminder);
    if (problem) return res.status(400).json({ message: problem });

    // Editing a one-off reminder re-arms it for the newly chosen date.
    if (reminder.frequency === 'once') reminder.lastSentAt = null;

    // Rescheduling from now prevents an edit from instantly firing a backlog.
    reminder.nextSendAt = computeNextSendAt(reminder);
    if (reminder.status === 'completed' && reminder.nextSendAt) reminder.status = 'active';
    await reminder.save();

    return res.json({ message: 'Reminder updated', data: reminderPayload(reminder) });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.updateReminderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'paused'].includes(status)) {
      return res.status(400).json({ message: 'status must be active or paused' });
    }

    const reminder = await findOwnedReminder(req, res);
    if (!reminder) return undefined;
    if (reminder.status === 'cancelled') {
      return res.status(409).json({ message: 'Cancelled reminders cannot be resumed' });
    }

    if (status === 'paused') {
      reminder.status = 'paused';
      reminder.pausedAt = new Date();
      reminder.nextSendAt = null;
    } else {
      reminder.status = 'active';
      reminder.pausedAt = null;
      reminder.nextSendAt = computeNextSendAt(reminder);
      if (!reminder.nextSendAt) {
        return res.status(400).json({ message: 'This reminder has no future occurrence. Edit its schedule first.' });
      }
    }

    await reminder.save();
    return res.json({ message: `Reminder ${status === 'paused' ? 'paused' : 'resumed'}`, data: reminderPayload(reminder) });
  } catch (error) {
    return handleError(res, error);
  }
};

// US-32 - Delete reminder
exports.deleteReminder = async (req, res) => {
  try {
    const reminder = await findOwnedReminder(req, res);
    if (!reminder) return undefined;

    reminder.status = 'cancelled';
    reminder.cancelledAt = new Date();
    reminder.nextSendAt = null;
    await reminder.save();

    return res.json({ message: 'Reminder deleted', data: reminderPayload(reminder) });
  } catch (error) {
    return handleError(res, error);
  }
};

// US-33 - Receive reminder notifications
exports.listReminderNotifications = async (req, res) => {
  try {
    await syncReminderNotifications(req.user._id);

    const filter = {
      userId: req.user._id,
      type: { $in: ['mood_log_reminder', 'wellness_activity_reminder', 'custom_reminder'] },
    };
    if (req.query.unread === 'true') filter.read = false;

    const [items, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(100),
      Notification.countDocuments({ ...filter, read: false }),
    ]);

    return res.json({ items, meta: { total: items.length, unreadCount } });
  } catch (error) {
    return handleError(res, error);
  }
};
