const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { listAchievements } = require('../controllers/notificationController');

const router = express.Router();
router.use(protect);
router.get('/', listAchievements);

router.registerRoot = (app) => {
  app.get('/api/achievements', protect, listAchievements);
};

module.exports = router;
