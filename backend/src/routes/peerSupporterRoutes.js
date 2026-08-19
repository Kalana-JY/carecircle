const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { applyForPeerSupporter, getApplicationStatus } = require('../controllers/peerSupporterController');

// All routes require authentication
router.use(protect);

router.post('/apply', applyForPeerSupporter);
router.get('/status', getApplicationStatus);

module.exports = router;
