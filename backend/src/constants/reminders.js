const REMINDER_TYPES = ['mood_log', 'wellness_activity', 'custom'];
const REMINDER_FREQUENCIES = ['once', 'daily', 'weekly'];
const REMINDER_STATUSES = ['active', 'paused', 'cancelled', 'completed'];

const REMINDER_NOTIFICATION_TYPES = ['mood_log_reminder', 'wellness_activity_reminder', 'custom_reminder'];

const NOTIFICATION_TYPE_BY_REMINDER = {
  mood_log: 'mood_log_reminder',
  wellness_activity: 'wellness_activity_reminder',
  custom: 'custom_reminder',
};

const DEFAULT_REMINDER_TITLE = {
  mood_log: 'Time to record your mood',
  wellness_activity: 'Time for your wellbeing activity',
  custom: 'Reminder',
};

const DEFAULT_REMINDER_BODY = {
  mood_log: 'Take a moment to log how you are feeling today.',
  wellness_activity: 'Keep your wellbeing routine going.',
  custom: 'You asked to be reminded about this.',
};

// "HH:MM" on a 24-hour clock, interpreted in the reminder's own timezone offset.
const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Offsets are minutes ahead of UTC (IST is +330), covering UTC-12 through UTC+14.
const MIN_UTC_OFFSET_MINUTES = -720;
const MAX_UTC_OFFSET_MINUTES = 840;

const MAX_ACTIVE_REMINDERS = 50;

module.exports = {
  REMINDER_TYPES,
  REMINDER_FREQUENCIES,
  REMINDER_STATUSES,
  REMINDER_NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_BY_REMINDER,
  DEFAULT_REMINDER_TITLE,
  DEFAULT_REMINDER_BODY,
  TIME_OF_DAY_PATTERN,
  MIN_UTC_OFFSET_MINUTES,
  MAX_UTC_OFFSET_MINUTES,
  MAX_ACTIVE_REMINDERS,
};
