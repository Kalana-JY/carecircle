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

module.exports = {
  GOAL_CATEGORIES,
  GOAL_STATUSES,
  USER_GOAL_STATUSES,
  LIST_FILTER_STATUSES,
  GOAL_PRIORITIES,
  STATUS_QUERY_MAP,
};
