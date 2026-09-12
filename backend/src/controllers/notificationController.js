const Notification = require('../models/Notification');
const Achievement = require('../models/Achievement');
const { ACHIEVEMENT_CATALOG } = require('../constants/goals');
const { handleError, toUserId, syncUserNotifications } = require('../services/goalTracking');
const mongoose = require('mongoose');

exports.listNotifications = async (req, res) => {
  try {
    const userId = toUserId(req);
    await syncUserNotifications(userId);

    const filter = { userId };
    if (req.query.unread === 'true') filter.read = false;

    const items = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
    const unreadCount = await Notification.countDocuments({ userId, read: false });

    return res.json({
      success: true,
      count: items.length,
      unreadCount,
      data: items,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification id' });
    }

    const notification = await Notification.findOne({ _id: req.params.id, userId: toUserId(req) });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.read = true;
    notification.readAt = notification.readAt || new Date();
    await notification.save();

    return res.json({ success: true, data: notification, message: 'Notification marked as read' });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: toUserId(req), read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    return res.json({
      success: true,
      updated: result.modifiedCount,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.listAchievements = async (req, res) => {
  try {
    const userId = toUserId(req);
    const unlocked = await Achievement.find({ userId }).sort({ unlockedAt: -1 });
    const unlockedKeys = new Set(unlocked.map((item) => item.key));

    return res.json({
      success: true,
      data: {
        unlocked,
        catalog: ACHIEVEMENT_CATALOG.map((item) => ({
          ...item,
          unlocked: unlockedKeys.has(item.key),
          unlockedAt: unlocked.find((entry) => entry.key === item.key)?.unlockedAt || null,
        })),
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};
