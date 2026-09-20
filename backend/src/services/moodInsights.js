const Mood = require('../models/Mood');
const {
  MOOD_SCALE,
  MOOD_SCORE_MIN,
  MOOD_SCORE_MAX,
  MOOD_SCORE_NEUTRAL,
  POSITIVE_SCORE_THRESHOLD,
  NEGATIVE_SCORE_THRESHOLD,
  DAY_NAMES,
  MONTH_NAMES,
  MIN_CORRELATION_ENTRIES,
  MAX_CORRELATION_ITEMS,
} = require('../constants/moods');

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const isValidDate = (value) => {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const [, yearText, monthText, dayText] = value.match(DATE_PATTERN);
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const isLeap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
};

const handleError = (res, error) => {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid mood input' });
  }

  console.error(error);
  return res.status(500).json({ message: 'Server error' });
};

const round2 = (value) => Math.round(value * 100) / 100;

const average = (values) => (values.length ? round2(values.reduce((sum, value) => sum + value, 0) / values.length) : 0);

const standardDeviation = (values) => {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return round2(Math.sqrt(variance));
};

const dateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
};

const keyToDate = (key) => new Date(`${key}T00:00:00.000Z`);

const addDaysKey = (key, days) => {
  const date = keyToDate(key);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
};

const addMonthsKey = (monthKeyValue, months) => {
  const [year, month] = monthKeyValue.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return date.toISOString().slice(0, 7);
};

const monthKey = (value) => dateKey(value).slice(0, 7);

const monthLabel = (monthKeyValue) => {
  const [year, month] = monthKeyValue.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
};

// Weeks run Monday to Sunday.
const startOfWeekKey = (value = new Date()) => {
  const date = keyToDate(dateKey(value));
  const day = date.getUTCDay();
  return addDaysKey(dateKey(date), day === 0 ? -6 : 1 - day);
};

const daysBetween = (startKey, endKey) =>
  Math.round((keyToDate(endKey).getTime() - keyToDate(startKey).getTime()) / 86400000);

const enumerateDays = (startKey, endKey) => {
  const keys = [];
  let cursor = startKey;
  while (cursor <= endKey) {
    keys.push(cursor);
    cursor = addDaysKey(cursor, 1);
  }
  return keys;
};

const moodScore = (entry) => {
  const label = String(entry.mood || '').trim().toLowerCase();
  const mapped = MOOD_SCALE[label];
  if (typeof mapped === 'number') return mapped;
  if (typeof entry.intensity === 'number' && Number.isFinite(entry.intensity)) {
    return Math.min(MOOD_SCORE_MAX, Math.max(MOOD_SCORE_MIN, Math.round(entry.intensity / 2)));
  }
  return MOOD_SCORE_NEUTRAL;
};

const scoreValence = (score) => {
  if (score >= POSITIVE_SCORE_THRESHOLD) return 'positive';
  if (score <= NEGATIVE_SCORE_THRESHOLD) return 'negative';
  return 'neutral';
};

const decorate = (entry) => {
  const plain = typeof entry.toObject === 'function' ? entry.toObject() : entry;
  const score = moodScore(plain);
  return {
    ...plain,
    dateKey: dateKey(plain.date),
    score,
    valence: scoreValence(score),
  };
};

const fetchEntries = async (userId, { startKey, endKey } = {}) => {
  const filter = { userId, deletedAt: null };
  if (startKey || endKey) {
    filter.date = {};
    if (startKey) filter.date.$gte = keyToDate(startKey);
    // Dates are stored as timestamps, so the end day must be inclusive.
    if (endKey) filter.date.$lte = new Date(`${endKey}T23:59:59.999Z`);
  }

  const entries = await Mood.find(filter).sort({ date: 1 });
  return entries.map(decorate);
};

const distribution = (entries) => {
  const counts = {};
  entries.forEach((entry) => {
    const label = String(entry.mood || 'unknown').trim().toLowerCase();
    counts[label] = (counts[label] || 0) + 1;
  });
  return counts;
};

const valenceBreakdown = (entries) => {
  const counts = { positive: 0, neutral: 0, negative: 0 };
  entries.forEach((entry) => {
    counts[entry.valence] += 1;
  });
  return counts;
};

const dominantMood = (entries) => {
  const counts = distribution(entries);
  let best = null;
  Object.entries(counts).forEach(([label, count]) => {
    if (!best || count > best.count) best = { mood: label, count };
  });
  return best;
};

const summarize = (entries) => {
  const scores = entries.map((entry) => entry.score);
  const valence = valenceBreakdown(entries);
  const positiveRate = entries.length ? round2((valence.positive / entries.length) * 100) : 0;
  const negativeRate = entries.length ? round2((valence.negative / entries.length) * 100) : 0;

  return {
    entryCount: entries.length,
    averageScore: average(scores),
    highestScore: scores.length ? Math.max(...scores) : 0,
    lowestScore: scores.length ? Math.min(...scores) : 0,
    volatility: standardDeviation(scores),
    dominantMood: dominantMood(entries),
    distribution: distribution(entries),
    valence,
    positiveRate,
    negativeRate,
  };
};

const groupByKey = (entries, keyFn) => {
  const groups = new Map();
  entries.forEach((entry) => {
    const key = keyFn(entry);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });
  return groups;
};

const dailySeries = (entries, startKey, endKey) => {
  const groups = groupByKey(entries, (entry) => entry.dateKey);
  return enumerateDays(startKey, endKey).map((key) => {
    const dayEntries = groups.get(key) || [];
    return {
      date: key,
      dayOfWeek: DAY_NAMES[keyToDate(key).getUTCDay()],
      entryCount: dayEntries.length,
      averageScore: average(dayEntries.map((entry) => entry.score)),
      dominantMood: dominantMood(dayEntries)?.mood || null,
    };
  });
};

const weeklyBuckets = (entries, weeks, reference = new Date()) => {
  const currentWeekStart = startOfWeekKey(reference);
  const buckets = [];

  for (let offset = weeks - 1; offset >= 0; offset -= 1) {
    const weekStart = addDaysKey(currentWeekStart, -offset * 7);
    const weekEnd = addDaysKey(weekStart, 6);
    const weekEntries = entries.filter((entry) => entry.dateKey >= weekStart && entry.dateKey <= weekEnd);
    buckets.push({
      weekStart,
      weekEnd,
      label: `${weekStart} to ${weekEnd}`,
      isCurrentWeek: weekStart === currentWeekStart,
      ...summarize(weekEntries),
      days: dailySeries(weekEntries, weekStart, weekEnd),
    });
  }

  return buckets;
};

const monthlyBuckets = (entries, months, reference = new Date()) => {
  const currentMonth = monthKey(reference);
  const buckets = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const key = addMonthsKey(currentMonth, -offset);
    const monthEntries = entries.filter((entry) => entry.dateKey.slice(0, 7) === key);
    const summary = summarize(monthEntries);
    const byDay = groupByKey(monthEntries, (entry) => entry.dateKey);
    const dayAverages = [...byDay.entries()].map(([day, dayEntries]) => ({
      date: day,
      averageScore: average(dayEntries.map((entry) => entry.score)),
    }));
    const sorted = [...dayAverages].sort((a, b) => b.averageScore - a.averageScore);

    buckets.push({
      month: key,
      label: monthLabel(key),
      isCurrentMonth: key === currentMonth,
      ...summary,
      daysLogged: byDay.size,
      bestDay: sorted[0] || null,
      hardestDay: sorted.length ? sorted[sorted.length - 1] : null,
    });
  }

  return buckets;
};

const trendDirection = (buckets) => {
  const scored = buckets.filter((bucket) => bucket.entryCount > 0);
  if (scored.length < 2) return { direction: 'insufficient_data', change: 0 };

  const change = round2(scored[scored.length - 1].averageScore - scored[0].averageScore);
  if (change >= 0.25) return { direction: 'improving', change };
  if (change <= -0.25) return { direction: 'declining', change };
  return { direction: 'stable', change };
};

const correlate = (entries, field) => {
  const overall = average(entries.map((entry) => entry.score));
  const groups = new Map();

  entries.forEach((entry) => {
    const values = Array.isArray(entry[field]) ? entry[field] : [];
    new Set(values.map((value) => String(value).trim().toLowerCase()).filter(Boolean)).forEach((value) => {
      const record = groups.get(value) || { value, entryCount: 0, total: 0 };
      record.entryCount += 1;
      record.total += entry.score;
      groups.set(value, record);
    });
  });

  return [...groups.values()]
    .filter((record) => record.entryCount >= MIN_CORRELATION_ENTRIES)
    .map((record) => {
      const averageScore = round2(record.total / record.entryCount);
      return {
        value: record.value,
        entryCount: record.entryCount,
        averageScore,
        // How much better or worse than the user's overall average.
        impact: round2(averageScore - overall),
      };
    })
    .sort((a, b) => b.impact - a.impact || b.entryCount - a.entryCount);
};

const dayOfWeekBreakdown = (entries) => {
  const groups = groupByKey(entries, (entry) => keyToDate(entry.dateKey).getUTCDay());
  return DAY_NAMES.map((name, index) => {
    const dayEntries = groups.get(index) || [];
    return {
      dayOfWeek: name,
      dayIndex: index,
      entryCount: dayEntries.length,
      averageScore: average(dayEntries.map((entry) => entry.score)),
    };
  });
};

const longestRun = (entries, predicate) => {
  const byDay = [...groupByKey(entries, (entry) => entry.dateKey).entries()]
    .map(([day, dayEntries]) => ({ day, averageScore: average(dayEntries.map((entry) => entry.score)) }))
    .sort((a, b) => a.day.localeCompare(b.day));

  let best = { length: 0, start: null, end: null };
  let current = { length: 0, start: null, end: null };

  byDay.forEach((item, index) => {
    const isConsecutive = index > 0 && item.day === addDaysKey(byDay[index - 1].day, 1);
    if (predicate(item.averageScore)) {
      current = isConsecutive && current.length > 0
        ? { length: current.length + 1, start: current.start, end: item.day }
        : { length: 1, start: item.day, end: item.day };
      if (current.length > best.length) best = { ...current };
    } else {
      current = { length: 0, start: null, end: null };
    }
  });

  return best;
};

const buildInsights = ({ summary, activities, tags, byDayOfWeek, trend }) => {
  const insights = [];

  if (summary.entryCount === 0) {
    return ['Log a few moods to unlock personalised insights.'];
  }

  insights.push(
    `You logged ${summary.entryCount} mood ${summary.entryCount === 1 ? 'entry' : 'entries'} with an average score of ${summary.averageScore} out of ${MOOD_SCORE_MAX}.`
  );

  if (summary.dominantMood) {
    insights.push(`Your most frequent mood was "${summary.dominantMood.mood}" (${summary.dominantMood.count} times).`);
  }

  const lifted = activities.filter((item) => item.impact > 0);
  if (lifted.length) {
    insights.push(`"${lifted[0].value}" lines up with your best moods, lifting your score by ${lifted[0].impact} on average.`);
  }

  const drained = activities.filter((item) => item.impact < 0);
  if (drained.length) {
    const worst = drained[drained.length - 1];
    insights.push(`"${worst.value}" tends to accompany lower moods, pulling your score down by ${Math.abs(worst.impact)}.`);
  }

  const topTag = tags.find((item) => item.impact < 0);
  if (topTag) {
    insights.push(`Entries tagged "${topTag.value}" average ${topTag.averageScore}, below your overall average.`);
  }

  const loggedDays = byDayOfWeek.filter((day) => day.entryCount > 0);
  if (loggedDays.length >= 2) {
    const sorted = [...loggedDays].sort((a, b) => b.averageScore - a.averageScore);
    insights.push(`${sorted[0].dayOfWeek} is typically your best day, while ${sorted[sorted.length - 1].dayOfWeek} is the hardest.`);
  }

  if (summary.volatility >= 1) {
    insights.push('Your mood swings quite a bit day to day, which can be worth discussing with a professional.');
  } else if (summary.volatility > 0) {
    insights.push('Your mood has been fairly steady across this period.');
  }

  if (trend && trend.direction === 'improving') {
    insights.push(`Overall your mood is trending upward (+${trend.change}).`);
  } else if (trend && trend.direction === 'declining') {
    insights.push(`Overall your mood is trending downward (${trend.change}). Consider reaching out for support.`);
  }

  return insights;
};

const analysePatterns = (entries) => {
  const summary = summarize(entries);
  const activities = correlate(entries, 'activities');
  const tags = correlate(entries, 'tags');
  const byDayOfWeek = dayOfWeekBreakdown(entries);

  return {
    summary,
    byDayOfWeek,
    activities: {
      lifting: activities.filter((item) => item.impact > 0).slice(0, MAX_CORRELATION_ITEMS),
      draining: activities
        .filter((item) => item.impact < 0)
        .slice(-MAX_CORRELATION_ITEMS)
        .reverse(),
    },
    tags: {
      lifting: tags.filter((item) => item.impact > 0).slice(0, MAX_CORRELATION_ITEMS),
      draining: tags
        .filter((item) => item.impact < 0)
        .slice(-MAX_CORRELATION_ITEMS)
        .reverse(),
    },
    streaks: {
      longestPositive: longestRun(entries, (score) => score >= POSITIVE_SCORE_THRESHOLD),
      longestNegative: longestRun(entries, (score) => score <= NEGATIVE_SCORE_THRESHOLD),
    },
    insights: buildInsights({ summary, activities, tags, byDayOfWeek, trend: null }),
  };
};

const compareSummaries = (currentSummary, previousSummary) => {
  const scoreDelta = round2(currentSummary.averageScore - previousSummary.averageScore);
  const entryDelta = currentSummary.entryCount - previousSummary.entryCount;
  const positiveRateDelta = round2(currentSummary.positiveRate - previousSummary.positiveRate);

  let verdict = 'stable';
  if (previousSummary.entryCount === 0 || currentSummary.entryCount === 0) verdict = 'insufficient_data';
  else if (scoreDelta >= 0.25) verdict = 'improved';
  else if (scoreDelta <= -0.25) verdict = 'declined';

  const messages = {
    improved: `Your average mood rose by ${scoreDelta} compared with the previous period.`,
    declined: `Your average mood fell by ${Math.abs(scoreDelta)} compared with the previous period.`,
    stable: 'Your average mood held steady compared with the previous period.',
    insufficient_data: 'Not enough entries in both periods to compare reliably.',
  };

  return {
    scoreDelta,
    entryDelta,
    positiveRateDelta,
    verdict,
    message: messages[verdict],
  };
};

module.exports = {
  isValidDate,
  handleError,
  round2,
  average,
  standardDeviation,
  dateKey,
  keyToDate,
  addDaysKey,
  addMonthsKey,
  monthKey,
  monthLabel,
  startOfWeekKey,
  daysBetween,
  enumerateDays,
  moodScore,
  scoreValence,
  decorate,
  fetchEntries,
  distribution,
  dominantMood,
  summarize,
  dailySeries,
  weeklyBuckets,
  monthlyBuckets,
  trendDirection,
  correlate,
  dayOfWeekBreakdown,
  analysePatterns,
  compareSummaries,
  buildInsights,
};
