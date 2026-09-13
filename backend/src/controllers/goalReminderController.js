const GoalReminder = require('../models/GoalReminder');
const {
  handleError,
  validationFailed,
  toUserId,
  findOwnedGoal,
  nextReminderSendAt,
} = require('../services/goalTracking');

const reminderPayload = (reminder) => reminder.toObject();

exports.getReminder = async (req, res) => {
  try {
    const goal = await findOwnedGoal(req, res);
    if (!goal) return;

    const reminder = await GoalReminder.findOne({ goalId: goal._id, userId: toUserId(req) });
    if (!reminder || reminder.status === 'cancelled') {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    return res.json({ success: true, data: reminderPayload(reminder) });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.createReminder = async (req, res) => {
  try {
    if (validationFailed(req, res)) return;

    const goal = await findOwnedGoal(req, res);
    if (!goal) return;

    const existing = await GoalReminder.findOne({ goalId: goal._id, userId: toUserId(req), status: 'active' });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An active reminder already exists for this goal',
        data: reminderPayload(existing),
      });
    }

    const { remindAt, frequency = 'once', message } = req.body;
    const when = new Date(remindAt);
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ success: false, message: 'remindAt must be a valid date' });
    }

    const reminder = await GoalReminder.findOneAndUpdate(
      { goalId: goal._id, userId: toUserId(req) },
      {
        $set: {
          remindAt: when,
          frequency,
          message,
          status: 'active',
          nextSendAt: when,
          cancelledAt: null,
          lastSentAt: null,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    return res.status(201).json({
      success: true,
      data: reminderPayload(reminder),
      message: 'Reminder created successfully',
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.updateReminder = async (req, res) => {
  try {
    if (validationFailed(req, res)) return;

    const goal = await findOwnedGoal(req, res);
    if (!goal) return;

    const reminder = await GoalReminder.findOne({ goalId: goal._id, userId: toUserId(req), status: 'active' });
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    const { remindAt, frequency, message } = req.body;
    if (remindAt !== undefined) {
      const when = new Date(remindAt);
      if (Number.isNaN(when.getTime())) {
        return res.status(400).json({ success: false, message: 'remindAt must be a valid date' });
      }
      reminder.remindAt = when;
      reminder.nextSendAt = when;
    }
    if (frequency !== undefined) reminder.frequency = frequency;
    if (message !== undefined) reminder.message = message;
    if (reminder.nextSendAt && frequency && !remindAt) {
      reminder.nextSendAt = reminder.lastSentAt
        ? nextReminderSendAt(reminder.lastSentAt, reminder.frequency)
        : reminder.remindAt;
    }

    await reminder.save();

    return res.json({
      success: true,
      data: reminderPayload(reminder),
      message: 'Reminder updated successfully',
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.cancelReminder = async (req, res) => {
  try {
    const goal = await findOwnedGoal(req, res);
    if (!goal) return;

    const reminder = await GoalReminder.findOne({ goalId: goal._id, userId: toUserId(req), status: 'active' });
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    reminder.status = 'cancelled';
    reminder.cancelledAt = new Date();
    reminder.nextSendAt = null;
    await reminder.save();

    return res.json({
      success: true,
      data: reminderPayload(reminder),
      message: 'Reminder cancelled successfully',
    });
  } catch (error) {
    return handleError(res, error);
  }
};
