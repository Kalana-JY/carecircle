const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const {
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
  completeGoal,
  updateProgress,
  addMilestone,
  completeMilestone,
  getGoalStats,
} = require('../controllers/goalController');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Validation middleware
const validateGoal = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
  body('deadline')
    .notEmpty()
    .withMessage('Deadline is required')
    .isISO8601()
    .withMessage('Deadline must be a valid date'),
  body('category')
    .optional()
    .isIn(['health', 'fitness', 'mental-health', 'career', 'education', 'personal', 'financial', 'other'])
    .withMessage('Invalid category'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
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
  body('deadline')
    .optional()
    .isISO8601()
    .withMessage('Deadline must be a valid date'),
  body('category')
    .optional()
    .isIn(['health', 'fitness', 'mental-health', 'career', 'education', 'personal', 'financial', 'other'])
    .withMessage('Invalid category'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('progress')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100'),
  body('status')
    .optional()
    .isIn(['active', 'completed', 'overdue', 'paused'])
    .withMessage('Invalid status'),
];

const validateProgress = [
  body('progress')
    .notEmpty()
    .withMessage('Progress is required')
    .isInt({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100'),
];

const validateMilestone = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Milestone title is required'),
  body('targetDate')
    .notEmpty()
    .withMessage('Target date is required')
    .isISO8601()
    .withMessage('Target date must be a valid date'),
];

// Stats route (must be before /:id to avoid conflicts)
router.get('/stats/overview', getGoalStats);

// CRUD routes
router.post('/', validateGoal, createGoal);
router.get('/', getGoals);
router.get('/:id', getGoalById);
router.put('/:id', validateUpdate, updateGoal);
router.delete('/:id', deleteGoal);

// Additional endpoints
router.patch('/:id/complete', completeGoal);
router.patch('/:id/progress', validateProgress, updateProgress);
router.post('/:id/milestones', validateMilestone, addMilestone);
router.patch('/:id/milestones/:milestoneId', completeMilestone);

module.exports = router;
