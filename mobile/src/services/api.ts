import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { tokenStorage } from './storage';

// Set to true if you are testing on a physical phone instead of the emulator
const IS_PHYSICAL_DEVICE = false;

/**
 * Resolves the backend base URL dynamically depending on the current platform and environment.
 * - Web: http://localhost:5000
 * - Android Emulator: http://10.0.2.2:5000
 * - iOS Simulator: http://localhost:5000
 * - Physical Device: Expo hostUri IP address
 */
const getBaseUrl = (): string => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }

  // Prioritize emulator loopback for Android
  if (Platform.OS === 'android' && !IS_PHYSICAL_DEVICE) {
    return 'http://10.0.2.2:5000';
  }

  // Use Metro bundler IP address for physical devices
  const hostUri = Constants.expoConfig?.hostUri;

  if (hostUri) {
    const ip = hostUri.split(':')[0];

    if (ip) {
      return `http://${ip}:5000`;
    }
  }

  return Platform.OS === 'android'
    ? 'http://10.0.2.2:5000'
    : 'http://localhost:5000';
};

export const API_URL = getBaseUrl();

console.log('[API] Base URL configured to:', API_URL);

export const dateOnly = (value?: string | Date | null) => {
  if (!value) return '';

  const text =
    typeof value === 'string'
      ? value
      : value.toISOString();

  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);

  return match ? match[1] : text.slice(0, 10);
};

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

/**
 * Authenticated fetch helper that attaches the stored JWT as a Bearer token
 * and handles JSON serialization + error extraction.
 */
export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const session = await tokenStorage.getItem('user_session');

  let token: string | null = null;

  if (session) {
    try {
      token = JSON.parse(session).token ?? null;
    } catch {
      token = null;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body:
      options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationMessage = Array.isArray(data.errors)
      ? data.errors[0]?.msg
      : undefined;

    throw new Error(
      data.message ||
        validationMessage ||
        `Request failed (${response.status})`
    );
  }

  return data as T;
}

export interface MoodEntry {
  _id: string;
  date: string;
  mood: string;
  intensity?: number;
  notes?: string;
  activities?: string[];
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface JournalEntry {
  _id: string;
  date: string;
  title?: string;
  body: string;
  mood?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GoalRecord {
  _id: string;
  userId?: string;
  title: string;
  description?: string;
  category?: string;
  target?: string;
  targetValue?: number | null;
  targetUnit?: string;
  deadline?: string;
  notes?: string;
  reminder?: boolean;
  reminderTime?: string | null;
  status?:
    | 'active'
    | 'completed'
    | 'paused'
    | 'overdue'
    | 'in_progress';
  progress?: number;
  completionDates?: string[];
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type CollectionResponse<T> = {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
};

export interface MoodPayload {
  date: string;
  mood: string;
  intensity?: number;
  notes?: string;
  activities?: string[];
  tags?: string[];
}

export interface JournalPayload {
  date: string;
  title?: string;
  body: string;
  mood?: string;
  tags?: string[];
}

export interface WellnessActivity {
  _id: string;
  title: string;
  category: string;
  date: string;
  duration: number;
  notes?: string;
  targetPerWeek: number;
  logs: {
    date: string;
    minutes: number;
  }[];
}

export interface WellnessActivityPayload {
  title: string;
  category: string;
  date: string;
  duration: number;
  notes?: string;
  targetPerWeek: number;
}

export const moodApi = {
  list: (page = 1, limit = 20) =>
    apiFetch<CollectionResponse<MoodEntry>>(
      `/api/moods?page=${page}&limit=${limit}`
    ),

  create: (entry: MoodPayload) =>
    apiFetch<MoodEntry>('/api/moods', {
      method: 'POST',
      body: entry,
    }),

  update: (
    id: string,
    entry: Partial<MoodPayload>
  ) =>
    apiFetch<MoodEntry>(`/api/moods/${id}`, {
      method: 'PATCH',
      body: entry,
    }),

  remove: async (id: string) => {
    await apiFetch<void>(`/api/moods/${id}`, {
      method: 'DELETE',
    });
  },
};

export const journalApi = {
  list: (page = 1, limit = 20) =>
    apiFetch<CollectionResponse<JournalEntry>>(
      `/api/journals?page=${page}&limit=${limit}`
    ),

  create: (entry: JournalPayload) =>
    apiFetch<JournalEntry>('/api/journals', {
      method: 'POST',
      body: entry,
    }),

  update: (
    id: string,
    entry: Partial<JournalPayload>
  ) =>
    apiFetch<JournalEntry>(`/api/journals/${id}`, {
      method: 'PATCH',
      body: entry,
    }),

  remove: async (id: string) => {
    await apiFetch<void>(`/api/journals/${id}`, {
      method: 'DELETE',
    });
  },
};

export const wellnessActivityApi = {
  list: () =>
    apiFetch<{
      items: WellnessActivity[];
      meta: { total: number };
    }>('/api/wellness-activities'),

  create: (activity: WellnessActivityPayload) =>
    apiFetch<WellnessActivity>(
      '/api/wellness-activities',
      {
        method: 'POST',
        body: activity,
      }
    ),

  update: (
    id: string,
    activity: Partial<WellnessActivityPayload>
  ) =>
    apiFetch<WellnessActivity>(
      `/api/wellness-activities/${id}`,
      {
        method: 'PATCH',
        body: activity,
      }
    ),

  remove: (id: string) =>
    apiFetch<void>(
      `/api/wellness-activities/${id}`,
      {
        method: 'DELETE',
      }
    ),

  log: (
    id: string,
    date: string,
    minutes = 0
  ) =>
    apiFetch<WellnessActivity>(
      `/api/wellness-activities/${id}/logs`,
      {
        method: 'POST',
        body: {
          date,
          minutes,
        },
      }
    ),
};

const getAuthHeaders = async (): Promise<
  Record<string, string>
> => {
  const session =
    await tokenStorage.getItem('user_session');

  let token: string | null = null;

  if (session) {
    try {
      token = JSON.parse(session).token ?? null;
    } catch {
      token = null;
    }
  }

  return {
    'Content-Type': 'application/json',
    ...(token
      ? { Authorization: `Bearer ${token}` }
      : {}),
  };
};

export async function apiFetchText(
  path: string
): Promise<string> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: await getAuthHeaders(),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error('Request failed');
  }

  return text;
}

/** Downloads a binary response (such as a generated PDF) with the session token attached. */
export async function apiFetchBytes(
  path: string
): Promise<Uint8Array> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(
      `Download failed (${response.status})`
    );
  }

  const buffer = await response.arrayBuffer();

  return new Uint8Array(buffer);
}

export type GoalStatus =
  | 'active'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'paused';

export interface GoalItem {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  target?: string;
  targetValue?: number | null;
  targetUnit?: string;
  trackingType?: 'manual' | 'steps';
  progress?: number;
  recordedProgress?: number;
  status?: GoalStatus;
  deadline?: string;
  notes?: string;
  progressEntries?: {
    value: number;
    note?: string;
    recordedAt?: string;
  }[];
}

export interface GoalPayload {
  title: string;
  category: string;
  target: string;
  deadline: string;
  targetValue?: number;
  targetUnit?: string;
  trackingType?: 'manual' | 'steps';
  notes?: string;
  description?: string;
}

export interface GoalReminder {
  _id: string;
  remindAt: string;
  frequency: 'once' | 'daily' | 'weekly';
  message?: string;
  status: 'active' | 'cancelled';
}

export interface GoalHistoryRow {
  _id: string;
  date: string;
  goalId: string;
  goalTitle?: string;
  category?: string;
  status?: string;
  progress?: number;
  recordedProgress?: number;
  steps?: number | null;
  source?: string;
}

export interface GoalDashboard {
  activeGoals: {
    count: number;
    items: GoalItem[];
  };

  streaks: {
    current: number;
    longest: number;
  };

  completionRate: number;

  totals: {
    total: number;
    completed: number;
  };

  todaySteps: {
    date: string;
    steps: number;
    lastRecordedAt?: string | null;
    dailyTarget: number;
  };

  upcomingDeadlines: {
    _id: string;
    title: string;
    deadline: string;
    status: string;
  }[];

  unreadNotifications: number;

  recentAchievements: AchievementItem[];
}

export interface AchievementItem {
  _id?: string;
  key: string;
  title: string;
  description: string;
  unlockedAt?: string | null;
  unlocked?: boolean;
}

export interface WeeklySummary {
  start: string;
  end: string;
  snapshotCount: number;
  goalsTracked: number;
  goalsCompleted: number;
  averageProgress: number;
}

export interface WeeklyReport {
  weekOverWeek: {
    thisWeek: WeeklySummary;
    lastWeek: WeeklySummary;
    progressDelta: number;
    completedDelta: number;
  };

  fourWeekTrend: WeeklySummary[];
}

type Success<T> = {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
};

export const goalApi = {
  list: (status?: string) =>
    apiFetch<Success<GoalItem[]>>(
      `/api/goals${
        status
          ? `?status=${encodeURIComponent(status)}`
          : ''
      }`
    ),

  get: (id: string) =>
    apiFetch<Success<GoalItem>>(
      `/api/goals/${id}`
    ),

  create: (payload: GoalPayload) =>
    apiFetch<Success<GoalItem>>(
      '/api/goals',
      {
        method: 'POST',
        body: payload,
      }
    ),

  update: (
    id: string,
    payload: Partial<GoalPayload>
  ) =>
    apiFetch<Success<GoalItem>>(
      `/api/goals/${id}`,
      {
        method: 'PUT',
        body: payload,
      }
    ),

  remove: (id: string) =>
    apiFetch<Success<unknown>>(
      `/api/goals/${id}`,
      {
        method: 'DELETE',
      }
    ),

  logProgress: (
    id: string,
    value: number,
    note?: string
  ) =>
    apiFetch<Success<GoalItem>>(
      `/api/goals/${id}/progress/entries`,
      {
        method: 'POST',
        body: {
          value,
          note,
        },
      }
    ),

  updateStatus: (
    id: string,
    status:
      | 'in_progress'
      | 'completed'
      | 'paused'
  ) =>
    apiFetch<Success<GoalItem>>(
      `/api/goals/${id}/status`,
      {
        method: 'PATCH',
        body: {
          status,
        },
      }
    ),

  dashboard: () =>
    apiFetch<Success<GoalDashboard>>(
      '/api/goals/dashboard'
    ),

  history: (id: string) =>
    apiFetch<Success<GoalHistoryRow[]>>(
      `/api/goals/${id}/history`
    ),

  allHistory: () =>
    apiFetch<Success<GoalHistoryRow[]>>(
      '/api/goals/history'
    ),

  weekly: () =>
    apiFetch<Success<WeeklyReport>>(
      '/api/goals/reports/weekly'
    ),

  exportCsv: () =>
    apiFetchText(
      '/api/goals/reports/export'
    ),

  getReminder: (id: string) =>
    apiFetch<Success<GoalReminder>>(
      `/api/goals/${id}/reminder`
    ),

  createReminder: (
    id: string,
    body: {
      remindAt: string;
      frequency?: string;
      message?: string;
    }
  ) =>
    apiFetch<Success<GoalReminder>>(
      `/api/goals/${id}/reminder`,
      {
        method: 'POST',
        body,
      }
    ),

  updateReminder: (
    id: string,
    body: {
      remindAt?: string;
      frequency?: string;
      message?: string;
    }
  ) =>
    apiFetch<Success<GoalReminder>>(
      `/api/goals/${id}/reminder`,
      {
        method: 'PUT',
        body,
      }
    ),

  cancelReminder: (id: string) =>
    apiFetch<Success<GoalReminder>>(
      `/api/goals/${id}/reminder`,
      {
        method: 'DELETE',
      }
    ),
};

export const stepApi = {
  permission: () =>
    apiFetch<
      Success<{
        permission: string;
        requestedAt?: string | null;
      }>
    >('/api/steps/permission'),

  setPermission: (
    permission: 'granted' | 'denied'
  ) =>
    apiFetch<
      Success<{
        permission: string;
      }>
    >('/api/steps/permission', {
      method: 'POST',
      body: {
        permission,
      },
    }),

  today: () =>
    apiFetch<
      Success<{
        date: string;
        steps: number;
        lastRecordedAt?: string | null;
        dailyTarget: number;
        permission: string;
        live: boolean;
      }>
    >('/api/steps/today'),

  sync: (
    steps: number,
    source: 'sensor' | 'manual' = 'sensor'
  ) =>
    apiFetch<
      Success<{
        date: string;
        steps: number;
        updatedGoals: {
          _id: string;
          progress: number;
          status: string;
        }[];
      }>
    >('/api/steps', {
      method: 'POST',
      body: {
        steps,
        source,
      },
    }),
};

export const achievementApi = {
  list: () =>
    apiFetch<
      Success<{
        unlocked: AchievementItem[];
        catalog: AchievementItem[];
      }>
    >('/api/achievements'),
};

/* ── Mood history, trends, and wellbeing insights ─────────────────── */

/** Mood entries carry a 1-5 positivity score derived from the mood label. */
export interface ScoredMoodEntry extends MoodEntry {
  dateKey: string;
  score: number;
  valence: 'positive' | 'neutral' | 'negative';
}

export interface MoodSummary {
  entryCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  volatility: number;
  dominantMood: { mood: string; count: number } | null;
  distribution: Record<string, number>;
  valence: {
    positive: number;
    neutral: number;
    negative: number;
  };
  positiveRate: number;
  negativeRate: number;
}

export interface MoodDayPoint {
  date: string;
  dayOfWeek: string;
  entryCount: number;
  averageScore: number;
  dominantMood: string | null;
}

export interface MoodComparison {
  scoreDelta: number;
  entryDelta: number;
  positiveRateDelta: number;
  verdict:
    | 'improved'
    | 'declined'
    | 'stable'
    | 'insufficient_data';
  message: string;
}

export interface MoodTrendDirection {
  direction:
    | 'improving'
    | 'declining'
    | 'stable'
    | 'insufficient_data';
  change: number;
}

export interface MoodHistoryResponse {
  range: { start: string; end: string; days: number };
  summary: MoodSummary;
  timeline: MoodDayPoint[];
  items: ScoredMoodEntry[];
  meta: { page: number; limit: number; total: number };
}

export interface MoodWeekBucket extends MoodSummary {
  weekStart: string;
  weekEnd: string;
  label: string;
  isCurrentWeek: boolean;
  days: MoodDayPoint[];
}

export interface MoodMonthBucket extends MoodSummary {
  month: string;
  label: string;
  isCurrentMonth: boolean;
  daysLogged: number;
  bestDay: { date: string; averageScore: number } | null;
  hardestDay: {
    date: string;
    averageScore: number;
  } | null;
}

export interface MoodWeeklyTrends {
  range: { start: string; end: string; weeks: number };
  weeks: MoodWeekBucket[];
  thisWeek: MoodWeekBucket;
  lastWeek: MoodWeekBucket | null;
  weekOverWeek: MoodComparison | null;
  trend: MoodTrendDirection;
}

export interface MoodMonthlyTrends {
  range: { start: string; end: string; months: number };
  months: MoodMonthBucket[];
  thisMonth: MoodMonthBucket;
  lastMonth: MoodMonthBucket | null;
  monthOverMonth: MoodComparison | null;
  trend: MoodTrendDirection;
}

/** How much an activity or tag shifts the average mood score. */
export interface MoodCorrelation {
  value: string;
  entryCount: number;
  averageScore: number;
  impact: number;
}

export interface MoodStreak {
  length: number;
  start: string | null;
  end: string | null;
}

export interface MoodPatterns {
  range: { start: string; end: string; days: number };
  summary: MoodSummary;
  byDayOfWeek: {
    dayOfWeek: string;
    dayIndex: number;
    entryCount: number;
    averageScore: number;
  }[];
  activities: {
    lifting: MoodCorrelation[];
    draining: MoodCorrelation[];
  };
  tags: {
    lifting: MoodCorrelation[];
    draining: MoodCorrelation[];
  };
  streaks: {
    longestPositive: MoodStreak;
    longestNegative: MoodStreak;
  };
  insights: string[];
}

export interface MoodProgressComparison {
  period: 'week' | 'month' | 'custom';
  current: MoodSummary & {
    range: { start: string; end: string };
    label: string;
  };
  previous: MoodSummary & {
    range: { start: string; end: string };
    label: string;
  };
  comparison: MoodComparison;
}

const rangeQuery = (range?: {
  start?: string;
  end?: string;
}) => {
  const params = new URLSearchParams();

  if (range?.start) params.set('start', range.start);
  if (range?.end) params.set('end', range.end);

  const query = params.toString();

  return query ? `?${query}` : '';
};

export const moodInsightsApi = {
  history: (options?: {
    start?: string;
    end?: string;
    page?: number;
    limit?: number;
    mood?: string;
  }) => {
    const params = new URLSearchParams();

    if (options?.start) params.set('start', options.start);
    if (options?.end) params.set('end', options.end);
    if (options?.page)
      params.set('page', String(options.page));
    if (options?.limit)
      params.set('limit', String(options.limit));
    if (options?.mood) params.set('mood', options.mood);

    const query = params.toString();

    return apiFetch<MoodHistoryResponse>(
      `/api/moods/history${query ? `?${query}` : ''}`
    );
  },

  weekly: (weeks = 4) =>
    apiFetch<MoodWeeklyTrends>(
      `/api/moods/trends/weekly?weeks=${weeks}`
    ),

  monthly: (months = 6) =>
    apiFetch<MoodMonthlyTrends>(
      `/api/moods/trends/monthly?months=${months}`
    ),

  patterns: (range?: {
    start?: string;
    end?: string;
  }) =>
    apiFetch<MoodPatterns>(
      `/api/moods/patterns${rangeQuery(range)}`
    ),

  compare: (period: 'week' | 'month' = 'week') =>
    apiFetch<MoodProgressComparison>(
      `/api/moods/compare?period=${period}`
    ),
};

/* ── Mood report generation, export, and sharing ──────────────────── */

export interface MoodReport {
  generatedAt: string;
  owner: { name: string | null; email: string | null };
  range: { start: string; end: string; days: number };
  summary: MoodSummary;
  trend: MoodTrendDirection;
  weeks: MoodWeekBucket[];
  months: MoodMonthBucket[];
  byDayOfWeek: {
    dayOfWeek: string;
    dayIndex: number;
    entryCount: number;
    averageScore: number;
  }[];
  topActivities: MoodCorrelation[];
  drainingActivities: MoodCorrelation[];
  topTags: MoodCorrelation[];
  streaks: {
    longestPositive: MoodStreak;
    longestNegative: MoodStreak;
  };
  insights: string[];
  entryCount: number;
  entries?: ScoredMoodEntry[];
}

export interface MoodReportShare {
  _id: string;
  token: string;
  shareUrl: string;
  exportUrl: string;
  range: { start: string; end: string };
  recipientNote: string | null;
  includeNotes: boolean;
  expiresAt: string;
  revokedAt: string | null;
  active: boolean;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
}

const exportQuery = (
  format: 'csv' | 'pdf',
  range?: { start?: string; end?: string }
) => {
  const params = new URLSearchParams({ format });

  if (range?.start) params.set('start', range.start);
  if (range?.end) params.set('end', range.end);

  return `?${params.toString()}`;
};

export const moodReportApi = {
  summary: (range?: { start?: string; end?: string }) =>
    apiFetch<MoodReport>(
      `/api/moods/reports/summary${rangeQuery(range)}`
    ),

  exportCsv: (range?: { start?: string; end?: string }) =>
    apiFetchText(
      `/api/moods/reports/export${exportQuery(
        'csv',
        range
      )}`
    ),

  exportPdf: (range?: { start?: string; end?: string }) =>
    apiFetchBytes(
      `/api/moods/reports/export${exportQuery(
        'pdf',
        range
      )}`
    ),

  createShare: (body: {
    start?: string;
    end?: string;
    expiresInDays?: number;
    recipientNote?: string;
    includeNotes?: boolean;
  }) =>
    apiFetch<{ message: string; data: MoodReportShare }>(
      '/api/moods/reports/share',
      {
        method: 'POST',
        body,
      }
    ),

  listShares: () =>
    apiFetch<{
      items: MoodReportShare[];
      meta: { total: number; active: number };
    }>('/api/moods/reports/shares'),

  revokeShare: (id: string) =>
    apiFetch<{ message: string; data: MoodReportShare }>(
      `/api/moods/reports/shares/${id}`,
      {
        method: 'DELETE',
      }
    ),
};

/* ── Wellbeing reminders and notifications ────────────────────────── */

export type ReminderType =
  | 'mood_log'
  | 'wellness_activity'
  | 'custom';

export type ReminderFrequency =
  | 'once'
  | 'daily'
  | 'weekly';

export type ReminderStatus =
  | 'active'
  | 'paused'
  | 'cancelled'
  | 'completed';

export interface WellbeingReminder {
  _id: string;
  type: ReminderType;
  title?: string;
  message?: string;
  timeOfDay: string;
  frequency: ReminderFrequency;
  daysOfWeek: number[];
  startDate: string | null;
  utcOffsetMinutes: number;
  status: ReminderStatus;
  nextSendAt: string | null;
  lastSentAt: string | null;
  occurrenceCount: number;
  resolvedTitle: string;
  resolvedMessage: string;
  createdAt: string;
}

export interface ReminderPayload {
  type?: ReminderType;
  title?: string;
  message?: string;
  timeOfDay: string;
  frequency?: ReminderFrequency;
  daysOfWeek?: number[];
  startDate?: string;
  utcOffsetMinutes?: number;
}

export interface ReminderNotification {
  _id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  readAt: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
}

export const reminderApi = {
  list: (status?: ReminderStatus) =>
    apiFetch<{
      items: WellbeingReminder[];
      meta: { total: number; active: number };
    }>(
      `/api/reminders${
        status ? `?status=${status}` : ''
      }`
    ),

  create: (payload: ReminderPayload) =>
    apiFetch<{
      message: string;
      data: WellbeingReminder;
    }>('/api/reminders', {
      method: 'POST',
      body: payload,
    }),

  update: (
    id: string,
    payload: Partial<ReminderPayload>
  ) =>
    apiFetch<{
      message: string;
      data: WellbeingReminder;
    }>(`/api/reminders/${id}`, {
      method: 'PUT',
      body: payload,
    }),

  setStatus: (id: string, status: 'active' | 'paused') =>
    apiFetch<{
      message: string;
      data: WellbeingReminder;
    }>(`/api/reminders/${id}/status`, {
      method: 'PATCH',
      body: { status },
    }),

  remove: (id: string) =>
    apiFetch<{
      message: string;
      data: WellbeingReminder;
    }>(`/api/reminders/${id}`, {
      method: 'DELETE',
    }),

  notifications: (unreadOnly = false) =>
    apiFetch<{
      items: ReminderNotification[];
      meta: { total: number; unreadCount: number };
    }>(
      `/api/reminders/notifications${
        unreadOnly ? '?unread=true' : ''
      }`
    ),
};