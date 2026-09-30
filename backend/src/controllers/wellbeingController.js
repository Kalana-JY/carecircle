const {
  buildProfile,
  buildRecommendations,
  buildActivities,
  deliverDailyWellbeing,
  publicProfile,
  tipFor,
} = require('../services/wellbeingRecommendations');
const { addDaysKey } = require('../services/moodInsights');
const {
  DEFAULT_RECOMMENDATION_DAYS,
  MIN_RECOMMENDATION_DAYS,
  MAX_RECOMMENDATION_DAYS,
} = require('../constants/wellbeing');

const handleError = (res, error) => {
  console.error(error);
  return res.status(500).json({ message: 'Server error' });
};

const resolveDays = (raw) => {
  if (raw === undefined || raw === '') return DEFAULT_RECOMMENDATION_DAYS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || String(parsed) !== String(raw) || parsed < MIN_RECOMMENDATION_DAYS || parsed > MAX_RECOMMENDATION_DAYS) {
    return null;
  }
  return parsed;
};

// US-34 - View personalized recommendations from mood history.
exports.listRecommendations = async (req, res) => {
  try {
    const days = resolveDays(req.query.days);
    if (days === null) {
      return res.status(400).json({
        message: `days must be a whole number from ${MIN_RECOMMENDATION_DAYS} to ${MAX_RECOMMENDATION_DAYS}`,
      });
    }

    const profile = await buildProfile(req.user._id, { days });
    const items = buildRecommendations(profile);

    return res.json({
      ...publicProfile(profile),
      items,
      meta: { total: items.length },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// US-35 - Receive one stable wellbeing tip for the current day.
exports.getDailyTip = async (req, res) => {
  try {
    const { profile, day, tip, tipNotification } = await deliverDailyWellbeing(req.user._id);
    const historyDays = Number.parseInt(req.query.history, 10);
    const history = Number.isInteger(historyDays) && historyDays > 0
      ? Array.from({ length: Math.min(historyDays, 14) }, (_, offset) => {
        const date = addDaysKey(day, -(offset + 1));
        return { date, ...tipFor(req.user._id, date) };
      })
      : undefined;

    return res.json({
      date: day,
      tip,
      context: profile.context,
      notificationId: tipNotification?._id || null,
      ...(history ? { history } : {}),
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// US-36 - Receive a motivational message matched to the mood journey.
exports.getMotivationalMessage = async (req, res) => {
  try {
    const { profile, day, message, motivationNotification } = await deliverDailyWellbeing(req.user._id);
    return res.json({
      date: day,
      tone: profile.tone,
      context: profile.context,
      message,
      notificationId: motivationNotification?._id || null,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// US-37 - View wellbeing activities chosen for the user's emotional state.
exports.listRecommendedActivities = async (req, res) => {
  try {
    const days = resolveDays(req.query.days);
    if (days === null) {
      return res.status(400).json({
        message: `days must be a whole number from ${MIN_RECOMMENDATION_DAYS} to ${MAX_RECOMMENDATION_DAYS}`,
      });
    }

    const profile = await buildProfile(req.user._id, { days });
    const items = buildActivities(profile);

    return res.json({
      ...publicProfile(profile),
      items,
      meta: { total: items.length },
    });
  } catch (error) {
    return handleError(res, error);
  }
};
