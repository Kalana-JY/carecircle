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

type CollectionResponse<T> = {
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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = await tokenStorage.getItem('user_session');
  const token = session ? JSON.parse(session).token : null;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Request failed');
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const moodApi = {
  list: () => request<CollectionResponse<MoodEntry>>('/api/moods?limit=100'),
  create: (entry: MoodPayload) =>
    request<MoodEntry>('/api/moods', { method: 'POST', body: JSON.stringify(entry) }),
  update: (id: string, entry: Partial<MoodPayload>) =>
    request<MoodEntry>(`/api/moods/${id}`, { method: 'PATCH', body: JSON.stringify(entry) }),
  remove: (id: string) => request<void>(`/api/moods/${id}`, { method: 'DELETE' }),
};

export const journalApi = {
  list: () => request<CollectionResponse<JournalEntry>>('/api/journals?limit=100'),
  create: (entry: JournalPayload) =>
    request<JournalEntry>('/api/journals', { method: 'POST', body: JSON.stringify(entry) }),
  update: (id: string, entry: Partial<JournalPayload>) =>
    request<JournalEntry>(`/api/journals/${id}`, { method: 'PATCH', body: JSON.stringify(entry) }),
  remove: (id: string) => request<void>(`/api/journals/${id}`, { method: 'DELETE' }),
};
