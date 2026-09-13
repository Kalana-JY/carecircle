const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Goal = require('../models/Goal');
const GoalReminder = require('../models/GoalReminder');
const GoalHistory = require('../models/GoalHistory');
const Notification = require('../models/Notification');
const Achievement = require('../models/Achievement');
const StepLog = require('../models/StepLog');
const {
  ACHIEVEMENT_CATALOG,
  DEADLINE_ALERT_DAYS,
  DEFAULT_DAILY_STEP_TARGET,
} = require('../constants/goals');

const handleError = (res, error) => {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: error.message || 'Invalid goal input',
    });
  }

  console.error(error);
  return res.status(500).json({
    success: false,
    message: error.message || 'Server error',
  });
};

const validationFailed = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ success: false, errors: errors.array() });
  return true;
};

const parseDeadline = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T23:59:59.999Z`);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isFutureDeadline = (date) => date instanceof Date && date.getTime() > Date.now();

const toUserId = (req) => req.user._id;

const invalidId = (res, id) => {
  if (mongoose.isValidObjectId(id)) return false;
  res.status(400).json({ success: false, message: 'Invalid goal id' });
  return true;
};

const findOwnedGoal = async (req, res) => {
  if (invalidId(res, req.params.id)) return null;

  const goal = await Goal.findById(req.params.id);
  if (!goal) {
    res.status(404).json({ success: false, message: 'Goal not found' });
    return null;
  }

  if (goal.userId.toString() !== toUserId(req).toString()) {
    res.status(403).json({ success: false, message: 'Not authorized to access this goal' });
    return null;
  }

  return goal;
};

const refreshOverdueStatuses = async (userId) => {
  const now = new Date();
  await Goal.updateMany(
    {
      userId,
      status: { $nin: ['completed', 'paused', 'overdue'] },
      deadline: { $lt: now },
    },
    { $set: { status: 'overdue' } }
  );
  await Goal.updateMany(
    {
      userId,
      status: 'overdue',
      deadline: { $gte: now },
    },
    { $set: { status: 'active' } }
  );
};

const goalPayload = (goal) => ({
  ...goal.toObject(),
  completionPercentage: goal.progress,
  recordedProgress: goal.recordedProgress(),
});

const resolveTrackingType = ({ trackingType, targetUnit } = {}) => {
  if (trackingType) return trackingType;
  const unit = String(targetUnit || '').toLowerCase();
  if (unit === 'steps' || unit === 'step') return 'steps';
  return 'manual';
};

const utcDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
};

const addDaysKey = (dateKey, days) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const startOfWeek = (value = new Date()) => {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
};

const weekRange = (weekStart) => {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end, startKey: utcDateKey(start), endKey: utcDateKey(end) };
};

const nextReminderSendAt = (from, frequency) => {
  const date = new Date(from);
  if (frequency === 'daily') {
    date.setUTCDate(date.getUTCDate() + 1);
    return date;
  }
  if (frequency === 'weekly') {
    date.setUTCDate(date.getUTCDate() + 7);
    return date;
  }
  return null;
};

const upsertNotification = async ({ userId, goalId, type, title, body, dedupeKey, metadata = {} }) => {
  try {
    return await Notification.create({ userId, goalId, type, title, body, dedupeKey, metadata });
  } catch (error) {
    if (error.code === 11000) {
      return Notification.findOne({ userId, dedupeKey });
    }
    throw error;
  }
};

const recordGoalHistory = async (goal, source = 'snapshot', extra = {}) => {
  if (!goal) return null;
  const date = extra.date || utcDateKey();
  return GoalHistory.findOneAndUpdate(
    { userId: goal.userId, goalId: goal._id, date },
    {
      $set: {
        goalTitle: goal.title,
        category: goal.category,
        status: goal.status,
        progress: goal.progress,
        recordedProgress: typeof goal.recordedProgress === 'function' ? goal.recordedProgress() : 0,
        steps: extra.steps ?? null,
        source,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
};

const unlockAchievement = async (userId, key, metadata = {}) => {
  const catalog = ACHIEVEMENT_CATALOG.find((item) => item.key === key);
  if (!catalog) return null;
  try {
    return await Achievement.create({
      userId,
      key: catalog.key,
      title: catalog.title,
      description: catalog.description,
      metadata,
      unlockedAt: new Date(),
    });
  } catch (error) {
    if (error.code === 11000) return null;
    throw error;
  }
};

const collectActivityDates = async (userId) => {
  const [goals, stepLogs] = await Promise.all([
    Goal.find({ userId }).select('progressEntries'),
    StepLog.find({ userId, steps: { $gt: 0 } }).select('date'),
  ]);
  const dates = new Set();
  goals.forEach((goal) => {
    (goal.progressEntries || []).forEach((entry) => {
      if (entry.recordedAt) dates.add(utcDateKey(entry.recordedAt));
    });
  });
  stepLogs.forEach((log) => dates.add(log.date));
  return [...dates].sort();
};

const longestStreak = (dateKeys) => {
  if (!dateKeys.length) return 0;
  let best = 1;
  let current = 1;
  for (let i = 1; i < dateKeys.length; i += 1) {
    if (dateKeys[i] === addDaysKey(dateKeys[i - 1], 1)) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  return best;
};

const computeStreaks = async (userId, now = new Date()) => {
  const dateKeys = await collectActivityDates(userId);
  const todayKey = utcDateKey(now);
  const set = new Set(dateKeys);
  let cursor = todayKey;
  if (!set.has(todayKey)) {
    const yesterday = addDaysKey(todayKey, -1);
    if (!set.has(yesterday)) {
      return { current: 0, longest: longestStreak(dateKeys), dates: dateKeys };
    }
    cursor = yesterday;
  }
  let current = 0;
  while (set.has(cursor)) {
    current += 1;
    cursor = addDaysKey(cursor, -1);
  }
  return { current, longest: longestStreak(dateKeys), dates: dateKeys };
};

const evaluateAchievements = async (userId) => {
  const [goalCount, completedCount, stepGoalCount, todayLog, streaks] = await Promise.all([
    Goal.countDocuments({ userId }),
    Goal.countDocuments({ userId, status: 'completed' }),
    Goal.countDocuments({ userId, trackingType: 'steps' }),
    StepLog.findOne({ userId, date: utcDateKey() }),
    computeStreaks(userId),
  ]);

  if (goalCount >= 1) await unlockAchievement(userId, 'first_goal_created');
  if (completedCount >= 1) await unlockAchievement(userId, 'first_goal_completed');
  if (completedCount >= 5) await unlockAchievement(userId, 'goals_completed_5');
  if (stepGoalCount >= 1) await unlockAchievement(userId, 'first_step_goal');
  if (streaks.current >= 3 || streaks.longest >= 3) await unlockAchievement(userId, 'streak_3', { streak: streaks.current });
  if (streaks.current >= 7 || streaks.longest >= 7) await unlockAchievement(userId, 'streak_7', { streak: streaks.current });
  if ((todayLog?.steps || 0) >= 10000) await unlockAchievement(userId, 'steps_10000', { steps: todayLog.steps });

  return streaks;
};

const syncDeadlineNotifications = async (userId) => {
  await refreshOverdueStatuses(userId);
  const now = new Date();
  const soon = new Date(now.getTime() + DEADLINE_ALERT_DAYS * 24 * 60 * 60 * 1000);
  const goals = await Goal.find({
    userId,
    status: { $nin: ['completed', 'paused'] },
  });

  const created = [];
  for (const goal of goals) {
    if (!goal.deadline) continue;
    const deadlineKey = goal.deadline.toISOString();
    if (goal.deadline < now) {
      created.push(
        await upsertNotification({
          userId,
          goalId: goal._id,
          type: 'deadline_missed',
          title: 'Goal deadline missed',
          body: `"${goal.title}" is past its deadline.`,
          dedupeKey: `${goal._id}:deadline_missed:${deadlineKey}`,
          metadata: { deadline: goal.deadline },
        })
      );
    } else if (goal.deadline <= soon) {
      created.push(
        await upsertNotification({
          userId,
          goalId: goal._id,
          type: 'deadline_approaching',
          title: 'Goal deadline approaching',
          body: `"${goal.title}" is due soon.`,
          dedupeKey: `${goal._id}:deadline_approaching:${deadlineKey}`,
          metadata: { deadline: goal.deadline, days: DEADLINE_ALERT_DAYS },
        })
      );
    }
  }
  return created.filter(Boolean);
};

const syncReminderNotifications = async (userId) => {
  const now = new Date();
  const due = await GoalReminder.find({
    userId,
    status: 'active',
    nextSendAt: { $ne: null, $lte: now },
  });

  const created = [];
  for (const reminder of due) {
    const goal = await Goal.findById(reminder.goalId);
    const title = goal?.title || 'your goal';
    created.push(
      await upsertNotification({
        userId,
        goalId: reminder.goalId,
        type: 'goal_reminder',
        title: 'Goal reminder',
        body: reminder.message || `Time to work on "${title}".`,
        dedupeKey: `${reminder._id}:goal_reminder:${reminder.nextSendAt.toISOString()}`,
        metadata: { frequency: reminder.frequency },
      })
    );
    reminder.lastSentAt = now;
    reminder.nextSendAt = nextReminderSendAt(reminder.nextSendAt, reminder.frequency);
    await reminder.save();
  }
  return created.filter(Boolean);
};

const syncUserNotifications = async (userId) => {
  await syncDeadlineNotifications(userId);
  await syncReminderNotifications(userId);
};

const applyStepsToGoals = async (userId, steps, dateKey) => {
  const goals = await Goal.find({
    userId,
    trackingType: 'steps',
    status: { $in: ['active', 'in_progress', 'overdue'] },
  });

  const updated = [];
  for (const goal of goals) {
    const target = typeof goal.targetValue === 'number' && goal.targetValue > 0 ? goal.targetValue : DEFAULT_DAILY_STEP_TARGET;
    const todayEntry = goal.progressEntries.find((entry) => entry.recordedAt && utcDateKey(entry.recordedAt) === dateKey);
    if (todayEntry) {
      todayEntry.value = steps;
      todayEntry.note = 'Automatic step sync';
    } else {
      goal.progressEntries.push({
        value: steps,
        note: 'Automatic step sync',
        recordedAt: new Date(`${dateKey}T12:00:00.000Z`),
      });
    }
    if (!goal.targetValue) goal.targetValue = target;
    goal.recalculateProgress();
    await goal.save();
    await recordGoalHistory(goal, 'steps', { date: dateKey, steps });
    updated.push(goal);
  }
  return updated;
};

const csvEscape = (value) => {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

module.exports = {
  handleError,
  validationFailed,
  parseDeadline,
  isFutureDeadline,
  toUserId,
  invalidId,
  findOwnedGoal,
  refreshOverdueStatuses,
  goalPayload,
  resolveTrackingType,
  utcDateKey,
  addDaysKey,
  startOfWeek,
  weekRange,
  nextReminderSendAt,
  recordGoalHistory,
  evaluateAchievements,
  computeStreaks,
  syncUserNotifications,
  applyStepsToGoals,
  csvEscape,
  DEFAULT_DAILY_STEP_TARGET,
};
