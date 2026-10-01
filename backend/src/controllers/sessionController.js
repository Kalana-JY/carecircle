const mongoose = require('mongoose');
const Session = require('../models/Session');
const PeerSupporterApplication = require('../models/PeerSupporterApplication');
const SessionFeedback = require('../models/SessionFeedback');

// Helper helper to verify if the user is an approved supporter
const checkSupporterApproval = async (userId) => {
  const application = await PeerSupporterApplication.findOne({ userId, status: 'approved' });
  return !!application;
};

// @desc    Create a new support session slot
// @route   POST /api/sessions
// @access  Private
const createSession = async (req, res) => {
  try {
    const isSupporter = await checkSupporterApproval(req.user._id);
    if (!isSupporter) {
      return res.status(403).json({ message: 'Only certified peer supporters can create and host sessions.' });
    }

    const { title, description, startTime, endTime, sessionType, venue } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ message: 'Please provide title, start time, and end time.' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid start time or end time format.' });
    }

    if (start < new Date()) {
      return res.status(400).json({ message: 'Session start time must be in the future.' });
    }

    if (end <= start) {
      return res.status(400).json({ message: 'End time must be after the start time.' });
    }

    const type = sessionType || 'online';
    if (!['online', 'physical'].includes(type)) {
      return res.status(400).json({ message: 'Invalid session type.' });
    }

    const sessionId = new mongoose.Types.ObjectId();
    let meetingLink = '';
    let finalVenue = '';

    if (type === 'online') {
      meetingLink = `https://meet.jit.si/CareCircle-${sessionId}`;
    } else {
      if (!venue || !venue.trim()) {
        return res.status(400).json({ message: 'Please provide a venue for physical sessions.' });
      }
      finalVenue = venue.trim();
    }

    const session = await Session.create({
      _id: sessionId,
      supporterId: req.user._id,
      title: title.trim(),
      description: description ? description.trim() : '',
      startTime: start,
      endTime: end,
      sessionType: type,
      venue: finalVenue,
      meetingLink,
      status: 'available',
    });

    res.status(201).json({
      message: 'Session slot created successfully.',
      session,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all available sessions (for users to book)
// @route   GET /api/sessions
// @access  Private
const getSessions = async (req, res) => {
  try {
    const { supporterId, admin } = req.query;
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const isUserAdmin = req.user && req.user.email.toLowerCase() === adminEmail;

    let query = {};
    if (admin === 'true' && isUserAdmin) {
      if (supporterId) {
        query.supporterId = supporterId;
      }
    } else {
      query = {
        status: 'available',
        startTime: { $gt: new Date() },
      };
      if (supporterId) {
        query.supporterId = supporterId;
      }
    }

    const sessions = await Session.find(query)
      .populate('supporterId', 'name email phoneNumber')
      .populate('userId', 'name email phoneNumber')
      .sort({ startTime: 1 });

    res.json({
      items: sessions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get supporter's own schedule (sessions they host)
// @route   GET /api/sessions/my-schedule
// @access  Private
const getMySchedule = async (req, res) => {
  try {
    const isSupporter = await checkSupporterApproval(req.user._id);
    if (!isSupporter) {
      return res.status(403).json({ message: 'Only certified peer supporters can view their hosting schedule.' });
    }

    const sessions = await Session.find({ supporterId: req.user._id })
      .populate('userId', 'name email phoneNumber')
      .sort({ startTime: 1 });

    res.json({
      items: sessions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user's booked sessions
// @route   GET /api/sessions/my-bookings
// @access  Private
const getMyBookings = async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user._id })
      .populate('supporterId', 'name email phoneNumber')
      .sort({ startTime: 1 });

    res.json({
      items: sessions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a session slot
// @route   PUT /api/sessions/:id
// @access  Private
const updateSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    // Verify ownership
    if (session.supporterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized. You do not host this session.' });
    }

    const { title, description, startTime, endTime, sessionType, venue, status } = req.body;

    // If booked, restrict updating key schedule attributes
    if (session.status === 'booked' && (startTime || endTime)) {
      return res.status(400).json({
        message: 'Cannot change date/time of a booked session. Please cancel the session or booking first.',
      });
    }

    if (title) session.title = title.trim();
    if (description !== undefined) session.description = description.trim();
    if (status) session.status = status;

    // Manage session type and venue transitions
    if (sessionType !== undefined) {
      if (!['online', 'physical'].includes(sessionType)) {
        return res.status(400).json({ message: 'Invalid session type.' });
      }
      session.sessionType = sessionType;
      if (sessionType === 'online') {
        session.meetingLink = `https://meet.jit.si/CareCircle-${session._id}`;
        session.venue = '';
      } else {
        const finalVenue = venue !== undefined ? venue : session.venue;
        if (!finalVenue || !finalVenue.trim()) {
          return res.status(400).json({ message: 'Venue is required for physical sessions.' });
        }
        session.meetingLink = '';
        session.venue = finalVenue.trim();
      }
    } else if (session.sessionType === 'physical' && venue !== undefined) {
      if (!venue || !venue.trim()) {
        return res.status(400).json({ message: 'Venue is required for physical sessions.' });
      }
      session.venue = venue.trim();
    }

    if (startTime || endTime) {
      const start = startTime ? new Date(startTime) : session.startTime;
      const end = endTime ? new Date(endTime) : session.endTime;

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: 'Invalid start time or end time format.' });
      }

      if (start < new Date()) {
        return res.status(400).json({ message: 'Session start time must be in the future.' });
      }

      if (end <= start) {
        return res.status(400).json({ message: 'End time must be after start time.' });
      }

      session.startTime = start;
      session.endTime = end;
    }

    await session.save();

    res.json({
      message: 'Session updated successfully.',
      session,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a session slot
// @route   DELETE /api/sessions/:id
// @access  Private
const deleteSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const isUserAdmin = req.user && req.user.email.toLowerCase() === adminEmail;

    // Verify ownership
    if (session.supporterId.toString() !== req.user._id.toString() && !isUserAdmin) {
      return res.status(403).json({ message: 'Unauthorized. You do not host this session.' });
    }

    // If session is booked, don't allow hard delete directly - must cancel it instead
    if (session.status === 'booked' && !isUserAdmin) {
      return res.status(400).json({
        message: 'Cannot delete a booked session. Please cancel the session instead to notify the user.',
      });
    }

    await Session.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Session slot deleted successfully.',
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Book an available session
// @route   POST /api/sessions/:id/book
// @access  Private
const bookSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    if (session.status !== 'available') {
      return res.status(400).json({ message: 'This session slot is no longer available for booking.' });
    }

    if (session.startTime < new Date()) {
      return res.status(400).json({ message: 'Cannot book a session that starts in the past.' });
    }

    // Supporters cannot book their own sessions
    if (session.supporterId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot book a support session that you host.' });
    }

    session.userId = req.user._id;
    session.status = 'booked';

    await session.save();

    const populated = await Session.findById(session._id).populate('supporterId', 'name email phoneNumber');

    res.json({
      message: 'Session booked successfully!',
      session: populated,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Cancel a session or booking
// @route   POST /api/sessions/:id/cancel
// @access  Private
const cancelSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    const currentUserIdStr = req.user._id.toString();
    const isSupporter = session.supporterId.toString() === currentUserIdStr;
    const isBookedClient = session.userId && session.userId.toString() === currentUserIdStr;

    if (!isSupporter && !isBookedClient) {
      return res.status(403).json({ message: 'Unauthorized. You are not a participant of this session.' });
    }

    if (isSupporter) {
      // Supporter cancels the session entirely
      session.status = 'cancelled';
      await session.save();
      return res.json({
        message: 'Session cancelled successfully.',
        session,
      });
    }

    if (isBookedClient) {
      // Client cancels their booking. The slot returns to available.
      session.userId = null;
      session.status = 'available';
      await session.save();
      return res.json({
        message: 'Booking cancelled successfully. The slot is now open again.',
        session,
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Submit feedback for a session
// @route   POST /api/sessions/:id/feedback
// @access  Private
const submitSessionFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Please provide a rating between 1 and 5 stars.' });
    }

    // Check if feedback already exists for this session and user
    let feedback = await SessionFeedback.findOne({
      sessionId: session._id,
      userId: req.user._id,
    });

    if (feedback) {
      feedback.rating = rating;
      feedback.comment = comment ? comment.trim() : '';
      await feedback.save();
    } else {
      feedback = await SessionFeedback.create({
        sessionId: session._id,
        supporterId: session.supporterId,
        userId: req.user._id,
        rating,
        comment: comment ? comment.trim() : '',
        sessionTitle: session.title,
        sessionType: session.sessionType,
      });
    }

    const populated = await SessionFeedback.findById(feedback._id)
      .populate('userId', 'name email avatarUrl')
      .populate('sessionId', 'title startTime endTime sessionType venue');

    res.status(201).json({
      message: 'Feedback submitted successfully.',
      feedback: populated,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all feedback received by the logged in peer supporter
// @route   GET /api/sessions/my-feedback
// @access  Private
const getSupporterFeedback = async (req, res) => {
  try {
    const supporterId = req.user._id;
    const { rating, sessionId, sessionType, search } = req.query;

    let filter = { supporterId };

    if (rating && !isNaN(Number(rating))) {
      filter.rating = Number(rating);
    }

    if (sessionId) {
      filter.sessionId = sessionId;
    }

    if (sessionType && ['online', 'physical'].includes(sessionType)) {
      filter.sessionType = sessionType;
    }

    if (search && search.trim()) {
      filter.$or = [
        { comment: { $regex: search.trim(), $options: 'i' } },
        { sessionTitle: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const feedbacks = await SessionFeedback.find(filter)
      .populate('userId', 'name email avatarUrl')
      .populate('sessionId', 'title startTime endTime sessionType venue')
      .sort({ createdAt: -1 });

    // Aggregate summary across ALL feedbacks for this supporter
    const allFeedbacks = await SessionFeedback.find({ supporterId });
    const totalFeedbacks = allFeedbacks.length;
    const sumRatings = allFeedbacks.reduce((sum, f) => sum + f.rating, 0);
    const averageRating = totalFeedbacks > 0 ? Number((sumRatings / totalFeedbacks).toFixed(1)) : 0;

    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    allFeedbacks.forEach((f) => {
      if (ratingBreakdown[f.rating] !== undefined) {
        ratingBreakdown[f.rating]++;
      }
    });

    // Extract unique sessions that have feedback
    const sessionMap = new Map();
    allFeedbacks.forEach((f) => {
      const sId = f.sessionId ? f.sessionId.toString() : '';
      if (sId && !sessionMap.has(sId)) {
        sessionMap.set(sId, {
          sessionId: sId,
          sessionTitle: f.sessionTitle || 'Support Session',
          sessionType: f.sessionType || 'online',
          feedbackCount: 1,
        });
      } else if (sId) {
        const item = sessionMap.get(sId);
        item.feedbackCount++;
      }
    });
    const sessionsList = Array.from(sessionMap.values());

    res.json({
      feedbacks,
      summary: {
        totalFeedbacks,
        averageRating,
        ratingBreakdown,
        sessionsList,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
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
};
