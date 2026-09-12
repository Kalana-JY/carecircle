const GOAL_CATEGORIES = [
  'health',
  'fitness',
  'mental-health',
  'career',
  'education',
  'personal',
  'financial',
  'other',
];

const GOAL_STATUSES = ['active', 'in_progress', 'completed', 'overdue', 'paused'];
const USER_GOAL_STATUSES = ['in_progress', 'completed', 'paused'];
const LIST_FILTER_STATUSES = ['active', 'completed', 'overdue', 'in_progress', 'paused'];
const GOAL_PRIORITIES = ['low', 'medium', 'high'];

const STATUS_QUERY_MAP = {
  active: ['active', 'in_progress'],
  in_progress: ['in_progress'],
  completed: ['completed'],
  overdue: ['overdue'],
  paused: ['paused'],
};

const TRACKING_TYPES = ['manual', 'steps'];
const REMINDER_FREQUENCIES = ['once', 'daily', 'weekly'];
const REMINDER_STATUSES = ['active', 'cancelled'];
const STEP_PERMISSIONS = ['undetermined', 'granted', 'denied'];
const NOTIFICATION_TYPES = ['deadline_approaching', 'deadline_missed', 'goal_reminder'];
const DEADLINE_ALERT_DAYS = 3;
const DEFAULT_DAILY_STEP_TARGET = 8000;

const ACHIEVEMENT_CATALOG = [
  {
    key: 'first_goal_created',
    title: 'Goal Setter',
    description: 'Create your first goal',
  },
  {
    key: 'first_goal_completed',
    title: 'Finisher',
    description: 'Complete your first goal',
  },
  {
    key: 'goals_completed_5',
    title: 'On a Roll',
    description: 'Complete 5 goals',
  },
  {
    key: 'streak_3',
    title: '3-Day Streak',
    description: 'Log progress 3 days in a row',
  },
  {
    key: 'streak_7',
    title: 'Week Warrior',
    description: 'Log progress 7 days in a row',
  },
  {
    key: 'first_step_goal',
    title: 'Step Starter',
    description: 'Create a step-based goal',
  },
  {
    key: 'steps_10000',
    title: '10K Club',
    description: 'Reach 10,000 steps in a day',
  },
];

module.exports = {
  GOAL_CATEGORIES,
  GOAL_STATUSES,
  USER_GOAL_STATUSES,
  LIST_FILTER_STATUSES,
  GOAL_PRIORITIES,
  STATUS_QUERY_MAP,
  TRACKING_TYPES,
  REMINDER_FREQUENCIES,
  REMINDER_STATUSES,
  STEP_PERMISSIONS,
  NOTIFICATION_TYPES,
  DEADLINE_ALERT_DAYS,
  DEFAULT_DAILY_STEP_TARGET,
  ACHIEVEMENT_CATALOG,
};
