const Reminder = require('../models/Reminder');
const Notification = require('../models/Notification');
const {
  NOTIFICATION_TYPE_BY_REMINDER,
  DEFAULT_REMINDER_TITLE,
  DEFAULT_REMINDER_BODY,
  TIME_OF_DAY_PATTERN,
} = require('../constants/reminders');

// Reminders are stored as a local wall-clock time plus the offset they were set in,
// so an 8:00 AM reminder stays at 8:00 AM for the user regardless of server timezone.
const localDateKey = (instant, utcOffsetMinutes) =>
  new Date(instant.getTime() + utcOffsetMinutes * 60000).toISOString().slice(0, 10);

const localDayOfWeek = (dateKey) => new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();

const addDaysKey = (dateKey, days) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const instantFor = (dateKey, timeOfDay, utcOffsetMinutes) => {
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes) - utcOffsetMinutes * 60000);
};

const computeNextSendAt = (reminder, from = new Date()) => {
  const { frequency, timeOfDay, utcOffsetMinutes = 0 } = reminder;

  if (frequency === 'once') {
    // A one-off reminder has a single occurrence, so it is spent once it has fired.
    // Editing it clears lastSentAt, which re-arms it for the new date.
    if (reminder.lastSentAt) return null;
    return instantFor(reminder.startDate, timeOfDay, utcOffsetMinutes);
  }

  const todayKey = localDateKey(from, utcOffsetMinutes);
  const wantedDays = frequency === 'weekly' ? reminder.daysOfWeek || [] : null;

  // Scan forward a little over a week so weekly reminders always find their next slot.
  for (let offset = 0; offset <= 8; offset += 1) {
    const candidateKey = addDaysKey(todayKey, offset);
    if (wantedDays && !wantedDays.includes(localDayOfWeek(candidateKey))) continue;

    const candidate = instantFor(candidateKey, timeOfDay, utcOffsetMinutes);
    if (candidate > from) return candidate;
  }

  return null;
};

const notificationContentFor = (reminder) => ({
  type: NOTIFICATION_TYPE_BY_REMINDER[reminder.type],
  title: reminder.title || DEFAULT_REMINDER_TITLE[reminder.type],
  body: reminder.message || DEFAULT_REMINDER_BODY[reminder.type],
});

const createReminderNotification = async (reminder, dueAt) => {
  const { type, title, body } = notificationContentFor(reminder);
  const payload = {
    userId: reminder.userId,
    type,
    title,
    body,
    dedupeKey: `${reminder._id}:${type}:${dueAt.toISOString()}`,
    metadata: {
      reminderId: reminder._id,
      reminderType: reminder.type,
      frequency: reminder.frequency,
      scheduledFor: dueAt,
    },
  };

  try {
    return await Notification.create(payload);
  } catch (error) {
    // A duplicate means this occurrence was already delivered.
    if (error.code === 11000) return Notification.findOne({ userId: reminder.userId, dedupeKey: payload.dedupeKey });
    throw error;
  }
};

// US-33 - turn every due reminder occurrence into a notification.
const syncReminderNotifications = async (userId, now = new Date()) => {
  const due = await Reminder.find({
    userId,
    status: 'active',
    nextSendAt: { $ne: null, $lte: now },
  });

  const delivered = [];

  for (const reminder of due) {
    // Catch up on every occurrence missed since the last sync, newest schedule last.
    let guard = 0;
    while (reminder.nextSendAt && reminder.nextSendAt <= now && guard < 50) {
      const dueAt = reminder.nextSendAt;
      delivered.push(await createReminderNotification(reminder, dueAt));

      reminder.lastSentAt = now;
      reminder.occurrenceCount += 1;
      reminder.nextSendAt = computeNextSendAt({ ...reminder.toObject(), lastSentAt: now }, dueAt);
      guard += 1;
    }

    if (!reminder.nextSendAt) reminder.status = 'completed';
    await reminder.save();
  }

  return delivered.filter(Boolean);
};

// Creates inbox notifications for every reminder that is due, even if that user
// does not currently have the app open.
const syncAllDueReminders = async (now = new Date()) => {
  const dueUsers = await Reminder.distinct('userId', {
    status: 'active',
    nextSendAt: { $ne: null, $lte: now },
  });

  const delivered = [];
  for (const userId of dueUsers) {
    const created = await syncReminderNotifications(userId, now);
    delivered.push(...created);
  }
  return delivered;
};

const isValidTimeOfDay = (value) => typeof value === 'string' && TIME_OF_DAY_PATTERN.test(value);

const isValidDateKey = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

module.exports = {
  isValidDateKey,
  localDateKey,
  localDayOfWeek,
  addDaysKey,
  instantFor,
  computeNextSendAt,
  notificationContentFor,
  createReminderNotification,
  syncReminderNotifications,
  syncAllDueReminders,
  isValidTimeOfDay,
};
