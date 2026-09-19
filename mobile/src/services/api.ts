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