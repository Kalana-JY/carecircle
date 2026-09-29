const User = require('../models/User');
const Session = require('../models/Session');
const PeerSupporterApplication = require('../models/PeerSupporterApplication');
const Mood = require('../models/Mood');
const ForumPost = require('../models/ForumPost');

// Middleware helper to verify admin
const verifyAdmin = (req) => {
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  return req.user && req.user.email && req.user.email.toLowerCase() === adminEmail;
};

// @desc    Get Admin Dashboard Stats
// @route   GET /api/admin/stats
// @access  Private (Admin only)
const getAdminStats = async (req, res) => {
  try {
    if (!verifyAdmin(req)) {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const [
      totalUsers,
      totalSessions,
      activeSessions,
      completedSessions,
      approvedSupporters,
      pendingApplications,
      totalMoodLogs,
      totalForumPosts,
    ] = await Promise.all([
      User.countDocuments({}),
      Session.countDocuments({}),
      Session.countDocuments({ startTime: { $gte: new Date() }, status: { $in: ['available', 'booked'] } }),
      Session.countDocuments({ status: 'completed' }),
      PeerSupporterApplication.countDocuments({ status: 'approved' }),
      PeerSupporterApplication.countDocuments({ status: 'pending' }),
      Mood.countDocuments({}),
      ForumPost.countDocuments({}),
    ]);

    res.json({
      totalUsers,
      peerSupporters: approvedSupporters,
      totalSessions,
      activeSessions,
      completedSessions,
      pendingApplications,
      totalMoodLogs,
      totalForumPosts,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get All Users with Roles
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getAllUsers = async (req, res) => {
  try {
    if (!verifyAdmin(req)) {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const users = await User.find({ email: { $ne: adminEmail } }).sort({ createdAt: -1 });

    // Get all approved peer supporter user IDs
    const approvedApplications = await PeerSupporterApplication.find({ status: 'approved' });
    const supporterUserIdSet = new Set(approvedApplications.map((app) => app.userId.toString()));

    const usersWithRoles = users.map((u) => {
      const isPeerSupporter = supporterUserIdSet.has(u._id.toString());
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        phoneNumber: u.phoneNumber,
        role: isPeerSupporter ? 'Peer Supporter' : 'Member',
        createdAt: u.createdAt,
      };
    });

    res.json({
      items: usersWithRoles,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a User
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
const deleteUser = async (req, res) => {
  try {
    if (!verifyAdmin(req)) {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const userId = req.params.id;
    await User.findByIdAndDelete(userId);
    await PeerSupporterApplication.deleteMany({ userId });
    await Session.deleteMany({ $or: [{ supporterId: userId }, { userId }] });

    res.json({ message: 'User and associated data deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAdminStats,
  getAllUsers,
  deleteUser,
};
