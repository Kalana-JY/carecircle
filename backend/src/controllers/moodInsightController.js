const {
  isValidDate,
  handleError,
  dateKey,
  addDaysKey,
  addMonthsKey,
  monthKey,
  monthLabel,
  startOfWeekKey,
  daysBetween,
  fetchEntries,
  summarize,
  dailySeries,
  weeklyBuckets,
  monthlyBuckets,
  trendDirection,
  analysePatterns,
  recordingStreak,
  compareSummaries,
} = require('../services/moodInsights');
const {
  COMPARE_PERIODS,
  DEFAULT_TREND_WEEKS,
  MAX_TREND_WEEKS,
  DEFAULT_TREND_MONTHS,
  MAX_TREND_MONTHS,
  DEFAULT_REPORT_DAYS,
} = require('../constants/moods');

const boundedInt = (raw, fallback, min, max) => {
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return null;
  return Math.min(max, Math.max(min, parsed));
};

// The phone sends its local calendar day as ?today= so weeks are Monday-Sunday
// in the user's timezone. Without it, the server UTC date is used.
const resolveToday = (query = {}) => {
  if (query.today === undefined || query.today === '') return { today: dateKey() };
  if (!isValidDate(query.today)) return { error: 'today must be a valid date in YYYY-MM-DD format' };
  return { today: query.today };
};

// Resolves ?start=&end= into inclusive day keys, defaulting to a trailing window.
const resolveRange = (query, fallbackDays = DEFAULT_REPORT_DAYS) => {
  const todayResult = resolveToday(query);
  if (todayResult.error) return todayResult;

  if (query.start !== undefined && !isValidDate(query.start)) {
    return { error: 'start must be a valid date in YYYY-MM-DD format' };
  }
  if (query.end !== undefined && !isValidDate(query.end)) {
    return { error: 'end must be a valid date in YYYY-MM-DD format' };
  }

  const endKey = query.end || todayResult.today;
  const startKey = query.start || addDaysKey(endKey, -(fallbackDays - 1));

  if (startKey > endKey) return { error: 'start must be on or before end' };

  return { startKey, endKey };
};

// US-21 - View mood history
exports.getMoodHistory = async (req, res) => {
  try {
    const range = resolveRange(req.query, DEFAULT_REPORT_DAYS);
    if (range.error) return res.status(400).json({ message: range.error });

    const page = boundedInt(req.query.page, 1, 1, Number.MAX_SAFE_INTEGER);
    const limit = boundedInt(req.query.limit, 50, 1, 200);
    if (page === null || limit === null) {
      return res.status(400).json({ message: 'page and limit must be numbers' });
    }

    let entries = await fetchEntries(req.user._id, range);
    if (req.query.mood) {
      const wanted = String(req.query.mood).trim().toLowerCase();
      entries = entries.filter((entry) => String(entry.mood).trim().toLowerCase() === wanted);
    }

    // Newest first reads more naturally as a journey log.
    const ordered = [...entries].reverse();
    const start = (page - 1) * limit;

    return res.json({
      range: { start: range.startKey, end: range.endKey, days: daysBetween(range.startKey, range.endKey) + 1 },
      summary: summarize(entries),
      timeline: dailySeries(entries, range.startKey, range.endKey),
      items: ordered.slice(start, start + limit),
      meta: { page, limit, total: ordered.length },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// US-22 - View weekly mood trends
exports.getWeeklyTrends = async (req, res) => {
  try {
    const todayResult = resolveToday(req.query);
    if (todayResult.error) return res.status(400).json({ message: todayResult.error });

    const weeks = boundedInt(req.query.weeks, DEFAULT_TREND_WEEKS, 1, MAX_TREND_WEEKS);
    if (weeks === null) return res.status(400).json({ message: 'weeks must be a number' });

    const today = todayResult.today;
    const reference = new Date(`${today}T12:00:00.000Z`);
    const currentWeekStart = startOfWeekKey(reference);
    const startKey = addDaysKey(currentWeekStart, -(weeks - 1) * 7);
    const endKey = addDaysKey(currentWeekStart, 6);

    const entries = await fetchEntries(req.user._id, { startKey, endKey });
    const buckets = weeklyBuckets(entries, weeks, reference);
    const thisWeek = buckets[buckets.length - 1];
    const lastWeek = buckets.length > 1 ? buckets[buckets.length - 2] : null;
    const streakEntries = await fetchEntries(req.user._id, {
      startKey: addDaysKey(today, -120),
      endKey: today,
    });

    return res.json({
      range: { start: startKey, end: endKey, weeks, today },
      weeks: buckets,
      thisWeek,
      lastWeek,
      weekOverWeek: lastWeek ? compareSummaries(thisWeek, lastWeek) : null,
      trend: trendDirection(buckets),
      recordingStreak: recordingStreak(streakEntries, today),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// US-23 - View monthly mood trends
exports.getMonthlyTrends = async (req, res) => {
  try {
    const todayResult = resolveToday(req.query);
    if (todayResult.error) return res.status(400).json({ message: todayResult.error });

    const months = boundedInt(req.query.months, DEFAULT_TREND_MONTHS, 1, MAX_TREND_MONTHS);
    if (months === null) return res.status(400).json({ message: 'months must be a number' });

    const reference = new Date(`${todayResult.today}T12:00:00.000Z`);
    const currentMonth = monthKey(reference);
    const startMonth = addMonthsKey(currentMonth, -(months - 1));
    const startKey = `${startMonth}-01`;
    const endKey = addDaysKey(`${addMonthsKey(currentMonth, 1)}-01`, -1);

    const entries = await fetchEntries(req.user._id, { startKey, endKey });
    const buckets = monthlyBuckets(entries, months, reference);
    const thisMonth = buckets[buckets.length - 1];
    const lastMonth = buckets.length > 1 ? buckets[buckets.length - 2] : null;

    return res.json({
      range: { start: startKey, end: endKey, months },
      months: buckets,
      thisMonth,
      lastMonth,
      monthOverMonth: lastMonth ? compareSummaries(thisMonth, lastMonth) : null,
      trend: trendDirection(buckets),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// US-24 - Analyze mood patterns
exports.getMoodPatterns = async (req, res) => {
  try {
    const range = resolveRange(req.query, 90);
    if (range.error) return res.status(400).json({ message: range.error });

    const entries = await fetchEntries(req.user._id, range);
    const analysis = analysePatterns(entries);

    return res.json({
      range: { start: range.startKey, end: range.endKey, days: daysBetween(range.startKey, range.endKey) + 1 },
      ...analysis,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// US-25 - Compare mood progress
exports.compareMoodProgress = async (req, res) => {
  try {
    const period = req.query.period || 'week';
    if (!COMPARE_PERIODS.includes(period)) {
      return res.status(400).json({ message: `period must be one of: ${COMPARE_PERIODS.join(', ')}` });
    }

    const explicit = ['currentStart', 'currentEnd', 'previousStart', 'previousEnd'];
    const usesExplicit = explicit.some((field) => req.query[field] !== undefined);

    let current;
    let previous;

    if (usesExplicit) {
      const missing = explicit.filter((field) => req.query[field] === undefined);
      if (missing.length) {
        return res.status(400).json({ message: `Missing range fields: ${missing.join(', ')}` });
      }
      const invalid = explicit.filter((field) => !isValidDate(req.query[field]));
      if (invalid.length) {
        return res.status(400).json({ message: `Invalid dates: ${invalid.join(', ')}` });
      }
      if (req.query.currentStart > req.query.currentEnd || req.query.previousStart > req.query.previousEnd) {
        return res.status(400).json({ message: 'Each range must start on or before it ends' });
      }
      current = { startKey: req.query.currentStart, endKey: req.query.currentEnd };
      previous = { startKey: req.query.previousStart, endKey: req.query.previousEnd };
    } else if (period === 'week') {
      const todayResult = resolveToday(req.query);
      if (todayResult.error) return res.status(400).json({ message: todayResult.error });
      const thisWeekStart = startOfWeekKey(new Date(`${todayResult.today}T12:00:00.000Z`));
      current = { startKey: thisWeekStart, endKey: addDaysKey(thisWeekStart, 6) };
      previous = { startKey: addDaysKey(thisWeekStart, -7), endKey: addDaysKey(thisWeekStart, -1) };
    } else {
      const todayResult = resolveToday(req.query);
      if (todayResult.error) return res.status(400).json({ message: todayResult.error });
      const thisMonth = monthKey(new Date(`${todayResult.today}T12:00:00.000Z`));
      const lastMonth = addMonthsKey(thisMonth, -1);
      current = { startKey: `${thisMonth}-01`, endKey: addDaysKey(`${addMonthsKey(thisMonth, 1)}-01`, -1) };
      previous = { startKey: `${lastMonth}-01`, endKey: addDaysKey(`${thisMonth}-01`, -1) };
    }

    const [currentEntries, previousEntries] = await Promise.all([
      fetchEntries(req.user._id, current),
      fetchEntries(req.user._id, previous),
    ]);

    const currentSummary = summarize(currentEntries);
    const previousSummary = summarize(previousEntries);

    return res.json({
      period: usesExplicit ? 'custom' : period,
      current: {
        range: { start: current.startKey, end: current.endKey },
        label: period === 'month' && !usesExplicit ? monthLabel(current.startKey.slice(0, 7)) : `${current.startKey} to ${current.endKey}`,
        ...currentSummary,
      },
      previous: {
        range: { start: previous.startKey, end: previous.endKey },
        label: `${previous.startKey} to ${previous.endKey}`,
        ...previousSummary,
      },
      comparison: compareSummaries(currentSummary, previousSummary),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.resolveRange = resolveRange;
exports.boundedInt = boundedInt;
