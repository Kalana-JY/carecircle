const Notification = require('../models/Notification');
const WellnessActivity = require('../models/WellnessActivity');
const {
  fetchEntries,
  summarize,
  weeklyBuckets,
  trendDirection,
  analysePatterns,
  dateKey,
  addDaysKey,
} = require('./moodInsights');
const {
  DAILY_TIPS,
  MOTIVATIONAL_MESSAGES,
  ACTIVITY_CATALOG,
  DEFAULT_RECOMMENDATION_DAYS,
  MAX_RECOMMENDATIONS,
  MAX_RECOMMENDED_ACTIVITIES,
} = require('../constants/wellbeing');

const LOW_SCORE = 2.5;
const POSITIVE_SCORE = 4;
const STALE_LOG_DAYS = 3;

const stableIndex = (seed, length) => {
  let hash = 0;
  const text = String(seed);
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return length === 0 ? 0 : hash % length;
};

const titleCase = (value) =>
  String(value)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const toneFor = ({ summary, trend }) => {
  if (!summary.entryCount) return 'starting';
  if (summary.averageScore <= LOW_SCORE) return 'low';
  if (trend.direction === 'declining') return 'declining';
  if (trend.direction === 'improving') return 'improving';
  if (summary.averageScore >= POSITIVE_SCORE) return 'positive';
  return 'steady';
};

const contextFor = (profile) => {
  if (profile.tone === 'starting') {
    return 'There is not enough mood history yet, so these suggestions are a starting point.';
  }

  const mood = profile.summary.dominantMood ? ` Your most common mood was "${profile.summary.dominantMood.mood}".` : '';
  const trendText = {
    improving: ' Your mood is trending upward.',
    declining: ' Your mood is trending downward.',
    stable: ' Your mood has been fairly steady.',
    insufficient_data: '',
  }[profile.trend.direction] || '';

  return `Over the last ${profile.window.days} days you logged ${profile.summary.entryCount} mood entries with an average score of ${profile.summary.averageScore}.${mood}${trendText}`;
};

const buildProfile = async (userId, { days = DEFAULT_RECOMMENDATION_DAYS, now = new Date() } = {}) => {
  const end = dateKey(now);
  const start = addDaysKey(end, -(days - 1));
  const entries = await fetchEntries(userId, { startKey: start, endKey: end });
  const summary = summarize(entries);
  const weeks = Math.max(2, Math.ceil(days / 7));
  const trend = trendDirection(weeklyBuckets(entries, weeks, now));
  const patterns = analysePatterns(entries);
  const activities = await WellnessActivity.find({ userId, deletedAt: null }).select('title category');

  const lastEntry = entries.length ? entries[entries.length - 1] : null;
  const daysSinceLastLog = lastEntry
    ? Math.round((new Date(`${end}T00:00:00.000Z`) - new Date(`${lastEntry.dateKey}T00:00:00.000Z`)) / 86400000)
    : null;

  const profile = {
    userId,
    window: { start, end, days },
    summary: {
      entryCount: summary.entryCount,
      averageScore: summary.averageScore,
      dominantMood: summary.dominantMood?.mood || null,
      volatility: summary.volatility,
      positiveRate: summary.positiveRate,
      negativeRate: summary.negativeRate,
    },
    trend,
    lifting: patterns.activities.lifting,
    draining: patterns.activities.draining,
    byDayOfWeek: patterns.byDayOfWeek,
    practiced: activities.map((activity) => ({
      title: activity.title,
      category: activity.category,
    })),
    daysSinceLastLog,
    now,
  };
  profile.tone = toneFor(profile);
  profile.context = contextFor(profile);
  return profile;
};

const recommendation = (id, priority, category, title, body, reason) => ({
  id,
  priority,
  category,
  title,
  body,
  reason,
});

const buildRecommendations = (profile) => {
  const items = [];

  if (profile.tone === 'starting') {
    items.push(
      recommendation(
        'start-logging',
        'high',
        'reflection',
        'Log a few moods',
        'Record how you feel for several days. Recommendations become personal once there is a history to learn from.',
        'No mood entries were found in this window.'
      )
    );
  }

  if (profile.lifting[0]) {
    const activity = profile.lifting[0];
    items.push(
      recommendation(
        'keep-lifting-activity',
        'high',
        'activity',
        `Keep time for ${activity.value}`,
        `"${activity.value}" shows up on your better days. Protect a little time for it this week.`,
        `Moods logged with "${activity.value}" averaged ${activity.averageScore}, ${activity.impact} above your usual score.`
      )
    );
  }

  if (profile.tone === 'low' || profile.tone === 'declining') {
    items.push(
      recommendation(
        'gentle-support',
        'high',
        'support',
        'Choose one gentle support',
        'Pick a short walk, a breathing break, or a message to someone you trust. One small action is enough on a harder day.',
        profile.tone === 'low'
          ? `Your average mood score is ${profile.summary.averageScore}, which is in a low range.`
          : `Your mood trend is declining by ${Math.abs(profile.trend.change)}.`
      )
    );
  }

  if (profile.draining[0]) {
    const activity = profile.draining[0];
    items.push(
      recommendation(
        'ease-draining-activity',
        'medium',
        'activity',
        `Ease up on ${activity.value}`,
        `"${activity.value}" has lined up with lower moods. Shorten it, or pair it with something that usually helps.`,
        `Moods logged with "${activity.value}" averaged ${activity.averageScore}, ${Math.abs(activity.impact)} below your usual score.`
      )
    );
  }

  const loggedDays = profile.byDayOfWeek.filter((day) => day.entryCount > 0);
  if (loggedDays.length >= 2) {
    const sorted = [...loggedDays].sort((a, b) => a.averageScore - b.averageScore);
    const hardest = sorted[0];
    const easiest = sorted[sorted.length - 1];
    if (easiest.averageScore - hardest.averageScore >= 0.5) {
      items.push(
        recommendation(
          'plan-hard-day',
          'medium',
          'habit',
          `Plan extra care for ${hardest.dayOfWeek}`,
          `${hardest.dayOfWeek} is usually your hardest day. Put a short supportive activity on the calendar before it arrives.`,
          `${hardest.dayOfWeek} averages ${hardest.averageScore}, while ${easiest.dayOfWeek} averages ${easiest.averageScore}.`
        )
      );
    }
  }

  if (profile.summary.volatility >= 1) {
    items.push(
      recommendation(
        'steady-routine',
        'medium',
        'habit',
        'Anchor the day with one routine',
        'A steady sleep time, meal, or short walk can soften day-to-day mood swings.',
        `Your mood volatility is ${profile.summary.volatility}, which means scores have been moving around.`
      )
    );
  }

  if (profile.daysSinceLastLog !== null && profile.daysSinceLastLog >= STALE_LOG_DAYS) {
    items.push(
      recommendation(
        'log-again',
        'medium',
        'reflection',
        'Record today\'s mood',
        'A current entry keeps your recommendations tied to how you actually feel, not only to older history.',
        `Your latest mood entry in this window is ${profile.daysSinceLastLog} days old.`
      )
    );
  }

  if (profile.tone === 'improving' || profile.tone === 'positive') {
    items.push(
      recommendation(
        'protect-progress',
        'low',
        'habit',
        'Protect what is working',
        'Your recent history is in a better place. Keep the people, rest, and activities that have been part of it.',
        profile.context
      )
    );
  }

  if (profile.tone === 'steady') {
    items.push(
      recommendation(
        'add-one-habit',
        'low',
        'habit',
        'Add one small habit',
        'Your mood is steady. Try one new wellbeing activity rather than changing everything at once.',
        profile.context
      )
    );
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => rank[a.priority] - rank[b.priority]).slice(0, MAX_RECOMMENDATIONS);
};

const tipFor = (userId, day) => DAILY_TIPS[stableIndex(`${userId}:tip:${day}`, DAILY_TIPS.length)];

const messageFor = (profile, day) => {
  const pool = MOTIVATIONAL_MESSAGES[profile.tone];
  return pool[stableIndex(`${profile.userId}:motivation:${day}`, pool.length)];
};

const matchesCatalog = (activity, profile) => {
  const mood = profile.summary.dominantMood;
  return activity.fits.includes(profile.tone) || (mood && activity.moods.includes(mood));
};

const alreadyPracticing = (activity, profile) => {
  const haystack = profile.practiced.map((item) => `${item.title} ${item.category}`.toLowerCase());
  return haystack.some((value) => value.includes(activity.key.replace(/-/g, ' ')) || value.includes(activity.title.toLowerCase()) || value.includes(activity.category.toLowerCase()));
};

const buildActivities = (profile) => {
  const fromHistory = profile.lifting.slice(0, 2).map((activity) => ({
    key: `history-${activity.value}`,
    title: titleCase(activity.value),
    category: 'From your history',
    durationMinutes: null,
    description: `You already associate "${activity.value}" with better moods.`,
    reason: `It averaged ${activity.averageScore}, ${activity.impact} above your usual score.`,
    source: 'mood_history',
    alreadyPracticing: true,
  }));

  const catalog = ACTIVITY_CATALOG.filter((activity) => matchesCatalog(activity, profile))
    .map((activity) => ({
      key: activity.key,
      title: activity.title,
      category: activity.category,
      durationMinutes: activity.durationMinutes,
      description: activity.description,
      reason: profile.summary.dominantMood
        ? `This fits a ${profile.tone} stretch and moods like "${profile.summary.dominantMood}".`
        : `This is a manageable starting activity while you build a mood history.`,
      source: 'catalog',
      alreadyPracticing: alreadyPracticing(activity, profile),
    }))
    .sort((a, b) => Number(a.alreadyPracticing) - Number(b.alreadyPracticing));

  const seen = new Set();
  return [...fromHistory, ...catalog].filter((activity) => {
    if (seen.has(activity.key)) return false;
    seen.add(activity.key);
    return true;
  }).slice(0, MAX_RECOMMENDED_ACTIVITIES);
};

const deliverNotification = async ({ userId, type, title, body, dedupeKey, metadata }) => {
  try {
    return await Notification.create({ userId, type, title, body, dedupeKey, metadata });
  } catch (error) {
    if (error.code === 11000) return Notification.findOne({ userId, dedupeKey });
    throw error;
  }
};

const deliverDailyWellbeing = async (userId, now = new Date()) => {
  const profile = await buildProfile(userId, { now });
  const day = profile.window.end;
  const tip = tipFor(userId, day);
  const message = messageFor(profile, day);

  const [tipNotification, motivationNotification] = await Promise.all([
    deliverNotification({
      userId,
      type: 'daily_wellbeing_tip',
      title: tip.title,
      body: tip.body,
      dedupeKey: `daily_wellbeing_tip:${userId}:${day}`,
      metadata: { date: day, tipId: tip.id, category: tip.category },
    }),
    deliverNotification({
      userId,
      type: 'motivational_message',
      title: message.title,
      body: message.body,
      dedupeKey: `motivational_message:${userId}:${day}`,
      metadata: { date: day, messageId: message.id, tone: profile.tone },
    }),
  ]);

  return { profile, day, tip, message, tipNotification, motivationNotification };
};

const publicProfile = (profile) => ({
  window: profile.window,
  tone: profile.tone,
  context: profile.context,
  summary: profile.summary,
  trend: profile.trend,
});

module.exports = {
  stableIndex,
  buildProfile,
  buildRecommendations,
  tipFor,
  messageFor,
  buildActivities,
  deliverDailyWellbeing,
  publicProfile,
};
