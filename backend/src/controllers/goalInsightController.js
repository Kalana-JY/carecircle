const GoalHistory = require('../models/GoalHistory');
const Goal = require('../models/Goal');
const StepLog = require('../models/StepLog');
const Notification = require('../models/Notification');
const Achievement = require('../models/Achievement');
const {
  handleError,
  toUserId,
  findOwnedGoal,
  refreshOverdueStatuses,
  utcDateKey,
  startOfWeek,
  weekRange,
  addDaysKey,
  recordGoalHistory,
  computeStreaks,
  syncUserNotifications,
  csvEscape,
  DEFAULT_DAILY_STEP_TARGET,
} = require('../services/goalTracking');

exports.getGoalHistory = async (req, res) => {
  try {
    const goal = await findOwnedGoal(req, res);
    if (!goal) return;

    const items = await GoalHistory.find({ userId: toUserId(req), goalId: goal._id }).sort({ date: 1 });
    return res.json({ success: true, count: items.length, data: items });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getAllHistory = async (req, res) => {
  try {
    const userId = toUserId(req);
    const { from, to } = req.query;
    const filter = { userId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const items = await GoalHistory.find(filter).sort({ date: 1, goalTitle: 1 });
    return res.json({ success: true, count: items.length, data: items });
  } catch (error) {
    return handleError(res, error);
  }
};

const summarizeRange = async (userId, startKey, endKey) => {
  const snapshots = await GoalHistory.find({
    userId,
    date: { $gte: startKey, $lt: endKey },
  });
  const completedIds = new Set(
    snapshots.filter((item) => item.status === 'completed').map((item) => String(item.goalId))
  );
  const progressByGoal = new Map();
  snapshots.forEach((item) => {
    const current = progressByGoal.get(String(item.goalId)) || 0;
    progressByGoal.set(String(item.goalId), Math.max(current, item.progress || 0));
  });
  const progressValues = [...progressByGoal.values()];
  const averageProgress = progressValues.length
    ? Math.round((progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length) * 100) / 100
    : 0;

  return {
    start: startKey,
    end: addDaysKey(endKey, -1),
    snapshotCount: snapshots.length,
    goalsTracked: progressByGoal.size,
    goalsCompleted: completedIds.size,
    averageProgress,
  };
};

exports.getWeeklyReport = async (req, res) => {
  try {
    const userId = toUserId(req);
    const now = new Date();
    const thisWeekStart = startOfWeek(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);

    const thisWeek = weekRange(thisWeekStart);
    const lastWeek = weekRange(lastWeekStart);

    const [thisWeekSummary, lastWeekSummary, fourWeeks] = await Promise.all([
      summarizeRange(userId, thisWeek.startKey, thisWeek.endKey),
      summarizeRange(userId, lastWeek.startKey, lastWeek.endKey),
      Promise.all(
        [3, 2, 1, 0].map(async (weeksAgo) => {
          const start = new Date(thisWeekStart);
          start.setUTCDate(start.getUTCDate() - weeksAgo * 7);
          const range = weekRange(start);
          return summarizeRange(userId, range.startKey, range.endKey);
        })
      ),
    ]);

    const progressDelta = Math.round((thisWeekSummary.averageProgress - lastWeekSummary.averageProgress) * 100) / 100;
    const completedDelta = thisWeekSummary.goalsCompleted - lastWeekSummary.goalsCompleted;

    return res.json({
      success: true,
      data: {
        weekOverWeek: {
          thisWeek: thisWeekSummary,
          lastWeek: lastWeekSummary,
          progressDelta,
          completedDelta,
        },
        fourWeekTrend: fourWeeks,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.exportProgressReport = async (req, res) => {
  try {
    const userId = toUserId(req);
    const items = await GoalHistory.find({ userId }).sort({ date: 1, goalTitle: 1 });
    const rows = [['Date', 'Goal Title', 'Category', 'Status', 'Progress %', 'Recorded Progress', 'Steps', 'Source']];

    if (items.length === 0) {
      const goals = await Goal.find({ userId });
      for (const goal of goals) {
        await recordGoalHistory(goal, 'snapshot');
      }
      const seeded = await GoalHistory.find({ userId }).sort({ date: 1, goalTitle: 1 });
      seeded.forEach((item) => {
        rows.push([
          item.date,
          item.goalTitle,
          item.category,
          item.status,
          item.progress,
          item.recordedProgress,
          item.steps ?? '',
          item.source,
        ]);
      });
    } else {
      items.forEach((item) => {
        rows.push([
          item.date,
          item.goalTitle,
          item.category,
          item.status,
          item.progress,
          item.recordedProgress,
          item.steps ?? '',
          item.source,
        ]);
      });
    }

    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="carecircle-progress-report.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const userId = toUserId(req);
    await refreshOverdueStatuses(userId);
    await syncUserNotifications(userId);

    const [activeGoals, totalGoals, completedGoals, streaks, todaySteps, unread, recentAchievements, upcoming] =
      await Promise.all([
        Goal.find({ userId, status: { $in: ['active', 'in_progress'] } }).sort({ deadline: 1 }).limit(10),
        Goal.countDocuments({ userId }),
        Goal.countDocuments({ userId, status: 'completed' }),
        computeStreaks(userId),
        StepLog.findOne({ userId, date: utcDateKey() }),
        Notification.countDocuments({ userId, read: false }),
        Achievement.find({ userId }).sort({ unlockedAt: -1 }).limit(5),
        Goal.find({
          userId,
          status: { $nin: ['completed', 'paused'] },
          deadline: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        })
          .sort({ deadline: 1 })
          .limit(5),
      ]);

    const stepGoal = await Goal.findOne({
      userId,
      trackingType: 'steps',
      status: { $in: ['active', 'in_progress', 'overdue'] },
    }).sort({ createdAt: -1 });

    const completionRate = totalGoals === 0 ? 0 : Math.round((completedGoals / totalGoals) * 10000) / 100;

    return res.json({
      success: true,
      data: {
        activeGoals: {
          count: activeGoals.length,
          items: activeGoals.map((goal) => ({
            _id: goal._id,
            title: goal.title,
            category: goal.category,
            progress: goal.progress,
            status: goal.status,
            deadline: goal.deadline,
          })),
        },
        streaks: {
          current: streaks.current,
          longest: streaks.longest,
        },
        completionRate,
        totals: {
          total: totalGoals,
          completed: completedGoals,
        },
        todaySteps: {
          date: utcDateKey(),
          steps: todaySteps?.steps || 0,
          lastRecordedAt: todaySteps?.lastRecordedAt || null,
          dailyTarget: stepGoal?.targetValue || DEFAULT_DAILY_STEP_TARGET,
        },
        upcomingDeadlines: upcoming.map((goal) => ({
          _id: goal._id,
          title: goal.title,
          deadline: goal.deadline,
          status: goal.status,
        })),
        unreadNotifications: unread,
        recentAchievements,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};
