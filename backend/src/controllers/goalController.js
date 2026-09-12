const Goal = require('../models/Goal');
const { STATUS_QUERY_MAP, USER_GOAL_STATUSES } = require('../constants/goals');
const {
  handleError,
  validationFailed,
  parseDeadline,
  isFutureDeadline,
  toUserId,
  findOwnedGoal,
  refreshOverdueStatuses,
  goalPayload,
  resolveTrackingType,
  recordGoalHistory,
  evaluateAchievements,
} = require('../services/goalTracking');

exports.createGoal = async (req, res) => {
  try {
    if (validationFailed(req, res)) return;

    const {
      title,
      description,
      category,
      target,
      deadline,
      priority,
      targetValue,
      targetUnit,
      notes,
      tags,
      trackingType,
    } = req.body;

    const parsedDeadline = parseDeadline(deadline);
    if (!parsedDeadline) {
      return res.status(400).json({ success: false, message: 'Deadline must be a valid date' });
    }
    if (!isFutureDeadline(parsedDeadline)) {
      return res.status(400).json({ success: false, message: 'Deadline must be in the future' });
    }

    const goal = await Goal.create({
      userId: toUserId(req),
      title,
      description,
      category,
      target,
      targetValue,
      targetUnit,
      trackingType: resolveTrackingType({ trackingType, targetUnit }),
      deadline: parsedDeadline,
      priority,
      notes,
      tags: tags || [],
      status: 'active',
    });

    await recordGoalHistory(goal, 'create');
    await evaluateAchievements(toUserId(req));

    return res.status(201).json({
      success: true,
      data: goalPayload(goal),
      message: 'Goal created successfully',
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getGoals = async (req, res) => {
  try {
    const { status, category, priority, sort } = req.query;
    const userId = toUserId(req);

    await refreshOverdueStatuses(userId);

    const filter = { userId };
    if (status) {
      const mapped = STATUS_QUERY_MAP[status];
      if (!mapped) {
        return res.status(400).json({
          success: false,
          message: 'Status must be active, completed, overdue, in_progress, or paused',
        });
      }
      filter.status = mapped.length === 1 ? mapped[0] : { $in: mapped };
    }
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    let sortObj = { createdAt: -1 };
    if (sort === 'deadline') sortObj = { deadline: 1 };
    if (sort === 'priority') sortObj = { priority: -1 };

    const goals = await Goal.find(filter).sort(sortObj);

    return res.json({
      success: true,
      count: goals.length,
      data: goals.map(goalPayload),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getGoalById = async (req, res) => {
  try {
    const goal = await findOwnedGoal(req, res);
    if (!goal) return;

    goal.applyOverdueStatus();
    if (goal.isModified('status')) await goal.save();

    return res.json({
      success: true,
      data: goalPayload(goal),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.updateGoal = async (req, res) => {
  try {
    if (validationFailed(req, res)) return;

    const goal = await findOwnedGoal(req, res);
    if (!goal) return;

    const {
      title,
      description,
      category,
      target,
      deadline,
      priority,
      targetValue,
      targetUnit,
      notes,
      tags,
      trackingType,
    } = req.body;

    if (deadline !== undefined) {
      const parsedDeadline = parseDeadline(deadline);
      if (!parsedDeadline) {
        return res.status(400).json({ success: false, message: 'Deadline must be a valid date' });
      }
      if (goal.status !== 'completed' && !isFutureDeadline(parsedDeadline)) {
        return res.status(400).json({
          success: false,
          message: 'Deadline must be in the future for active goals',
        });
      }
      goal.deadline = parsedDeadline;
    }

    if (title !== undefined) goal.title = title;
    if (description !== undefined) goal.description = description;
    if (category !== undefined) goal.category = category;
    if (target !== undefined) goal.target = target;
    if (targetValue !== undefined) goal.targetValue = targetValue;
    if (targetUnit !== undefined) goal.targetUnit = targetUnit;
    if (trackingType !== undefined) goal.trackingType = trackingType;
    if (priority !== undefined) goal.priority = priority;
    if (notes !== undefined) goal.notes = notes;
    if (tags !== undefined) goal.tags = tags;

    await goal.save();
    await recordGoalHistory(goal, 'snapshot');

    return res.json({
      success: true,
      data: goalPayload(goal),
      message: 'Goal updated successfully',
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.deleteGoal = async (req, res) => {
  try {
    const goal = await findOwnedGoal(req, res);
    if (!goal) return;

    await Goal.findByIdAndDelete(goal._id);

    return res.json({
      success: true,
      message: 'Goal deleted successfully',
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.completeGoal = async (req, res) => {
  try {
    const goal = await findOwnedGoal(req, res);
    if (!goal) return;

    const completed = await goal.markComplete();
    await recordGoalHistory(completed, 'status');
    await evaluateAchievements(toUserId(req));

    return res.json({
      success: true,
      data: goalPayload(completed),
      message: 'Goal marked as completed',
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.updateProgress = async (req, res) => {
  try {
    if (validationFailed(req, res)) return;

    const { progress } = req.body;
    const goal = await findOwnedGoal(req, res);
    if (!goal) return;

    goal.progress = Math.min(progress, 100);
    if (goal.progress === 100) {
      goal.status = 'completed';
      goal.completedDate = goal.completedDate || new Date();
    }

    await goal.save();
    await recordGoalHistory(goal, 'progress');
    await evaluateAchievements(toUserId(req));

    return res.json({
      success: true,
      data: goalPayload(goal),
      message: 'Goal progress updated',
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.logProgressEntry = async (req, res) => {
  try {
    if (validationFailed(req, res)) return;

    const { value, note, recordedAt } = req.body;
    const amount = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Progress value must be a non-negative number',
      });
    }

    const goal = await findOwnedGoal(req, res);
    if (!goal) return;

    goal.progressEntries.push({
      value: amount,
      note,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
    });
    goal.recalculateProgress();
    await goal.save();
    await recordGoalHistory(goal, 'progress');
    await evaluateAchievements(toUserId(req));

    return res.status(201).json({
      success: true,
      data: goalPayload(goal),
      completionPercentage: goal.progress,
      message: 'Progress entry logged successfully',
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.updateGoalStatus = async (req, res) => {
  try {
    if (validationFailed(req, res)) return;

    const { status } = req.body;
    if (!USER_GOAL_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be in_progress, completed, or paused',
      });
    }

    const goal = await findOwnedGoal(req, res);
    if (!goal) return;

    goal.status = status;
    if (status === 'completed') {
      goal.progress = 100;
      goal.completedDate = goal.completedDate || new Date();
    } else {
      goal.completedDate = null;
    }

    await goal.save();
    await recordGoalHistory(goal, 'status');
    await evaluateAchievements(toUserId(req));

    return res.json({
      success: true,
      data: goalPayload(goal),
      message: 'Goal status updated successfully',
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.addMilestone = async (req, res) => {
  try {
    if (validationFailed(req, res)) return;

    const { title, targetDate } = req.body;
    const goal = await findOwnedGoal(req, res);
    if (!goal) return;

    goal.milestones.push({
      title,
      targetDate: new Date(targetDate),
      completed: false,
    });
    await goal.save();

    return res.json({
      success: true,
      data: goalPayload(goal),
      message: 'Milestone added successfully',
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.completeMilestone = async (req, res) => {
  try {
    const goal = await findOwnedGoal(req, res);
    if (!goal) return;

    const milestone = goal.milestones.id(req.params.milestoneId);
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    milestone.completed = true;
    milestone.completedDate = new Date();
    await goal.save();

    return res.json({
      success: true,
      data: goalPayload(goal),
      message: 'Milestone completed',
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getGoalStats = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const userId = toUserId(req);
    await refreshOverdueStatuses(userId);

    const [stats, total, completed, active, overdue, paused, inProgress] = await Promise.all([
      Goal.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(String(userId)) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgProgress: { $avg: '$progress' },
          },
        },
      ]),
      Goal.countDocuments({ userId }),
      Goal.countDocuments({ userId, status: 'completed' }),
      Goal.countDocuments({ userId, status: { $in: ['active', 'in_progress'] } }),
      Goal.countDocuments({ userId, status: 'overdue' }),
      Goal.countDocuments({ userId, status: 'paused' }),
      Goal.countDocuments({ userId, status: 'in_progress' }),
    ]);

    return res.json({
      success: true,
      data: {
        total,
        completed,
        active,
        overdue,
        paused,
        inProgress,
        stats,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};
