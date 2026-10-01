const Notification = require('../models/Notification');
const Session = require('../models/Session');
const User = require('../models/User');

const formatSessionTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const createNotificationSafe = async (payload) => {
  try {
    return await Notification.create(payload);
  } catch (error) {
    if (error.code === 11000) {
      return Notification.findOne({ userId: payload.userId, dedupeKey: payload.dedupeKey });
    }
    console.error('[SessionNotification] Error creating notification:', error.message);
    return null;
  }
};

const notifySessionBooked = async (session, memberUser) => {
  if (!session) return;
  const timeStr = formatSessionTime(session.startTime);

  // 1. Notify Supporter (host)
  if (session.supporterId) {
    await createNotificationSafe({
      userId: session.supporterId,
      type: 'session_booked',
      title: 'New Session Booking',
      body: `${memberUser?.name || 'A member'} booked your session "${session.title}" for ${timeStr}.`,
      dedupeKey: `session_booked:supporter:${session._id}:${Date.now()}`,
      metadata: {
        sessionId: session._id,
        memberId: memberUser?._id,
        startTime: session.startTime,
      },
    });
  }

  // 2. Notify Member (client)
  if (session.userId) {
    await createNotificationSafe({
      userId: session.userId,
      type: 'session_booked',
      title: 'Session Confirmed',
      body: `Your session "${session.title}" is confirmed for ${timeStr}.`,
      dedupeKey: `session_booked:member:${session._id}:${Date.now()}`,
      metadata: {
        sessionId: session._id,
        supporterId: session.supporterId,
        startTime: session.startTime,
      },
    });
  }
};

const notifySessionUpdated = async (session, supporterUser) => {
  if (!session || !session.userId) return;
  const timeStr = formatSessionTime(session.startTime);

  await createNotificationSafe({
    userId: session.userId,
    type: 'session_updated',
    title: 'Session Updated',
    body: `Your session "${session.title}" for ${timeStr} has been updated by the supporter.`,
    dedupeKey: `session_updated:member:${session._id}:${Date.now()}`,
    metadata: {
      sessionId: session._id,
      supporterId: session.supporterId,
      startTime: session.startTime,
    },
  });
};

const notifySessionCancelled = async (session, cancelledByRole, cancelledByUser) => {
  if (!session) return;
  const timeStr = formatSessionTime(session.startTime);

  if (cancelledByRole === 'member') {
    // Member cancelled -> notify Supporter
    if (session.supporterId) {
      await createNotificationSafe({
        userId: session.supporterId,
        type: 'session_cancelled',
        title: 'Booking Cancelled',
        body: `${cancelledByUser?.name || 'The member'} cancelled their booking for "${session.title}" on ${timeStr}.`,
        dedupeKey: `session_cancelled:supporter:${session._id}:${Date.now()}`,
        metadata: {
          sessionId: session._id,
          memberId: cancelledByUser?._id,
          startTime: session.startTime,
        },
      });
    }
  } else {
    // Supporter cancelled -> notify Member
    if (session.userId) {
      await createNotificationSafe({
        userId: session.userId,
        type: 'session_cancelled',
        title: 'Session Cancelled',
        body: `Your session "${session.title}" scheduled for ${timeStr} was cancelled by the host.`,
        dedupeKey: `session_cancelled:member:${session._id}:${Date.now()}`,
        metadata: {
          sessionId: session._id,
          supporterId: session.supporterId,
          startTime: session.startTime,
        },
      });
    }
  }
};

const notifySessionDeleted = async (session, deletedByUser) => {
  if (!session || !session.userId) return;
  const timeStr = formatSessionTime(session.startTime);

  await createNotificationSafe({
    userId: session.userId,
    type: 'session_deleted',
    title: 'Session Removed',
    body: `Your booked session "${session.title}" scheduled for ${timeStr} has been removed.`,
    dedupeKey: `session_deleted:member:${session._id}:${Date.now()}`,
    metadata: {
      sessionId: session._id,
      startTime: session.startTime,
    },
  });
};

const syncSessionReminders = async (userId, now = new Date()) => {
  try {
    const upcomingSessions = await Session.find({
      userId,
      status: 'booked',
      startTime: { $gt: now, $lte: new Date(now.getTime() + 25 * 60 * 60 * 1000) },
    });

    const PRESETS = [24, 12, 6, 3, 1];

    for (const session of upcomingSessions) {
      const remainingMs = new Date(session.startTime).getTime() - now.getTime();
      const remainingHours = remainingMs / (1000 * 60 * 60);

      for (const preset of PRESETS) {
        if (remainingHours <= preset) {
          const timeStr = formatSessionTime(session.startTime);
          const label = preset === 1 ? '1 hour' : `${preset} hours`;

          await createNotificationSafe({
            userId,
            type: 'session_reminder',
            title: 'Upcoming Session Reminder',
            body: `Your session "${session.title}" starts in less than ${label} (${timeStr}).`,
            dedupeKey: `session_reminder:${userId}:${session._id}:${preset}h`,
            metadata: {
              sessionId: session._id,
              thresholdHours: preset,
              startTime: session.startTime,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error('[SessionNotification] Error syncing session reminders:', error.message);
  }
};

module.exports = {
  notifySessionBooked,
  notifySessionUpdated,
  notifySessionCancelled,
  notifySessionDeleted,
  syncSessionReminders,
  formatSessionTime,
};
