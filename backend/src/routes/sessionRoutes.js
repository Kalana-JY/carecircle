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
} = require('../controllers/sessionController');

// All routes require authentication
router.use(protect);

// Schedule & Bookings specific views
router.get('/my-schedule', getMySchedule);
router.get('/my-bookings', getMyBookings);

// Core CRUD
router.post('/', createSession);
router.get('/', getSessions);
router.put('/:id', updateSession);
router.delete('/:id', deleteSession);

// Booking actions
router.post('/:id/book', bookSession);
router.post('/:id/cancel', cancelSession);

module.exports = router;
