import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  reminderApi,
  type ReminderFrequency,
  type ReminderNotification,
  type ReminderPayload,
  type ReminderType,
  type WellbeingReminder,
} from '@/services/api';
import { BRAND, formatTime } from '@/constants/moods';
import { panelStyles as s } from './panelStyles';

const TYPES: { key: ReminderType; label: string; icon: 'happy-outline' | 'leaf-outline' | 'notifications-outline' }[] = [
  { key: 'mood_log', label: 'Mood check-in', icon: 'happy-outline' },
  { key: 'wellness_activity', label: 'Wellbeing activity', icon: 'leaf-outline' },
  { key: 'custom', label: 'Custom', icon: 'notifications-outline' },
];

const FREQUENCIES: { key: ReminderFrequency; label: string }[] = [
  { key: 'daily', label: 'Every day' },
  { key: 'weekly', label: 'Certain days' },
  { key: 'once', label: 'Once' },
];

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const QUICK_TIMES = ['08:00', '12:30', '18:00', '21:00'];

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Minutes ahead of UTC for this device, matching what the API expects. */
const deviceUtcOffset = () => -new Date().getTimezoneOffset();

const tomorrowKey = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

const notify = (title: string, message: string) => {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
};

const confirm = (message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm();
  } else {
    Alert.alert('Delete reminder', message, [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ]);
  }
};

const scheduleLabel = (reminder: WellbeingReminder) => {
  const time = reminder.timeOfDay;
  if (reminder.frequency === 'daily') return `Every day at ${time}`;
  if (reminder.frequency === 'once') return `Once on ${reminder.startDate} at ${time}`;
  const days = [...reminder.daysOfWeek].sort().map((day) => DAY_NAMES[day]).join(', ');
  return `${days || 'No days'} at ${time}`;
};

const nextSendLabel = (reminder: WellbeingReminder) => {
  if (reminder.status === 'paused') return 'Paused';
  if (reminder.status === 'completed') return 'Finished';
  if (!reminder.nextSendAt) return 'Not scheduled';

  const next = new Date(reminder.nextSendAt);
  const isToday = next.toDateString() === new Date().toDateString();
  const dayPart = isToday
    ? 'Today'
    : next.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  return `Next: ${dayPart} at ${formatTime(reminder.nextSendAt)}`;
};

type FormState = {
  id: string | null;
  type: ReminderType;
  frequency: ReminderFrequency;
  timeOfDay: string;
  daysOfWeek: number[];
  startDate: string;
  title: string;
  message: string;
};

const emptyForm = (): FormState => ({
  id: null,
  type: 'mood_log',
  frequency: 'daily',
  timeOfDay: '20:00',
  daysOfWeek: [1, 3, 5],
  startDate: tomorrowKey(),
  title: '',
  message: '',
});

/** US-30 to US-33 - set, edit, delete reminders and read their notifications. */
export function RemindersPanel() {
  const [reminders, setReminders] = useState<WellbeingReminder[]>([]);
  const [notifications, setNotifications] = useState<ReminderNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const [reloadToken, setReloadToken] = useState(0);
  const refresh = () => setReloadToken((value) => value + 1);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        // Reading notifications also delivers any occurrences that came due.
        const [reminderList, inbox] = await Promise.all([
          reminderApi.list(),
          reminderApi.notifications(),
        ]);
        if (!active) return;
        setReminders(reminderList.items);
        setNotifications(inbox.items);
        setUnreadCount(inbox.meta.unreadCount);
        setError(null);
      } catch (loadError: any) {
        if (active) setError(loadError.message || 'Unable to load your reminders.');
      } finally {
        if (active) setLoading(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [reloadToken]);

  const openCreate = () => {
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (reminder: WellbeingReminder) => {
    setForm({
      id: reminder._id,
      type: reminder.type,
      frequency: reminder.frequency,
      timeOfDay: reminder.timeOfDay,
      daysOfWeek: reminder.daysOfWeek.length ? reminder.daysOfWeek : [1, 3, 5],
      startDate: reminder.startDate || tomorrowKey(),
      title: reminder.title || '',
      message: reminder.message || '',
    });
    setFormOpen(true);
  };

  const toggleDay = (day: number) =>
    setForm((current) => ({
      ...current,
      daysOfWeek: current.daysOfWeek.includes(day)
        ? current.daysOfWeek.filter((value) => value !== day)
        : [...current.daysOfWeek, day],
    }));

  const save = async () => {
    if (!TIME_PATTERN.test(form.timeOfDay)) {
      notify('Check the time', 'Enter a time in 24-hour HH:MM format, such as 20:30.');
      return;
    }
    if (form.frequency === 'weekly' && form.daysOfWeek.length === 0) {
      notify('Pick your days', 'Choose at least one day of the week.');
      return;
    }
    if (form.frequency === 'once' && !DATE_PATTERN.test(form.startDate)) {
      notify('Check the date', 'Enter a date as YYYY-MM-DD.');
      return;
    }

    const payload: ReminderPayload = {
      type: form.type,
      timeOfDay: form.timeOfDay,
      frequency: form.frequency,
      title: form.title.trim() || undefined,
      message: form.message.trim() || undefined,
      utcOffsetMinutes: deviceUtcOffset(),
      ...(form.frequency === 'weekly' ? { daysOfWeek: form.daysOfWeek } : {}),
      ...(form.frequency === 'once' ? { startDate: form.startDate } : {}),
    };

    try {
      setSaving(true);
      if (form.id) await reminderApi.update(form.id, payload);
      else await reminderApi.create(payload);
      setFormOpen(false);
      refresh();
    } catch (saveError: any) {
      notify('Could not save', saveError.message || 'Please check the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (reminder: WellbeingReminder) => {
    try {
      await reminderApi.setStatus(reminder._id, reminder.status === 'active' ? 'paused' : 'active');
      refresh();
    } catch (statusError: any) {
      notify('Could not update', statusError.message || 'Please try again.');
    }
  };

  const remove = (reminder: WellbeingReminder) =>
    confirm(`Delete "${reminder.resolvedTitle}"? You will stop receiving it.`, async () => {
      try {
        await reminderApi.remove(reminder._id);
        refresh();
      } catch (deleteError: any) {
        notify('Could not delete', deleteError.message || 'Please try again.');
      }
    });

  if (loading && reminders.length === 0 && notifications.length === 0) {
    return <ActivityIndicator style={styles.loader} color={BRAND} />;
  }

  return (
    <View style={s.section}>
      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.flex1}>
            <Text style={s.cardTitle}>Your reminders</Text>
            <Text style={s.cardSubtitle}>Nudges to keep your wellbeing routine on track</Text>
          </View>
          <TouchableOpacity onPress={openCreate} style={styles.addButton} accessibilityLabel="Add reminder">
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {reminders.map((reminder) => {
          const meta = TYPES.find((type) => type.key === reminder.type) || TYPES[2];
          const paused = reminder.status !== 'active';

          return (
            <View key={reminder._id} style={styles.reminderRow}>
              <View style={[styles.reminderIcon, paused && styles.reminderIconMuted]}>
                <Ionicons name={meta.icon} size={17} color={paused ? '#9AA2AC' : BRAND} />
              </View>

              <View style={s.flex1}>
                <Text style={[s.listTitle, paused && styles.mutedTitle]}>{reminder.resolvedTitle}</Text>
                <Text style={s.listMeta}>{scheduleLabel(reminder)}</Text>
                <Text style={[s.listMeta, !paused && styles.nextUp]}>{nextSendLabel(reminder)}</Text>
              </View>

              <TouchableOpacity
                onPress={() => toggleStatus(reminder)}
                hitSlop={6}
                accessibilityLabel={paused ? 'Resume reminder' : 'Pause reminder'}
              >
                <Ionicons name={paused ? 'play-circle-outline' : 'pause-circle-outline'} size={21} color={BRAND} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openEdit(reminder)} hitSlop={6} accessibilityLabel="Edit reminder">
                <Ionicons name="create-outline" size={19} color={BRAND} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(reminder)} hitSlop={6} accessibilityLabel="Delete reminder">
                <Ionicons name="trash-outline" size={19} color="#C4453C" />
              </TouchableOpacity>
            </View>
          );
        })}

        {reminders.length === 0 ? (
          <Text style={s.empty}>No reminders yet. Add one so you never miss a check-in.</Text>
        ) : null}
      </View>

      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.flex1}>
            <Text style={s.cardTitle}>Notifications</Text>
            <Text style={s.cardSubtitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
            </Text>
          </View>
          <TouchableOpacity onPress={refresh} hitSlop={8} accessibilityLabel="Refresh notifications">
            <Ionicons name="refresh" size={19} color={BRAND} />
          </TouchableOpacity>
        </View>

        {notifications.map((item) => (
          <View key={item._id} style={s.listRow}>
            <View style={[styles.dot, item.read && styles.dotRead]} />
            <View style={s.flex1}>
              <Text style={s.listTitle}>{item.title}</Text>
              <Text style={styles.notificationBody}>{item.body}</Text>
              <Text style={s.listMeta}>
                {new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ·{' '}
                {formatTime(item.createdAt)}
              </Text>
            </View>
          </View>
        ))}

        {notifications.length === 0 ? (
          <Text style={s.empty}>Reminder notifications will appear here when they are due.</Text>
        ) : null}
      </View>

      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={s.cardTitle}>{form.id ? 'Edit reminder' : 'New reminder'}</Text>

              <Text style={s.inputLabel}>What is it for</Text>
              <View style={s.chipRow}>
                {TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    onPress={() => setForm((current) => ({ ...current, type: type.key }))}
                    style={[s.chip, form.type === type.key && s.chipActive]}
                  >
                    <Text style={[s.chipText, form.type === type.key && s.chipTextActive]}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.inputLabel}>How often</Text>
              <View style={s.chipRow}>
                {FREQUENCIES.map((frequency) => (
                  <TouchableOpacity
                    key={frequency.key}
                    onPress={() => setForm((current) => ({ ...current, frequency: frequency.key }))}
                    style={[s.chip, form.frequency === frequency.key && s.chipActive]}
                  >
                    <Text style={[s.chipText, form.frequency === frequency.key && s.chipTextActive]}>
                      {frequency.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {form.frequency === 'weekly' ? (
                <>
                  <Text style={s.inputLabel}>Which days</Text>
                  <View style={styles.dayRow}>
                    {DAY_LABELS.map((label, index) => {
                      const selected = form.daysOfWeek.includes(index);
                      return (
                        <TouchableOpacity
                          key={`${label}-${index}`}
                          onPress={() => toggleDay(index)}
                          style={[styles.dayChip, selected && styles.dayChipActive]}
                          accessibilityLabel={DAY_NAMES[index]}
                        >
                          <Text style={[styles.dayChipText, selected && styles.dayChipTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {form.frequency === 'once' ? (
                <>
                  <Text style={s.inputLabel}>Date</Text>
                  <TextInput
                    value={form.startDate}
                    onChangeText={(value) => setForm((current) => ({ ...current, startDate: value }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#8B949E"
                    style={s.input}
                    maxLength={10}
                  />
                </>
              ) : null}

              <Text style={s.inputLabel}>Time</Text>
              <TextInput
                value={form.timeOfDay}
                onChangeText={(value) => setForm((current) => ({ ...current, timeOfDay: value }))}
                placeholder="20:00"
                placeholderTextColor="#8B949E"
                style={s.input}
                maxLength={5}
                keyboardType="numbers-and-punctuation"
              />
              <View style={[s.chipRow, styles.quickTimes]}>
                {QUICK_TIMES.map((time) => (
                  <TouchableOpacity
                    key={time}
                    onPress={() => setForm((current) => ({ ...current, timeOfDay: time }))}
                    style={[s.chip, form.timeOfDay === time && s.chipActive]}
                  >
                    <Text style={[s.chipText, form.timeOfDay === time && s.chipTextActive]}>{time}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.inputLabel}>Message (optional)</Text>
              <TextInput
                value={form.message}
                onChangeText={(value) => setForm((current) => ({ ...current, message: value }))}
                placeholder="e.g. How are you feeling today?"
                placeholderTextColor="#8B949E"
                style={s.input}
                maxLength={300}
              />

              <TouchableOpacity
                onPress={save}
                disabled={saving}
                style={[s.primaryButton, styles.modalAction, saving && s.disabled]}
              >
                {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                <Text style={s.primaryText}>{form.id ? 'Save changes' : 'Create reminder'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setFormOpen(false)} style={s.cancelButton}>
                <Text style={s.muted}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EDF1F5',
  },
  reminderIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#EAF2F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderIconMuted: { backgroundColor: '#F1F3F5' },
  mutedTitle: { color: '#8B949E' },
  nextUp: { color: BRAND, fontWeight: '700' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND },
  dotRead: { backgroundColor: '#D8DEE5' },
  notificationBody: { color: '#5E6770', fontSize: 12, marginTop: 2, lineHeight: 17 },
  dayRow: { flexDirection: 'row', gap: 7 },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF3F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: { backgroundColor: BRAND },
  dayChipText: { fontSize: 12, fontWeight: '800', color: '#5B6570' },
  dayChipTextActive: { color: '#FFFFFF' },
  quickTimes: { marginTop: 8 },
  modalAction: { marginTop: 22 },
});
