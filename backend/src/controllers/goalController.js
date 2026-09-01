const Goal = require('../models/Goal');
const { validationResult } = require('express-validator');

// @desc    Create a new goal
// @route   POST /api/goals
// @access  Privat
exports.createGoal = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

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
      reminder,
      reminderTime,
      completionDates,
      progress,
    } = req.body;

    if (new Date(deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Deadline must be in the future',
      });
    }

    const goal = await Goal.create({
      userId: req.user.id,
      title,
      description,
      category,
      target,
      targetValue,
      targetUnit,
      deadline,
      priority,
      notes,
      tags: tags || [],
      reminder: Boolean(reminder),
      reminderTime: reminderTime || null,
      completionDates: completionDates || [],
      progress: typeof progress === 'number' ? progress : 0,
      status: 'active',
    });

    res.status(201).json({
      success: true,
      data: goal,
      message: 'Goal created successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all goals for a user with optional filtering
// @route   GET /api/goals
// @access  Private
exports.getGoals = async (req, res) => {
  try {
    const { status, category, priority, sort } = req.query;
    const userId = req.user.id;

    // Build filter object
    const filter = { userId };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    // Build sort object
    let sortObj = { createdAt: -1 };
    if (sort === 'deadline') {
      sortObj = { deadline: 1 };
    } else if (sort === 'priority') {
      sortObj = { priority: -1 };
    }

    const goals = await Goal.find(filter).sort(sortObj).populate('userId', 'name email');

    // Update status for overdue goals
    const now = new Date();
    goals.forEach((goal) => {
      if (goal.status !== 'completed' && goal.deadline < now && goal.status !== 'overdue') {
        goal.status = 'overdue';
        goal.save();
      }
    });

    res.json({
      success: true,
      count: goals.length,
      data: goals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get a single goal by ID
// @route   GET /api/goals/:id
// @access  Private
exports.getGoalById = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id).populate('userId', 'name email');

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
    }

    // Check authorization
    if (goal.userId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this goal',
      });
    }

    res.json({
      success: true,
      data: goal,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update a goal
// @route   PUT /api/goals/:id
// @access  Private
exports.updateGoal = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    let goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
    }

    // Check authorization
    if (goal.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this goal',
      });
    }

    const {
      title,
      description,
      category,
      target,
      deadline,
      priority,
      progress,
      status,
      targetValue,
      targetUnit,
      notes,
      tags,
      reminder,
      reminderTime,
      completionDates,
    } = req.body;

    if (deadline && new Date(deadline) < new Date() && status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Deadline must be in the future for active goals',
      });
    }

    if (title !== undefined) goal.title = title;
    if (description !== undefined) goal.description = description;
    if (category !== undefined) goal.category = category;
    if (target !== undefined) goal.target = target;
    if (targetValue !== undefined) goal.targetValue = targetValue;
    if (targetUnit !== undefined) goal.targetUnit = targetUnit;
    if (deadline !== undefined) goal.deadline = deadline;
    if (priority !== undefined) goal.priority = priority;
    if (progress !== undefined) {
      goal.progress = Math.min(progress, 100);
      if (progress >= 100 && goal.status !== 'completed') {
        goal.status = 'completed';
        goal.completedDate = new Date();
      }
    }
    if (status !== undefined) goal.status = status;
    if (status === 'completed' && !goal.completedDate) {
      goal.completedDate = new Date();
      goal.progress = 100;
    }
    if (notes !== undefined) goal.notes = notes;
    if (tags !== undefined) goal.tags = tags;
    if (reminder !== undefined) goal.reminder = Boolean(reminder);
    if (reminderTime !== undefined) goal.reminderTime = reminderTime || null;
    if (completionDates !== undefined) goal.completionDates = completionDates;

    goal = await goal.save();

    res.json({
      success: true,
      data: goal,
      message: 'Goal updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete a goal
// @route   DELETE /api/goals/:id
// @access  Private
exports.deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
    }

    // Check authorization
    if (goal.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this goal',
      });
    }

    await Goal.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Goal deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark goal as completed
// @route   PATCH /api/goals/:id/complete
// @access  Private
exports.completeGoal = async (req, res) => {
  try {
    let goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
    }

    // Check authorization
    if (goal.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this goal',
      });
    }

    goal = await goal.markComplete();

    res.json({
      success: true,
      data: goal,
      message: 'Goal marked as completed',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update goal progress
// @route   PATCH /api/goals/:id/progress
// @access  Private
exports.updateProgress = async (req, res) => {
  try {
    const { progress } = req.body;

    if (progress === undefined || progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: 'Progress must be between 0 and 100',
      });
    }

    let goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
    }

    // Check authorization
    if (goal.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this goal',
      });
    }

    goal.progress = progress;

    // Auto-complete if progress reaches 100%
    if (progress === 100) {
      goal.status = 'completed';
      goal.completedDate = new Date();
    }

    goal = await goal.save();

    res.json({
      success: true,
      data: goal,
      message: 'Goal progress updated',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Log a progress entry and recalculate goal completion
// @route   POST /api/goals/:id/progress/entries
// @access  Private
exports.logProgressEntry = async (req, res) => {
  try {
    const { value } = req.body;

    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return res.status(400).json({
        success: false,
        message: 'Progress value must be a non-negative number',
      });
    }

    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
    }

    if (goal.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this goal',
      });
    }

    if (typeof goal.targetValue !== 'number' || goal.targetValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A positive targetValue is required to log progress',
      });
    }

    goal.progressEntries.push({ value });
    const recordedProgress = goal.progressEntries.reduce((total, entry) => total + entry.value, 0);
    goal.progress = Math.min((recordedProgress / goal.targetValue) * 100, 100);

    if (goal.progress === 100) {
      goal.status = 'completed';
      goal.completedDate = goal.completedDate || new Date();
    }

    await goal.save();

    return res.status(201).json({
      success: true,
      data: goal,
      completionPercentage: goal.progress,
      message: 'Progress entry logged successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update goal status
// @route   PATCH /api/goals/:id/status
// @access  Private
exports.markTodayDone = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
    }

    if (goal.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this goal',
      });
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const alreadyDoneToday = goal.completionDates.some((date) => {
      const completionDate = new Date(date);
      return completionDate >= startOfDay && completionDate < new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    });

    if (alreadyDoneToday) {
      return res.json({
        success: true,
        data: goal,
        message: 'Goal already marked as done today',
      });
    }

    goal.completionDates.push(new Date());
    const completedCount = goal.completionDates.length;
    const progress = Math.min(100, (completedCount / 7) * 100);
    goal.progress = progress;

    if (completedCount >= 7) {
      goal.status = 'completed';
      goal.completedDate = new Date();
    } else if (goal.status === 'completed') {
      goal.status = 'active';
    }

    await goal.save();

    return res.json({
      success: true,
      data: goal,
      message: 'Goal marked as done for today',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateGoalStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['in_progress', 'completed', 'paused'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be in_progress, completed, or paused',
      });
    }

    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
    }

    if (goal.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this goal',
      });
    }

    goal.status = status;
    if (status === 'completed') {
      goal.progress = 100;
      goal.completedDate = goal.completedDate || new Date();
    } else {
      goal.completedDate = null;
    }

    await goal.save();

    return res.json({
      success: true,
      data: goal,
      message: 'Goal status updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Add milestone to goal
// @route   POST /api/goals/:id/milestones
// @access  Private
exports.addMilestone = async (req, res) => {
  try {
    const { title, targetDate } = req.body;

    if (!title || !targetDate) {
      return res.status(400).json({
        success: false,
        message: 'Title and target date are required',
      });
    }

    let goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
    }

    // Check authorization
    if (goal.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this goal',
      });
    }

    goal.milestones.push({
      title,
      targetDate: new Date(targetDate),
      completed: false,
    });

    goal = await goal.save();

    res.json({
      success: true,
      data: goal,
      message: 'Milestone added successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Complete milestone
// @route   PATCH /api/goals/:id/milestones/:milestoneId
// @access  Private
exports.completeMilestone = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;

    let goal = await Goal.findById(id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
    }

    // Check authorization
    if (goal.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this goal',
      });
    }

    const milestone = goal.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found',
      });
    }

    milestone.completed = true;
    milestone.completedDate = new Date();

    goal = await goal.save();

    res.json({
      success: true,
      data: goal,
      message: 'Milestone completed',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get goal statistics for user
// @route   GET /api/goals/stats/overview
// @access  Private
exports.getGoalStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Goal.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgProgress: { $avg: '$progress' },
        },
      },
    ]);

    const totalGoals = await Goal.countDocuments({ userId });
    const completedGoals = await Goal.countDocuments({ userId, status: 'completed' });
    const activeGoals = await Goal.countDocuments({ userId, status: 'active' });
    const overdueGoals = await Goal.countDocuments({ userId, status: 'overdue' });

    res.json({
      success: true,
      data: {
        total: totalGoals,
        completed: completedGoals,
        active: activeGoals,
        overdue: overdueGoals,
        stats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
