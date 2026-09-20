const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createMood, listMoods, getMood, updateMood, deleteMood } = require('../controllers/moodController');
const {
  getMoodHistory,
  getWeeklyTrends,
  getMonthlyTrends,
  getMoodPatterns,
  compareMoodProgress,
} = require('../controllers/moodInsightController');
const {
  getMoodReport,
  exportMoodReport,
  createMoodReportShare,
  listMoodReportShares,
  revokeMoodReportShare,
} = require('../controllers/moodReportController');

router.use(protect);

router.post('/', createMood);
router.get('/', listMoods);

// Mood history and wellbeing trends
router.get('/history', getMoodHistory);
router.get('/trends/weekly', getWeeklyTrends);
router.get('/trends/monthly', getMonthlyTrends);
router.get('/patterns', getMoodPatterns);
router.get('/compare', compareMoodProgress);

// Mood report generation, export, and sharing
router.get('/reports/summary', getMoodReport);
router.get('/reports/export', exportMoodReport);
router.post('/reports/share', createMoodReportShare);
router.get('/reports/shares', listMoodReportShares);
router.delete('/reports/shares/:id', revokeMoodReportShare);

// Keep the id routes last so they do not swallow the named routes above.
router.get('/:id', getMood);
router.patch('/:id', updateMood);
router.delete('/:id', deleteMood);

module.exports = router;
