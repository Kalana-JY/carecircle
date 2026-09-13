const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const { STEP_PERMISSIONS } = require('../constants/goals');
const {
  getStepPermission,
  updateStepPermission,
  syncSteps,
  getTodaySteps,
} = require('../controllers/stepController');

const router = express.Router();
router.use(protect);

const validatePermission = [
  body('permission')
    .trim()
    .notEmpty()
    .withMessage('Permission is required')
    .isIn(STEP_PERMISSIONS.filter((value) => value !== 'undetermined'))
    .withMessage('Permission must be granted or denied'),
];

const validateSteps = [
  body('steps').optional().isFloat({ min: 0 }).withMessage('steps must be a non-negative number'),
  body('delta').optional().isFloat({ min: 0 }).withMessage('delta must be a non-negative number'),
  body('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD'),
];

router.get('/permission', getStepPermission);
router.post('/permission', validatePermission, updateStepPermission);
router.get('/today', getTodaySteps);
router.post('/', validateSteps, syncSteps);

router.registerRoot = (app) => {
  app.post('/api/steps', protect, validateSteps, syncSteps);
};

module.exports = router;
