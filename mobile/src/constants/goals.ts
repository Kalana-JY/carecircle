export const GOAL_BRAND = '#3A7CA5';

export const GOAL_CATEGORIES = [
  { value: 'mental-health', label: 'Mindfulness' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'health', label: 'Health' },
  { value: 'personal', label: 'Personal' },
  { value: 'education', label: 'Education' },
  { value: 'career', label: 'Career' },
  { value: 'financial', label: 'Financial' },
  { value: 'other', label: 'Other' },
] as const;

export type GoalHubTab = 'overview' | 'form' | 'achievements' | 'reports';

export const GOAL_TABS: { key: GoalHubTab; label: string }[] = [
  { key: 'overview', label: 'My goals' },
  { key: 'form', label: 'Add goal' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'reports', label: 'Reports' },
];

export const GOAL_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'paused', label: 'Paused' },
] as const;

export function categoryLabel(value?: string) {
  return GOAL_CATEGORIES.find((item) => item.value === value)?.label || value || 'Personal';
}

export function formatSteps(value?: number | null) {
  return Math.round(value || 0).toLocaleString('en-US');
}

export function toDisplayDate(value?: string) {
  if (!value) return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value.slice(0, 10);
  return `${match[2]}/${match[3]}/${match[1]}`;
}

export function fromDisplayDate(value: string) {
  const trimmed = value.trim();
  const mdy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return '';
}

export function tonightAt(hour = 20) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
  return date.toISOString();
}

export function isStepGoal(goal: { trackingType?: string; targetUnit?: string; title?: string; target?: string }) {
  if (goal.trackingType === 'steps') return true;
  const unit = (goal.targetUnit || '').toLowerCase();
  if (unit === 'steps' || unit === 'step') return true;
  return /step/i.test(`${goal.title || ''} ${goal.target || ''}`);
}

export function progressCaption(goal: { recordedProgress?: number; targetValue?: number | null; progress?: number; target?: string }) {
  if (typeof goal.targetValue === 'number' && goal.targetValue > 0) {
    return `${Math.round(goal.recordedProgress || 0)}/${goal.targetValue}`;
  }
  return `${Math.round(goal.progress || 0)}%`;
}

export function achievementIcon(key: string): 'flame' | 'trophy' | 'star' | 'walk' | 'ribbon' {
  if (key.startsWith('streak')) return 'flame';
  if (key.includes('completed') || key.includes('finisher')) return 'trophy';
  if (key.includes('step')) return 'walk';
  if (key.includes('created') || key.includes('setter')) return 'star';
  return 'ribbon';
}
