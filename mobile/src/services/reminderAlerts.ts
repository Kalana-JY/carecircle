import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { reminderApi, type WellbeingReminder } from '@/services/api';

const DAY_MS = 24 * 60 * 60 * 1000;
const scheduled = new Map<string, { at: number; timer: ReturnType<typeof setTimeout> }>();

type FireListener = () => void;
const listeners = new Set<FireListener>();

export const onReminderFired = (listener: FireListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const browserNotification = () => {
  if (typeof globalThis === 'undefined') return null;
  const notification = (globalThis as { Notification?: typeof Notification }).Notification;
  return notification || null;
};

export const requestNotificationPermissions = async () => {
  if (Platform.OS === 'web') {
    const NotificationApi = browserNotification();
    if (!NotificationApi || NotificationApi.permission !== 'default') return;
    try {
      await NotificationApi.requestPermission();
    } catch {
      // Browser restriction
    }
  }
};

export const triggerSystemNotification = async (title: string, body: string, data?: any) => {
  try {
    // Haptic feedback alert on mobile devices
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  } catch {
    // Non-fatal if device doesn't support haptics
  }

  if (Platform.OS === 'web') {
    const NotificationApi = browserNotification();
    if (!NotificationApi || NotificationApi.permission !== 'granted') return;
    try {
      new NotificationApi(title, { body });
    } catch {
      // Browser restriction
    }
  }
};

/** Schedules the next occurrence so a reminder can trigger on time. */
export const scheduleReminderAlerts = async (reminders: WellbeingReminder[]) => {
  await requestNotificationPermissions();
  const keep = new Set<string>();

  reminders.forEach((reminder) => {
    if (reminder.status !== 'active' || !reminder.nextSendAt) return;
    const at = new Date(reminder.nextSendAt).getTime();
    const delay = at - Date.now();
    if (delay <= 0 || delay > DAY_MS) return;

    keep.add(reminder._id);
    const existing = scheduled.get(reminder._id);
    if (existing && existing.at === at) return;
    if (existing) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      scheduled.delete(reminder._id);
      triggerSystemNotification(reminder.resolvedTitle, reminder.resolvedMessage, {
        reminderId: reminder._id,
        type: reminder.type,
      });
      listeners.forEach((listener) => listener());
    }, delay);

    scheduled.set(reminder._id, { at, timer });
  });

  scheduled.forEach((entry, id) => {
    if (keep.has(id)) return;
    clearTimeout(entry.timer);
    scheduled.delete(id);
  });
};

export const refreshReminderSchedule = async () => {
  try {
    const list = await reminderApi.list('active');
    await scheduleReminderAlerts(list.items);
  } catch {
    // API unavailable
  }
};
