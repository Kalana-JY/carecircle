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

const askPermission = async () => {
  const NotificationApi = browserNotification();
  if (!NotificationApi || NotificationApi.permission !== 'default') return;
  try {
    await NotificationApi.requestPermission();
  } catch {
    // The in-app dialog still appears if the browser blocks permission.
  }
};

const showBrowserNotification = (title: string, body: string) => {
  const NotificationApi = browserNotification();
  if (!NotificationApi || NotificationApi.permission !== 'granted') return;
  try {
    new NotificationApi(title, { body });
  } catch {
    // Some browsers only allow this after a click. The in-app dialog still opens.
  }
};

/** Schedules the next occurrence so a reminder can pop up at its set time. */
export const scheduleReminderAlerts = async (reminders: WellbeingReminder[]) => {
  await askPermission();
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
      showBrowserNotification(reminder.resolvedTitle, reminder.resolvedMessage);
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
  const list = await reminderApi.list('active');
  await scheduleReminderAlerts(list.items);
};
