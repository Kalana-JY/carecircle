const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  listRecommendations,
  getDailyTip,
  getMotivationalMessage,
  listRecommendedActivities,
} = require('../controllers/wellbeingController');

const router = express.Router();

router.use(protect);

router.get('/recommendations', listRecommendations);
router.get('/tips', getDailyTip);
router.get('/motivation', getMotivationalMessage);
router.get('/activities', listRecommendedActivities);

module.exports = router;
