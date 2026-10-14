const { startOfWeekKey, addDaysKey, dateKey } = require('./moodInsights');

const logDayKey = (log) => {
  if (!log?.date) return '';
  if (typeof log.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(log.date)) return log.date.slice(0, 10);
  return dateKey(log.date);
};

/**
 * Counts wellbeing logs the user actually saved this Monday-Sunday week.
 * A log counts only when minutes are greater than zero. Mood scores are not changed.
 */
const summarizeActivityWeek = (activities, todayKey) => {
  const weekStart = startOfWeekKey(todayKey);
  const weekEnd = addDaysKey(weekStart, 6);
  let loggedDays = 0;
  let targetDays = 0;

  const items = (Array.isArray(activities) ? activities : [])
    .filter((activity) => activity && !activity.deletedAt)
    .map((activity) => {
      const days = new Set(
        (activity.logs || [])
          .filter((log) => Number(log.minutes) > 0)
          .map(logDayKey)
          .filter((key) => key >= weekStart && key <= weekEnd)
      );
      const targetPerWeek = Number(activity.targetPerWeek) || 0;
      targetDays += targetPerWeek;
      loggedDays += days.size;
      return {
        title: activity.title,
        loggedDays: days.size,
        targetPerWeek,
      };
    });

  return { weekStart, weekEnd, loggedDays, targetDays, items };
};

module.exports = { summarizeActivityWeek };
