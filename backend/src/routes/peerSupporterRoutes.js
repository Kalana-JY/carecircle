const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  applyForPeerSupporter,
  getApplicationStatus,
  getApplications,
  updateApplicationStatus,
} = require('../controllers/peerSupporterController');

// All routes require authentication
router.use(protect);

router.post('/apply', applyForPeerSupporter);
router.get('/status', getApplicationStatus);

// Admin-only application routes
router.get('/applications', getApplications);
router.patch('/applications/:id', updateApplicationStatus);

module.exports = router;
