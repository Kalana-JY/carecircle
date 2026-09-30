import React, { useCallback, useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationApi, type ReminderNotification } from '@/services/api';
import { onReminderFired, refreshReminderSchedule } from '@/services/reminderAlerts';

const BRAND = '#3A7CA5';
const POLL_MS = 20000;

const REMINDER_TYPES = new Set([
  'mood_log_reminder',
  'wellness_activity_reminder',
  'custom_reminder',
]);

const labelFor = (type: string) => {
  if (type === 'wellness_activity_reminder') return 'Wellbeing reminder';
  if (type === 'mood_log_reminder') return 'Mood reminder';
  return 'Reminder';
};

/** Shows a due reminder as a dialog. Tips and other notifications stay in their own screens. */
export function NotificationDialog() {
  const [queue, setQueue] = useState<ReminderNotification[]>([]);
  const [current, setCurrent] = useState<ReminderNotification | null>(null);

  const refresh = useCallback(async () => {
    try {
      await refreshReminderSchedule();
      const inbox = await notificationApi.list(true);
      const fresh = (inbox.data || []).filter((item) => REMINDER_TYPES.has(item.type) && !item.read);
      if (!fresh.length) return;

      setQueue((existing) => {
        const seen = new Set(existing.map((item) => item._id));
        if (current) seen.add(current._id);
        const added = fresh.filter((item) => !seen.has(item._id));
        return added.length ? [...existing, ...added] : existing;
      });
    } catch {
      // Stay quiet when the user is signed out or the API is briefly unreachable.
    }
  }, [current]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    const unsubscribe = onReminderFired(() => {
      refresh();
    });
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [refresh]);

  useEffect(() => {
    if (!current && queue.length) {
      setCurrent(queue[0]);
      setQueue((existing) => existing.slice(1));
    }
  }, [current, queue]);

  const dismiss = async () => {
    const shown = current;
    setCurrent(null);
    if (!shown) return;
    try {
      await notificationApi.markRead(shown._id);
    } catch {
      // The dialog is already closed. A later poll can show it again if it stayed unread.
    }
  };

  return (
    <Modal visible={!!current} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications" size={26} color={BRAND} />
          </View>
          <Text style={styles.kicker}>{current ? labelFor(current.type) : ''}</Text>
          <Text style={styles.title}>{current?.title}</Text>
          <Text style={styles.body}>{current?.body}</Text>
          <TouchableOpacity onPress={dismiss} style={styles.button} accessibilityLabel="Dismiss notification">
            <Text style={styles.buttonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 20, 26, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EAF2F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kicker: {
    color: BRAND,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    color: '#1C242C',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 6,
  },
  body: {
    color: '#5E6770',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
  },
  button: {
    marginTop: 20,
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
