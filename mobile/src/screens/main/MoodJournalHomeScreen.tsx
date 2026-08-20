import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { MainStackNavigationProp } from '../../navigation/MainNavigator';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { dateOnly, journalApi, JournalEntry, moodApi, MoodEntry } from '@/services/api';

const moods = [
  { label: 'Glad', emoji: '😊' },
  { label: 'Calm', emoji: '😌' },
  { label: 'Blue', emoji: '😔' },
  { label: 'Anxious', emoji: '😰' },
  { label: 'Tired', emoji: '😴' },
];

const pad = (value: number) => String(value).padStart(2, '0');
const today = () => {
  const current = new Date();
  return `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`;
};

export default function MoodJournalHomeScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const isDark = useColorScheme() === 'dark';
  const colors = theme(isDark);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([moodApi.list(1), journalApi.list(1)])
      .then(([moodsResponse, journalsResponse]) => {
        setMoodHistory(moodsResponse.items.slice(0, 7));
        setJournalEntries(journalsResponse.items.slice(0, 2));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.date, { color: colors.secondary }]}>{today()}</Text>
        <Text style={[styles.title, { color: colors.text }]}>How does today feel?</Text>
        <Text style={[styles.subtitle, { color: colors.secondary }]}>A small check-in can help you notice your patterns.</Text>

        <View style={[styles.moodCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.moodRow}>
            {moods.map((mood) => (
              <TouchableOpacity
                key={mood.label}
                style={[styles.moodOption, { borderColor: colors.border }, selectedMood === mood.label && { backgroundColor: colors.brand, borderColor: colors.brand }]}
                onPress={() => setSelectedMood(mood.label)}
              >
                <Text style={styles.emoji}>{mood.emoji}</Text>
                <Text style={[styles.moodLabel, { color: selectedMood === mood.label ? '#FFFFFF' : colors.text }]}>{mood.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            disabled={!selectedMood}
            onPress={() => selectedMood && navigation.navigate('Moods', { selectedMood })}
            style={[styles.saveButton, { backgroundColor: selectedMood ? colors.text : colors.border }]}
          >
            <Text style={[styles.saveText, { color: selectedMood ? colors.background : colors.secondary }]}>Save today&apos;s entry</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Mood history</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Moods')}><Text style={[styles.link, { color: colors.brand }]}>See all</Text></TouchableOpacity>
        </View>
        {loading ? <ActivityIndicator color={colors.brand} /> : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyRow}>
            {moodHistory.map((entry) => (
              <TouchableOpacity key={entry._id} style={[styles.historyItem, { borderColor: colors.border }]} onPress={() => navigation.navigate('Moods')}>
                <Text style={[styles.historyDay, { color: colors.secondary }]}>{dateOnly(entry.date).slice(-2)}</Text>
                <Text style={styles.historyEmoji}>{moods.find((mood) => mood.label === entry.mood)?.emoji || '🙂'}</Text>
                <Text style={[styles.historyMood, { color: colors.secondary }]}>{entry.mood}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Journal entries</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Journals')}><Text style={[styles.link, { color: colors.brand }]}>See all</Text></TouchableOpacity>
        </View>
        <View style={styles.entries}>
          {journalEntries.map((entry) => (
            <TouchableOpacity key={entry._id} style={[styles.entry, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('Journals')}>
              <Text style={[styles.entryMeta, { color: colors.secondary }]}>{dateOnly(entry.date)}{entry.mood ? ` · ${entry.mood}` : ''}</Text>
              <Text style={[styles.entryTitle, { color: colors.text }]}>{entry.title || 'Untitled entry'}</Text>
              <Text style={[styles.entryBody, { color: colors.secondary }]} numberOfLines={2}>{entry.body}</Text>
            </TouchableOpacity>
          ))}
          {!loading && journalEntries.length === 0 && <Text style={[styles.empty, { color: colors.secondary }]}>Your reflections will appear here.</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const theme = (isDark: boolean) => ({
  background: isDark ? '#121212' : '#F5F7FA',
  card: isDark ? '#1E1E1E' : '#FFFFFF',
  text: isDark ? '#ECEDEE' : '#1C2024',
  secondary: isDark ? '#9BA1A6' : '#687076',
  border: isDark ? '#2E2E2E' : '#E6E8EB',
  brand: '#245B8B',
});

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  date: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 18 },
  moodCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 24 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  moodOption: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingVertical: 8 },
  emoji: { fontSize: 22 },
  moodLabel: { fontSize: 10, fontWeight: '700', marginTop: 3 },
  saveButton: { alignItems: 'center', borderRadius: 12, paddingVertical: 13, marginTop: 16 },
  saveText: { fontSize: 13, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  link: { fontSize: 13, fontWeight: '700' },
  historyRow: { gap: 8, paddingBottom: 24 },
  historyItem: { width: 54, minHeight: 70, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 7 },
  historyDay: { fontSize: 11, fontWeight: '700' },
  historyEmoji: { fontSize: 20, marginVertical: 2 },
  historyMood: { fontSize: 9, fontWeight: '600' },
  entries: { gap: 10 },
  entry: { borderWidth: 1, borderRadius: 14, padding: 14 },
  entryMeta: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  entryTitle: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  entryBody: { fontSize: 13, lineHeight: 18 },
  empty: { paddingVertical: 12, fontSize: 13 },
});