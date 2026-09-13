const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const {
  GOAL_CATEGORIES,
  GOAL_PRIORITIES,
  USER_GOAL_STATUSES,
  TRACKING_TYPES,
  REMINDER_FREQUENCIES,
} = require('../constants/goals');
const {
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
  completeGoal,
  updateProgress,
  logProgressEntry,
  updateGoalStatus,
  addMilestone,
  completeMilestone,
  getGoalStats,
} = require('../controllers/goalController');
const {
  getReminder,
  createReminder,
  updateReminder,
  cancelReminder,
} = require('../controllers/goalReminderController');
const {
  getDashboard,
  getGoalHistory,
  getAllHistory,
  getWeeklyReport,
  exportProgressReport,
} = require('../controllers/goalInsightController');

const router = express.Router();

router.use(protect);

const validateGoal = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isIn(GOAL_CATEGORIES)
    .withMessage('Invalid category'),
  body('target')
    .trim()
    .notEmpty()
    .withMessage('Target is required')
    .isLength({ max: 200 })
    .withMessage('Target cannot exceed 200 characters'),
  body('deadline')
    .notEmpty()
    .withMessage('Deadline is required')
    .isISO8601()
    .withMessage('Deadline must be a valid date'),
  body('priority')
    .optional()
    .isIn(GOAL_PRIORITIES)
    .withMessage('Priority must be low, medium, or high'),
  body('targetValue')
    .optional({ values: 'null' })
    .isFloat({ min: 0 })
    .withMessage('Target value must be a non-negative number'),
  body('trackingType').optional().isIn(TRACKING_TYPES).withMessage('Tracking type must be manual or steps'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
];

const validateUpdate = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  body('deadline').optional().isISO8601().withMessage('Deadline must be a valid date'),
  body('category').optional().isIn(GOAL_CATEGORIES).withMessage('Invalid category'),
  body('target')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Target cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Target cannot exceed 200 characters'),
  body('priority').optional().isIn(GOAL_PRIORITIES).withMessage('Priority must be low, medium, or high'),
  body('targetValue')
    .optional({ values: 'null' })
    .isFloat({ min: 0 })
    .withMessage('Target value must be a non-negative number'),
  body('trackingType').optional().isIn(TRACKING_TYPES).withMessage('Tracking type must be manual or steps'),
];

const validateProgress = [
  body('progress')
    .notEmpty()
    .withMessage('Progress is required')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100'),
];

const validateProgressEntry = [
  body('value')
    .notEmpty()
    .withMessage('Progress value is required')
    .isFloat({ min: 0 })
    .withMessage('Progress value must be a non-negative number'),
  body('note').optional().trim().isLength({ max: 500 }).withMessage('Note cannot exceed 500 characters'),
];

const validateStatus = [
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .isIn(USER_GOAL_STATUSES)
    .withMessage('Status must be in_progress, completed, or paused'),
];

const validateMilestone = [
  body('title').trim().notEmpty().withMessage('Milestone title is required'),
  body('targetDate')
    .notEmpty()
    .withMessage('Target date is required')
    .isISO8601()
    .withMessage('Target date must be a valid date'),
];

const validateReminder = [
  body('remindAt').notEmpty().withMessage('remindAt is required').isISO8601().withMessage('remindAt must be a valid date'),
  body('frequency').optional().isIn(REMINDER_FREQUENCIES).withMessage('Frequency must be once, daily, or weekly'),
  body('message').optional().trim().isLength({ max: 300 }).withMessage('Message cannot exceed 300 characters'),
];

const validateReminderUpdate = [
  body('remindAt').optional().isISO8601().withMessage('remindAt must be a valid date'),
  body('frequency').optional().isIn(REMINDER_FREQUENCIES).withMessage('Frequency must be once, daily, or weekly'),
  body('message').optional().trim().isLength({ max: 300 }).withMessage('Message cannot exceed 300 characters'),
];

router.get('/stats/overview', getGoalStats);
router.get('/dashboard', getDashboard);
router.get('/history', getAllHistory);
router.get('/reports/weekly', getWeeklyReport);
router.get('/reports/export', exportProgressReport);

router.post('/', validateGoal, createGoal);
router.get('/', getGoals);

router.get('/:id/reminder', getReminder);
router.post('/:id/reminder', validateReminder, createReminder);
router.put('/:id/reminder', validateReminderUpdate, updateReminder);
router.delete('/:id/reminder', cancelReminder);
router.get('/:id/history', getGoalHistory);

router.get('/:id', getGoalById);
router.put('/:id', validateUpdate, updateGoal);
router.delete('/:id', deleteGoal);

router.patch('/:id/complete', completeGoal);
router.patch('/:id/progress', validateProgress, updateProgress);
router.post('/:id/progress/entries', validateProgressEntry, logProgressEntry);
router.patch('/:id/status', validateStatus, updateGoalStatus);
router.post('/:id/milestones', validateMilestone, addMilestone);
router.patch('/:id/milestones/:milestoneId', completeMilestone);

module.exports = router;
