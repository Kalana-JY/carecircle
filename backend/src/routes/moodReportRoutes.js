const express = require('express');
const {
  getSharedMoodReport,
  exportSharedMoodReport,
} = require('../controllers/moodReportController');

const router = express.Router();

// Deliberately unauthenticated: a shared report is opened by a clinician or
// trusted person who does not have a CareCircle account. Access is controlled
// by the unguessable token plus the share's expiry and revocation state.
router.get('/shared/:token', getSharedMoodReport);
router.get('/shared/:token/export', exportSharedMoodReport);

module.exports = router;
