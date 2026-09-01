import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { tokenStorage } from './storage';

// Set to true if you are testing on a physical phone instead of the emulator
const IS_PHYSICAL_DEVICE = false;

/**
 * Resolves the backend base URL dynamically depending on the current platform and environment.
 * - Web: http://localhost:5000
 * - Android Emulator: http://10.0.2.2:5000 (direct host loopback, bypasses firewall)
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

  return Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
};

export const API_URL = getBaseUrl();
console.log('[API] Base URL configured to:', API_URL);

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

/**
 * Authenticated fetch helper that attaches the stored JWT as a Bearer token
 * and handles JSON serialization + error extraction.
 */
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<any> {
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
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}
<<<<<<< Updated upstream
=======

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
  status?: 'active' | 'completed' | 'paused' | 'overdue' | 'in_progress';
  progress?: number;
  completionDates?: string[];
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type CollectionResponse<T> = {
  items: T[];
  meta: { page: number; limit: number; total: number };
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

export const moodApi = {
  list: (page = 1) => apiFetch<CollectionResponse<MoodEntry>>(`/api/moods?page=${page}&limit=20`),
  create: (entry: MoodPayload) =>
    apiFetch<MoodEntry>('/api/moods', { method: 'POST', body: entry }),
  update: (id: string, entry: Partial<MoodPayload>) =>
    apiFetch<MoodEntry>(`/api/moods/${id}`, { method: 'PATCH', body: entry }),
  remove: async (id: string) => {
    await apiFetch<void>(`/api/moods/${id}`, { method: 'DELETE' });
  },
};

export const journalApi = {
  list: (page = 1) => apiFetch<CollectionResponse<JournalEntry>>(`/api/journals?page=${page}&limit=20`),
  create: (entry: JournalPayload) =>
    apiFetch<JournalEntry>('/api/journals', { method: 'POST', body: entry }),
  update: (id: string, entry: Partial<JournalPayload>) =>
    apiFetch<JournalEntry>(`/api/journals/${id}`, { method: 'PATCH', body: entry }),
  remove: async (id: string) => {
    await apiFetch<void>(`/api/journals/${id}`, { method: 'DELETE' });
  },
};

export const goalApi = {
  list: () => apiFetch<{ success: boolean; count: number; data: GoalRecord[] }>('/api/goals'),
  getById: (id: string) => apiFetch<{ success: boolean; data: GoalRecord }>(`/api/goals/${id}`),
  create: (goal: Partial<GoalRecord>) =>
    apiFetch<{ success: boolean; data: GoalRecord; message: string }>('/api/goals', { method: 'POST', body: goal }),
  update: (id: string, goal: Partial<GoalRecord>) =>
    apiFetch<{ success: boolean; data: GoalRecord; message: string }>(`/api/goals/${id}`, { method: 'PUT', body: goal }),
  remove: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/api/goals/${id}`, { method: 'DELETE' }),
  markTodayDone: (id: string) =>
    apiFetch<{ success: boolean; data: GoalRecord; message: string }>(`/api/goals/${id}/complete-today`, { method: 'POST' }),
  updateStatus: (id: string, status: string) =>
    apiFetch<{ success: boolean; data: GoalRecord; message: string }>(`/api/goals/${id}/status`, { method: 'PATCH', body: { status } }),
};
>>>>>>> Stashed changes
