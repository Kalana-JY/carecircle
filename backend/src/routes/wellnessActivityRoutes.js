const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createActivity, listActivities, updateActivity, deleteActivity, logActivity } = require('../controllers/wellnessActivityController');

const router = express.Router();
router.use(protect);
router.post('/', createActivity);
router.get('/', listActivities);
router.patch('/:id', updateActivity);
router.delete('/:id', deleteActivity);
router.post('/:id/logs', logActivity);

module.exports = router;