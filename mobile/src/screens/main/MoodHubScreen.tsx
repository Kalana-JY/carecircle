import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MoodHubChrome, type HubTab } from '../../components/MoodHubChrome';
import { SidePanel } from '../../components/SidePanel';
import { MoodCalendarModal } from '../../components/MoodCalendar';
import { MoodWeekStrip, buildRecentDays } from '../../components/MoodWeekStrip';
import { dateOnly, journalApi, JournalEntry, moodApi, MoodEntry, wellnessActivityApi, WellnessActivity } from '@/services/api';
import { tokenStorage } from '@/services/storage';
import { BRAND, MOODS, entryTimestamp, formatTime, moodEmoji, shortMonth, stampFromDate, todayStamp } from '@/constants/moods';

const weekStartStamp = () => {
  const date = new Date();
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return stampFromDate(date);
};

type Reminder = { id: string; text: string; done: boolean };

export default function MoodHubScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [hubTab, setHubTab] = useState<HubTab>(route.params?.hubTab || 'moods');
  const [panelOpen, setPanelOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [activities, setActivities] = useState<WellnessActivity[]>([]);
  const [selectedMood, setSelectedMood] = useState(route.params?.selectedMood || 'Steady');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);

  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityEditingId, setActivityEditingId] = useState<string | null>(null);
  const [activityTitle, setActivityTitle] = useState('');
  const [activityCategory, setActivityCategory] = useState('Consistency');
  const [activityTarget, setActivityTarget] = useState('7');
  const [activityDuration, setActivityDuration] = useState('10');

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderText, setReminderText] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{ id: string; source: 'journal' | 'mood'; mood: string; text: string; date: string } | null>(null);
  const [showComposer, setShowComposer] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      setError(null);
      const [moodsResponse, journalsResponse, wellnessResponse, storedReminders] = await Promise.all([
        moodApi.list(1, 100),
        journalApi.list(1, 50),
        wellnessActivityApi.list(),
        tokenStorage.getItem('wellness_reminders'),
      ]);
      setMoodEntries(moodsResponse.items);
      setJournalEntries(journalsResponse.items);
      setActivities(wellnessResponse.items);
      if (storedReminders) setReminders(JSON.parse(storedReminders));
    } catch (loadError: any) {
      setError(loadError.message || 'Unable to load your wellness data.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  useEffect(() => {
    if (route.params?.selectedMood) setSelectedMood(route.params.selectedMood);
    if (route.params?.hubTab) setHubTab(route.params.hubTab);
  }, [route.params?.hubTab, route.params?.selectedMood]);

  const persistReminders = async (next: Reminder[]) => {
    setReminders(next);
    await tokenStorage.setItem('wellness_reminders', JSON.stringify(next));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const startVoice = () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Voice notes', 'Voice typing is available in the web app.');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      Alert.alert('Voice notes', 'Speech recognition is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      const spoken = event.results?.[0]?.[0]?.transcript || '';
      setNotes((current) => (current ? `${current} ${spoken}` : spoken));
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  const saveMood = async () => {
    try {
      setSaving(true);
      setError(null);
      await moodApi.create({ date: todayStamp(), mood: selectedMood, intensity: 5, notes });
      setNotes('');
      await loadAll();
    } catch (saveError: any) {
      setError(saveError.message || 'Unable to save today\'s entry.');
    } finally {
      setSaving(false);
    }
  };

  const resetActivityForm = () => {
    setActivityTitle('');
    setActivityCategory('Consistency');
    setActivityTarget('7');
    setActivityDuration('10');
    setActivityEditingId(null);
    setShowActivityForm(false);
  };

  const startEditActivity = (activity: WellnessActivity) => {
    setActivityEditingId(activity._id);
    setActivityTitle(activity.title);
    setActivityCategory(activity.category);
    setActivityTarget(String(activity.targetPerWeek));
    setActivityDuration(String(activity.duration));
    setShowActivityForm(true);
  };

  const saveActivity = async () => {
    const target = Number(activityTarget);
    const minutes = Number(activityDuration);
    if (!activityTitle.trim() || !Number.isInteger(minutes) || minutes < 1 || !Number.isInteger(target) || target < 1 || target > 7) {
      setError('Add a title, duration, and a weekly target between 1 and 7.');
      return;
    }
    try {
      const payload = {
        title: activityTitle.trim(),
        category: activityCategory.trim() || 'Consistency',
        duration: minutes,
        targetPerWeek: target,
      };
      if (activityEditingId) {
        await wellnessActivityApi.update(activityEditingId, payload);
      } else {
        await wellnessActivityApi.create({ ...payload, date: todayStamp() });
      }
      resetActivityForm();
      await loadAll();
    } catch (saveError: any) {
      setError(saveError.message || 'Unable to save activity.');
    }
  };

  const deleteActivity = (activity: WellnessActivity) => {
    confirmRemove(`Remove "${activity.title}" and its logs from your routine?`, async () => {
      try {
        await wellnessActivityApi.remove(activity._id);
        await loadAll();
      } catch (deleteError: any) {
        setError(deleteError.message || 'Unable to delete this activity.');
      }
    });
  };

  const logActivity = async (activity: WellnessActivity) => {
    try {
      await wellnessActivityApi.log(activity._id, todayStamp(), activity.duration || 1);
      await loadAll();
    } catch (logError: any) {
      setError(logError.message || 'Unable to log activity.');
    }
  };

  const unlogActivity = async (activity: WellnessActivity) => {
    try {
      await wellnessActivityApi.log(activity._id, todayStamp(), 0);
      await loadAll();
    } catch (logError: any) {
      setError(logError.message || 'Unable to update activity.');
    }
  };

  const latestMoodByDay = useMemo(() => {
    const map = new Map<string, { mood: string; count: number }>();
    const combined = [
      ...moodEntries.map((entry) => ({ date: entry.date, mood: entry.mood, createdAt: entry.createdAt, updatedAt: entry.updatedAt })),
      ...journalEntries
        .filter((entry) => entry.mood)
        .map((entry) => ({ date: entry.date, mood: entry.mood as string, createdAt: entry.createdAt, updatedAt: entry.updatedAt })),
    ].sort((a, b) => entryTimestamp(b) - entryTimestamp(a));
    combined.forEach((entry) => {
      const key = dateOnly(entry.date);
      if (!key) return;
      const current = map.get(key);
      if (!current) map.set(key, { mood: entry.mood, count: 1 });
      else current.count += 1;
    });
    return map;
  }, [journalEntries, moodEntries]);

  const weekDays = useMemo(() => buildRecentDays(latestMoodByDay, 7), [latestMoodByDay]);

  const confirmRemove = (message: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      if (window.confirm(message)) onConfirm();
    } else {
      Alert.alert('Remove entry', message, [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onConfirm },
      ]);
    }
  };

  const deleteCard = (card: { id: string; source: 'journal' | 'mood' }) => {
    confirmRemove('This reflection will be removed from your history.', async () => {
      try {
        if (card.source === 'journal') await journalApi.remove(card.id);
        else await moodApi.remove(card.id);
        await loadAll();
      } catch (deleteError: any) {
        setError(deleteError.message || 'Unable to delete this entry.');
      }
    });
  };

  const saveEditedEntry = async () => {
    if (!editingEntry) return;
    try {
      if (editingEntry.source === 'journal') {
        await journalApi.update(editingEntry.id, { body: editingEntry.text, mood: editingEntry.mood, date: dateOnly(editingEntry.date) });
      } else {
        await moodApi.update(editingEntry.id, { notes: editingEntry.text, mood: editingEntry.mood });
      }
      setEditingEntry(null);
      await loadAll();
    } catch (saveError: any) {
      setError(saveError.message || 'Unable to update this entry.');
    }
  };

  const saveComposer = async () => {
    if (!editingEntry || !editingEntry.text.trim()) {
      setError('Write a few lines before saving.');
      return;
    }
    try {
      await journalApi.create({ date: todayStamp(), title: `${editingEntry.mood} note`, body: editingEntry.text.trim(), mood: editingEntry.mood });
      setShowComposer(false);
      setEditingEntry(null);
      await loadAll();
    } catch (saveError: any) {
      setError(saveError.message || 'Unable to save this entry.');
    }
  };

  const progressFor = (activity: WellnessActivity) =>
    activity.logs.filter((log) => dateOnly(log.date) >= weekStartStamp() && dateOnly(log.date) <= todayStamp() && log.minutes > 0).length;

  const loggedToday = (activity: WellnessActivity) =>
    activity.logs.some((log) => dateOnly(log.date) === todayStamp() && log.minutes > 0);

  const journalCards = useMemo(() => {
    const fromJournals = journalEntries.map((entry) => ({
      id: entry._id,
      source: 'journal' as const,
      date: entry.date,
      mood: entry.mood,
      text: entry.body,
      createdAt: entry.createdAt,
    }));
    const fromMoods = moodEntries
      .filter((entry) => entry.notes?.trim())
      .map((entry) => ({
        id: entry._id,
        source: 'mood' as const,
        date: entry.date,
        mood: entry.mood,
        text: entry.notes || '',
        createdAt: entry.createdAt,
      }));
    return [...fromJournals, ...fromMoods]
      .sort((a, b) => entryTimestamp(b) - entryTimestamp(a))
      .slice(0, 3);
  }, [journalEntries, moodEntries]);

  const weeklyMoodCount = moodEntries.filter((entry) => dateOnly(entry.date) >= weekStartStamp()).length;
  const weeklyActivityLogs = activities.reduce((sum, activity) => sum + progressFor(activity), 0);
  const weeklyActivityTarget = activities.reduce((sum, activity) => sum + (activity.targetPerWeek || 0), 0);

  const categoryStyle = (category: string) => {
    const value = category.toLowerCase();
    if (value.includes('sleep')) return { tint: '#E8A0A0', icon: 'moon-outline' as const };
    if (value.includes('calm') || value.includes('breath')) return { tint: '#8FB6D4', icon: 'leaf-outline' as const };
    return { tint: BRAND, icon: 'book-outline' as const };
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <MoodHubChrome activeTab={hubTab} onTabChange={setHubTab} onAvatarPress={() => setPanelOpen(true)} />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {hubTab === 'moods' && (
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>How does today feel?</Text>
              <View style={styles.moodRow}>
                {MOODS.map((mood) => {
                  const selected = selectedMood === mood.label;
                  return (
                    <TouchableOpacity key={mood.label} onPress={() => setSelectedMood(mood.label)} style={styles.moodItem} activeOpacity={0.85}>
                      <View style={[styles.moodCircle, selected && styles.moodCircleSelected]}>
                        <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                      </View>
                      <Text style={[styles.moodLabel, selected && styles.moodLabelSelected]}>{mood.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.notesWrap}>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add a few lines about today (optional)..."
                  placeholderTextColor="#8B949E"
                  multiline
                  style={styles.notesInput}
                />
                <Pressable onPress={startVoice} style={styles.micButton}>
                  <Ionicons name={listening ? 'mic' : 'mic-outline'} size={18} color={BRAND} />
                </Pressable>
              </View>
              <TouchableOpacity onPress={saveMood} disabled={saving} style={styles.primaryButton} activeOpacity={0.85}>
                <Text style={styles.primaryText}>{saving ? 'Saving...' : "Save today's entry"}</Text>
              </TouchableOpacity>
            </View>

            <MoodWeekStrip days={weekDays} onOpenCalendar={() => setShowCalendar(true)} />

            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Journal entries</Text>
              <TouchableOpacity
                onPress={() => {
                  setEditingEntry({ id: 'new', source: 'journal', mood: selectedMood, text: '', date: todayStamp() });
                  setShowComposer(true);
                }}
                style={styles.newButton}
                accessibilityLabel="Write a new journal entry"
              >
                <Ionicons name="add-circle" size={22} color={BRAND} />
                <Text style={styles.link}>New</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              {journalCards.map((entry) => (
                <View key={`${entry.source}-${entry.id}`} style={styles.journalRow}>
                  <View style={styles.journalMeta}>
                    <View style={styles.datePill}>
                      <Text style={styles.datePillText}>{shortMonth(entry.date)}</Text>
                    </View>
                    <Text style={styles.journalMood}>
                      {moodEmoji(entry.mood)} {entry.mood || 'Note'}
                    </Text>
                    <Text style={styles.journalTime}>{formatTime(entry.createdAt)}</Text>
                    <View style={styles.journalIcons}>
                      <TouchableOpacity
                        onPress={() => setEditingEntry({ id: entry.id, source: entry.source, mood: entry.mood || 'Steady', text: entry.text, date: entry.date })}
                        accessibilityLabel="Edit entry"
                      >
                        <Ionicons name="create-outline" size={18} color={BRAND} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteCard(entry)} accessibilityLabel="Delete entry">
                        <Ionicons name="trash-outline" size={18} color="#C4453C" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.journalBody}>{entry.text}</Text>
                </View>
              ))}
              {journalCards.length === 0 ? <Text style={styles.empty}>Your reflections will appear here. A few honest lines are enough.</Text> : null}
              <TouchableOpacity onPress={() => navigation.navigate('Journals')} activeOpacity={0.8}>
                <Text style={styles.viewAll}>View all entries</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {hubTab === 'journal' && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Wellbeing Activities</Text>
              <TouchableOpacity onPress={() => { resetActivityForm(); setShowActivityForm(true); }}>
                <Text style={styles.link}>+ NEW ACTIVITY</Text>
              </TouchableOpacity>
            </View>
            {activities.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.empty}>Create an activity to start building your routine.</Text>
              </View>
            ) : null}
            {activities.map((activity) => {
              const completed = progressFor(activity);
              const percent = Math.round((completed / Math.max(activity.targetPerWeek, 1)) * 100);
              const meta = categoryStyle(activity.category);
              return (
                <View key={activity._id} style={styles.activityCard}>
                  <View style={styles.activityTop}>
                    <View style={[styles.activityIcon, { backgroundColor: `${meta.tint}22` }]}>
                      <Ionicons name={meta.icon} size={18} color={meta.tint} />
                    </View>
                    <View style={styles.activityCopy}>
                      <Text style={styles.activityTitle}>{activity.title}</Text>
                      <Text style={styles.activityCategory}>{activity.category.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.percent}>{percent}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.min(100, percent)}%`, backgroundColor: meta.tint }]} />
                  </View>
                  <View style={styles.rowBetween}>
                    <Text style={styles.muted}>Weekly Progress</Text>
                    <Text style={styles.muted}>
                      {completed} / {activity.targetPerWeek} this week
                    </Text>
                  </View>
                  <View style={styles.activityActions}>
                    <TouchableOpacity style={styles.action} onPress={() => startEditActivity(activity)} accessibilityLabel={`Edit ${activity.title}`}>
                      <Ionicons name="create-outline" size={18} color={BRAND} />
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.action} onPress={() => deleteActivity(activity)} accessibilityLabel={`Delete ${activity.title}`}>
                      <Ionicons name="trash-outline" size={18} color="#C4453C" />
                      <Text style={[styles.actionText, { color: '#C4453C' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            <View style={[styles.rowBetween, { marginTop: 18 }]}>
              <Text style={styles.sectionTitle}>Today&apos;s activities</Text>
              <TouchableOpacity
                onPress={() => {
                  const next = activities.find((activity) => !loggedToday(activity));
                  if (next) logActivity(next);
                  else setShowActivityForm(true);
                }}
              >
                <Text style={styles.link}>+ LOG ACTIVITY</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              {activities.map((activity) => {
                const done = loggedToday(activity);
                return (
                  <View key={activity._id} style={styles.todayRow}>
                    <TouchableOpacity
                      onPress={() => (done ? unlogActivity(activity) : logActivity(activity))}
                      style={styles.todayMain}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={done ? BRAND : '#C5CAD1'} />
                      <Text style={[styles.todayLabel, done && styles.todayDone]}>
                        {activity.title} {activity.duration} min
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => startEditActivity(activity)} hitSlop={8} accessibilityLabel={`Edit ${activity.title}`}>
                      <Ionicons name="create-outline" size={18} color={BRAND} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteActivity(activity)} hitSlop={8} accessibilityLabel={`Delete ${activity.title}`}>
                      <Ionicons name="trash-outline" size={18} color="#C4453C" />
                    </TouchableOpacity>
                  </View>
                );
              })}
              {activities.length === 0 ? <Text style={styles.empty}>Log an activity after you create one.</Text> : null}
            </View>
          </View>
        )}

        {hubTab === 'progress' && (
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>This week</Text>
              <Text style={styles.progressStat}>{weeklyMoodCount} mood check-ins</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(100, (weeklyMoodCount / 7) * 100)}%` }]} />
              </View>
              <Text style={styles.muted}>Aim for one check-in a day</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Wellbeing activities</Text>
              <Text style={styles.progressStat}>
                {weeklyActivityLogs} / {weeklyActivityTarget || 0} logs
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${weeklyActivityTarget ? Math.min(100, (weeklyActivityLogs / weeklyActivityTarget) * 100) : 0}%` }]} />
              </View>
              <TouchableOpacity onPress={() => setHubTab('journal')}>
                <Text style={styles.viewAll}>Open activities</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {hubTab === 'reminder' && (
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Daily reminders</Text>
              <View style={styles.reminderForm}>
                <TextInput
                  value={reminderText}
                  onChangeText={setReminderText}
                  placeholder="e.g. Evening breathing at 8pm"
                  placeholderTextColor="#8B949E"
                  style={styles.reminderInput}
                />
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={() => {
                    if (!reminderText.trim()) return;
                    persistReminders([{ id: String(Date.now()), text: reminderText.trim(), done: false }, ...reminders]);
                    setReminderText('');
                  }}
                >
                  <Text style={styles.primaryText}>Add</Text>
                </TouchableOpacity>
              </View>
              {reminders.map((reminder) => (
                <TouchableOpacity
                  key={reminder.id}
                  style={styles.todayRow}
                  onPress={() => persistReminders(reminders.map((item) => (item.id === reminder.id ? { ...item, done: !item.done } : item)))}
                >
                  <Ionicons name={reminder.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={reminder.done ? BRAND : '#C5CAD1'} />
                  <Text style={[styles.todayLabel, reminder.done && styles.todayDone]}>{reminder.text}</Text>
                </TouchableOpacity>
              ))}
              {reminders.length === 0 ? <Text style={styles.empty}>Add a reminder to keep your routine on track.</Text> : null}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={showActivityForm} transparent animationType="slide" onRequestClose={resetActivityForm}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>{activityEditingId ? 'Edit activity' : 'New activity'}</Text>
            <TextInput value={activityTitle} onChangeText={setActivityTitle} placeholder="Activity name" style={styles.formInput} />
            <TextInput value={activityCategory} onChangeText={setActivityCategory} placeholder="Category" style={styles.formInput} />
            <TextInput value={activityDuration} onChangeText={setActivityDuration} keyboardType="number-pad" placeholder="Duration in minutes" style={styles.formInput} />
            <TextInput value={activityTarget} onChangeText={setActivityTarget} keyboardType="number-pad" placeholder="Days per week" style={styles.formInput} />
            <TouchableOpacity onPress={saveActivity} style={styles.primaryButton}>
              <Text style={styles.primaryText}>{activityEditingId ? 'Update activity' : 'Save activity'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={resetActivityForm} style={styles.cancelButton}>
              <Text style={styles.muted}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <MoodCalendarModal
        visible={showCalendar}
        entries={[
          ...moodEntries,
          ...journalEntries.filter((entry) => entry.mood).map((entry) => ({
            _id: `journal-${entry._id}`,
            date: entry.date,
            mood: entry.mood as string,
            notes: entry.body,
            createdAt: entry.createdAt,
          })),
        ]}
        onClose={() => setShowCalendar(false)}
      />

      <Modal visible={!!editingEntry} transparent animationType="slide" onRequestClose={() => { setEditingEntry(null); setShowComposer(false); }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>{showComposer || editingEntry?.id === 'new' ? 'New journal entry' : 'Edit entry'}</Text>
            <View style={styles.moodRow}>
              {MOODS.map((mood) => (
                <TouchableOpacity key={mood.label} onPress={() => editingEntry && setEditingEntry({ ...editingEntry, mood: mood.label })}>
                  <Text style={{ fontSize: 22, opacity: editingEntry?.mood === mood.label ? 1 : 0.4 }}>{mood.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={editingEntry?.text || ''}
              onChangeText={(text) => editingEntry && setEditingEntry({ ...editingEntry, text })}
              placeholder="What would you like to remember about this moment?"
              placeholderTextColor="#8B949E"
              multiline
              style={[styles.formInput, { minHeight: 110, textAlignVertical: 'top' }]}
            />
            <TouchableOpacity onPress={showComposer || editingEntry?.id === 'new' ? saveComposer : saveEditedEntry} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setEditingEntry(null); setShowComposer(false); }} style={styles.cancelButton}>
              <Text style={styles.muted}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SidePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F7FB' },
  content: { paddingBottom: 36 },
  section: { paddingHorizontal: 16, paddingTop: 8 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E7ECF1',
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#1C242C', marginBottom: 14 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  moodItem: { alignItems: 'center', width: '18%' },
  moodCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F6F8',
  },
  moodCircleSelected: {
    borderWidth: 2,
    borderColor: BRAND,
    backgroundColor: '#FFFFFF',
  },
  moodEmoji: { fontSize: 24 },
  moodLabel: { fontSize: 11, color: '#6B7380', marginTop: 6, fontWeight: '600' },
  moodLabelSelected: { color: BRAND, fontWeight: '800' },
  notesWrap: { position: 'relative', marginBottom: 12 },
  notesInput: {
    minHeight: 78,
    borderRadius: 12,
    backgroundColor: '#F3F5F7',
    padding: 12,
    paddingRight: 40,
    textAlignVertical: 'top',
    color: '#1C242C',
  },
  micButton: { position: 'absolute', right: 10, bottom: 10, padding: 4 },
  primaryButton: { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '800' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1C242C', marginBottom: 10 },
  link: { color: BRAND, fontWeight: '800', fontSize: 12 },
  historyActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  calendarButton: { padding: 4 },
  historyRow: { flexDirection: 'row', gap: 10, paddingBottom: 18, paddingHorizontal: 2 },
  historyItem: { alignItems: 'center', gap: 6, width: 48 },
  historyDow: { fontSize: 12, color: '#7A828C', fontWeight: '700' },
  historyDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E6E9ED',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  historyDotFilled: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D7E6F2' },
  historyDotToday: { borderWidth: 2, borderColor: BRAND, backgroundColor: '#FFFFFF' },
  historyDate: { fontSize: 13, fontWeight: '800', color: '#5E6770' },
  historyDateOn: { color: BRAND },
  historyEmoji: { fontSize: 20 },
  historyDayLabel: { fontSize: 11, color: '#8B949E', fontWeight: '700' },
  countBadge: { position: 'absolute', right: -2, top: -2, backgroundColor: BRAND, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  countText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  newButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  journalRow: { marginBottom: 14, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E7ECF1' },
  journalMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  datePill: { backgroundColor: BRAND, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  datePillText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  journalMood: { color: BRAND, fontWeight: '700', fontSize: 12, flex: 1 },
  journalTime: { color: '#8B949E', fontSize: 11, fontWeight: '700' },
  journalIcons: { flexDirection: 'row', gap: 10 },
  journalBody: { color: '#3F4750', fontSize: 14, lineHeight: 20 },
  viewAll: { color: BRAND, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  empty: { color: '#7A828C', textAlign: 'center', paddingVertical: 12 },
  error: { color: '#BA1A1A', paddingHorizontal: 20, marginTop: 8 },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E7ECF1',
  },
  activityTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  activityIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activityCopy: { flex: 1, marginLeft: 10 },
  activityTitle: { fontSize: 15, fontWeight: '800', color: '#1C242C' },
  activityCategory: { fontSize: 10, fontWeight: '800', color: '#8B949E', marginTop: 2 },
  percent: { fontSize: 16, fontWeight: '800', color: '#1C242C' },
  activityActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: BRAND, fontWeight: '700' },
  progressTrack: { height: 8, borderRadius: 8, backgroundColor: '#E6E9ED', overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 8, borderRadius: 8, backgroundColor: BRAND },
  muted: { color: '#7A828C', fontSize: 12, fontWeight: '600' },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  todayMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  todayLabel: { fontSize: 15, color: '#1C242C', fontWeight: '600', flex: 1 },
  todayDone: { color: '#8B949E', textDecorationLine: 'line-through' },
  progressStat: { fontSize: 22, fontWeight: '800', color: '#1C242C', marginBottom: 10 },
  reminderForm: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  reminderInput: { flex: 1, backgroundColor: '#F3F5F7', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  smallButton: { backgroundColor: BRAND, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  formInput: { backgroundColor: '#F3F5F7', borderRadius: 10, padding: 12, marginBottom: 10 },
  cancelButton: { alignItems: 'center', paddingVertical: 12 },
});
