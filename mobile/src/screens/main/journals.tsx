import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { dateOnly, journalApi, JournalEntry, moodApi, MoodEntry } from '@/services/api';
import { BRAND, MOODS, entryTimestamp, formatLongDate, formatTime, moodEmoji, shortMonth, todayStamp } from '@/constants/moods';
import { MoodCalendarModal } from '../../components/MoodCalendar';

type FeedItem = {
  id: string;
  source: 'journal' | 'mood';
  date: string;
  mood?: string;
  title?: string;
  text: string;
  createdAt?: string;
};

export default function JournalsScreen() {
  const navigation = useNavigation<any>();
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [composer, setComposer] = useState<{ id?: string; source?: 'journal' | 'mood'; mood: string; text: string; title: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [moodResponse, journalResponse] = await Promise.all([moodApi.list(1, 100), journalApi.list(1, 50)]);
      setMoods(moodResponse.items);
      setJournals(journalResponse.items);
    } catch (loadError: any) {
      setError(loadError.message || 'Unable to load your entries.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const feed = useMemo<FeedItem[]>(() => {
    const journalItems = journals.map((entry) => ({
      id: entry._id,
      source: 'journal' as const,
      date: dateOnly(entry.date),
      mood: entry.mood,
      title: entry.title,
      text: entry.body,
      createdAt: entry.createdAt,
    }));
    const moodItems = moods
      .filter((entry) => entry.notes?.trim())
      .map((entry) => ({
        id: entry._id,
        source: 'mood' as const,
        date: dateOnly(entry.date),
        mood: entry.mood,
        title: `${entry.mood} check-in`,
        text: entry.notes || '',
        createdAt: entry.createdAt,
      }));
    return [...journalItems, ...moodItems].sort((a, b) => entryTimestamp(b) - entryTimestamp(a));
  }, [journals, moods]);

  const grouped = useMemo(() => {
    const groups: { date: string; items: FeedItem[] }[] = [];
    feed.forEach((item) => {
      const last = groups[groups.length - 1];
      if (last && last.date === item.date) last.items.push(item);
      else groups.push({ date: item.date, items: [item] });
    });
    return groups;
  }, [feed]);

  const confirmRemove = (onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Remove this reflection from your journal?')) onConfirm();
    } else {
      Alert.alert('Delete entry', 'This reflection will be removed from your history.', [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onConfirm },
      ]);
    }
  };

  const removeItem = (item: FeedItem) => {
    confirmRemove(async () => {
      try {
        if (item.source === 'journal') await journalApi.remove(item.id);
        else await moodApi.remove(item.id);
        await load();
      } catch (deleteError: any) {
        setError(deleteError.message || 'Unable to delete this entry.');
      }
    });
  };

  const saveComposer = async () => {
    if (!composer?.text.trim()) {
      setError('Write a few lines before saving.');
      return;
    }
    try {
      if (composer.id && composer.source === 'journal') {
        await journalApi.update(composer.id, { body: composer.text.trim(), mood: composer.mood, title: composer.title.trim() });
      } else if (composer.id && composer.source === 'mood') {
        await moodApi.update(composer.id, { notes: composer.text.trim(), mood: composer.mood });
      } else {
        await journalApi.create({
          date: todayStamp(),
          title: composer.title.trim() || `${composer.mood} note`,
          body: composer.text.trim(),
          mood: composer.mood,
        });
      }
      setComposer(null);
      await load();
    } catch (saveError: any) {
      setError(saveError.message || 'Unable to save this entry.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FB" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.roundBtn} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={22} color={BRAND} />
          </TouchableOpacity>
          <Text style={styles.brand}>CareCircle</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => setShowCalendar(true)} style={styles.roundBtn} accessibilityLabel="Open calendar">
              <Ionicons name="calendar-outline" size={20} color={BRAND} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setComposer({ mood: 'Steady', text: '', title: '' })} style={styles.newBtn} accessibilityLabel="New journal entry">
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        >
          <View style={styles.hero}>
            <Text style={styles.heroEyebrow}>Your reflections</Text>
            <Text style={styles.heroTitle}>Journal</Text>
            <Text style={styles.heroCopy}>Revisit the feelings you saved, newest first. Edit, delete, or add a new note whenever you need.</Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {grouped.map((group) => (
            <View key={group.date} style={styles.group}>
              <Text style={styles.groupDate}>{formatLongDate(group.date)}</Text>
              {group.items.map((item) => (
                <View key={`${item.source}-${item.id}`} style={styles.card}>
                  <View style={styles.emojiWrap}>
                    <Text style={styles.bigEmoji}>{moodEmoji(item.mood)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardTop}>
                      <View style={styles.datePill}><Text style={styles.datePillText}>{shortMonth(item.date)}</Text></View>
                      <Text style={styles.moodLabel}>{item.mood || 'Note'}</Text>
                      <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
                    </View>
                    {item.title ? <Text style={styles.cardTitle}>{item.title}</Text> : null}
                    <Text style={styles.body}>{item.text}</Text>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.action}
                        onPress={() => setComposer({ id: item.id, source: item.source, mood: item.mood || 'Steady', text: item.text, title: item.title || '' })}
                      >
                        <Ionicons name="create-outline" size={18} color={BRAND} />
                        <Text style={styles.actionText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.action} onPress={() => removeItem(item)}>
                        <Ionicons name="trash-outline" size={18} color="#C4453C" />
                        <Text style={[styles.actionText, { color: '#C4453C' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))}

          {feed.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🌤️</Text>
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptyCopy}>Start with one honest sentence. Your future self will be glad you did.</Text>
              <TouchableOpacity onPress={() => setComposer({ mood: 'Steady', text: '', title: '' })} style={styles.primaryButton}>
                <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryText}>Write first entry</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <MoodCalendarModal
        visible={showCalendar}
        entries={[
          ...moods,
          ...journals.filter((entry) => entry.mood).map((entry) => ({
            _id: `journal-${entry._id}`,
            date: entry.date,
            mood: entry.mood as string,
            notes: entry.body,
            createdAt: entry.createdAt,
          })),
        ]}
        onClose={() => setShowCalendar(false)}
      />

      <Modal visible={!!composer} transparent animationType="slide" onRequestClose={() => setComposer(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{composer?.id ? 'Edit entry' : 'New journal entry'}</Text>
            <View style={styles.moodRow}>
              {MOODS.map((mood) => (
                <TouchableOpacity key={mood.label} onPress={() => composer && setComposer({ ...composer, mood: mood.label })} style={styles.moodChoice}>
                  <View style={[styles.moodBubble, composer?.mood === mood.label && styles.moodBubbleOn]}>
                    <Text style={{ fontSize: 24 }}>{mood.emoji}</Text>
                  </View>
                  <Text style={[styles.moodName, composer?.mood === mood.label && { color: BRAND }]}>{mood.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={composer?.title || ''}
              onChangeText={(title) => composer && setComposer({ ...composer, title })}
              placeholder="Title (optional)"
              placeholderTextColor="#8B949E"
              style={styles.input}
            />
            <TextInput
              value={composer?.text || ''}
              onChangeText={(text) => composer && setComposer({ ...composer, text })}
              placeholder="What would you like to remember?"
              placeholderTextColor="#8B949E"
              multiline
              style={[styles.input, styles.textArea]}
            />
            <TouchableOpacity onPress={saveComposer} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Save entry</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setComposer(null)} style={styles.cancel}>
              <Text style={styles.muted}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F7FB' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  brand: { fontSize: 20, fontWeight: '700', color: BRAND },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E7ECF1' },
  newBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  hero: { backgroundColor: '#3A7CA5', borderRadius: 22, padding: 20, marginBottom: 20 },
  heroEyebrow: { color: '#D7EAF6', fontWeight: '800', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  heroTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginTop: 6 },
  heroCopy: { color: '#E7F3FB', marginTop: 8, lineHeight: 20 },
  group: { marginBottom: 18 },
  groupDate: { fontSize: 13, fontWeight: '800', color: BRAND, marginBottom: 8 },
  card: { flexDirection: 'row', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E7ECF1' },
  emojiWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E7F1F8', alignItems: 'center', justifyContent: 'center' },
  bigEmoji: { fontSize: 26 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  datePill: { backgroundColor: BRAND, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  datePillText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  moodLabel: { color: BRAND, fontWeight: '800', flex: 1 },
  time: { color: '#8B949E', fontSize: 12, fontWeight: '700' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1C242C', marginBottom: 4 },
  body: { color: '#3F4750', lineHeight: 21, fontSize: 15 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: BRAND, fontWeight: '700' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E7ECF1' },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1C242C', textAlign: 'center' },
  emptyCopy: { color: '#6B7380', textAlign: 'center', marginVertical: 10, lineHeight: 20 },
  primaryButton: { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  primaryText: { color: '#FFFFFF', fontWeight: '800' },
  error: { color: '#BA1A1A', marginBottom: 10 },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,28,36,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#1C242C', marginBottom: 12 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  moodChoice: { alignItems: 'center', width: '18%' },
  moodBubble: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F5F7', alignItems: 'center', justifyContent: 'center' },
  moodBubbleOn: { borderWidth: 2, borderColor: BRAND, backgroundColor: '#FFFFFF' },
  moodName: { fontSize: 10, color: '#8B949E', marginTop: 4, fontWeight: '700' },
  input: { backgroundColor: '#F3F5F7', borderRadius: 12, padding: 12, marginBottom: 10, color: '#1C242C' },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  cancel: { alignItems: 'center', paddingVertical: 12 },
  muted: { color: '#7A828C', fontWeight: '700' },
});
