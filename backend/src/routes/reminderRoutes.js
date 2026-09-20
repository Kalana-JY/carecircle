const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const {
  REMINDER_TYPES,
  REMINDER_FREQUENCIES,
  TIME_OF_DAY_PATTERN,
  MIN_UTC_OFFSET_MINUTES,
  MAX_UTC_OFFSET_MINUTES,
} = require('../constants/reminders');
const {
  createReminder,
  listReminders,
  getReminder,
  updateReminder,
  updateReminderStatus,
  deleteReminder,
  listReminderNotifications,
} = require('../controllers/reminderController');

const router = express.Router();

router.use(protect);

const timeOfDayRule = (chain) => chain.matches(TIME_OF_DAY_PATTERN).withMessage('timeOfDay must be in HH:MM 24-hour format');

const sharedRules = [
  body('type').optional().isIn(REMINDER_TYPES).withMessage(`type must be one of: ${REMINDER_TYPES.join(', ')}`),
  body('frequency')
    .optional()
    .isIn(REMINDER_FREQUENCIES)
    .withMessage(`frequency must be one of: ${REMINDER_FREQUENCIES.join(', ')}`),
  body('title').optional().trim().isLength({ max: 120 }).withMessage('Title cannot exceed 120 characters'),
  body('message').optional().trim().isLength({ max: 300 }).withMessage('Message cannot exceed 300 characters'),
  body('daysOfWeek').optional().isArray().withMessage('daysOfWeek must be an array'),
  body('daysOfWeek.*').optional().isInt({ min: 0, max: 6 }).withMessage('daysOfWeek entries must be between 0 and 6'),
  body('utcOffsetMinutes')
    .optional()
    .isInt({ min: MIN_UTC_OFFSET_MINUTES, max: MAX_UTC_OFFSET_MINUTES })
    .withMessage('utcOffsetMinutes must be a valid UTC offset in minutes'),
];

const validateCreate = [
  timeOfDayRule(body('timeOfDay').notEmpty().withMessage('timeOfDay is required')),
  ...sharedRules,
];

const validateUpdate = [timeOfDayRule(body('timeOfDay').optional()), ...sharedRules];

router.get('/notifications', listReminderNotifications);

router.post('/', validateCreate, createReminder);
router.get('/', listReminders);

router.get('/:id', getReminder);
router.put('/:id', validateUpdate, updateReminder);
router.patch('/:id/status', updateReminderStatus);
router.delete('/:id', deleteReminder);

module.exports = router;
