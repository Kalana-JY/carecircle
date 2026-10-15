const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createSession,
  getSessions,
  getMySchedule,
  getMyBookings,
  updateSession,
  deleteSession,
  bookSession,
  cancelSession,
  submitSessionFeedback,
  getSupporterFeedback,
  exportSessionReportPdf,
} = require('../controllers/sessionController');

// All routes require authentication
router.use(protect);

// Report Export
router.get('/export-pdf', exportSessionReportPdf);

// Schedule & Bookings specific views
router.get('/my-schedule', getMySchedule);
router.get('/my-bookings', getMyBookings);
router.get('/my-feedback', getSupporterFeedback);

// Core CRUD
router.post('/', createSession);
router.get('/', getSessions);
router.put('/:id', updateSession);
router.delete('/:id', deleteSession);

// Booking actions
router.post('/:id/book', bookSession);
router.post('/:id/cancel', cancelSession);
router.post('/:id/feedback', submitSessionFeedback);

module.exports = router;
