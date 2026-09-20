// Mood labels are free text, so trends are driven by a 1-5 positivity scale.
// Unknown labels fall back to the entry intensity, then to neutral.
const MOOD_SCALE = {
  ecstatic: 5,
  excited: 5,
  great: 5,
  grateful: 5,
  happy: 5,
  joyful: 5,
  calm: 4,
  content: 4,
  good: 4,
  hopeful: 4,
  motivated: 4,
  relaxed: 4,
  bored: 3,
  indifferent: 3,
  meh: 3,
  neutral: 3,
  okay: 3,
  angry: 2,
  anxious: 2,
  frustrated: 2,
  irritated: 2,
  lonely: 2,
  sad: 2,
  stressed: 2,
  tired: 2,
  worried: 2,
  awful: 1,
  depressed: 1,
  despair: 1,
  hopeless: 1,
  overwhelmed: 1,
  terrible: 1,
};

const MOOD_SCORE_MIN = 1;
const MOOD_SCORE_MAX = 5;
const MOOD_SCORE_NEUTRAL = 3;

// A day counts as positive at 4+ and negative at 2-, leaving 3 as neutral.
const POSITIVE_SCORE_THRESHOLD = 4;
const NEGATIVE_SCORE_THRESHOLD = 2;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const COMPARE_PERIODS = ['week', 'month'];
const EXPORT_FORMATS = ['csv', 'pdf'];

const DEFAULT_TREND_WEEKS = 4;
const MAX_TREND_WEEKS = 26;
const DEFAULT_TREND_MONTHS = 6;
const MAX_TREND_MONTHS = 24;

// Correlations need a few data points before they are worth surfacing.
const MIN_CORRELATION_ENTRIES = 2;
const MAX_CORRELATION_ITEMS = 5;

const DEFAULT_REPORT_DAYS = 30;
const DEFAULT_SHARE_EXPIRY_DAYS = 7;
const MAX_SHARE_EXPIRY_DAYS = 90;

module.exports = {
  MOOD_SCALE,
  MOOD_SCORE_MIN,
  MOOD_SCORE_MAX,
  MOOD_SCORE_NEUTRAL,
  POSITIVE_SCORE_THRESHOLD,
  NEGATIVE_SCORE_THRESHOLD,
  DAY_NAMES,
  MONTH_NAMES,
  COMPARE_PERIODS,
  EXPORT_FORMATS,
  DEFAULT_TREND_WEEKS,
  MAX_TREND_WEEKS,
  DEFAULT_TREND_MONTHS,
  MAX_TREND_MONTHS,
  MIN_CORRELATION_ENTRIES,
  MAX_CORRELATION_ITEMS,
  DEFAULT_REPORT_DAYS,
  DEFAULT_SHARE_EXPIRY_DAYS,
  MAX_SHARE_EXPIRY_DAYS,
};
