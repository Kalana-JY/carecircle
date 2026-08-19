import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { moodApi, MoodEntry } from '@/services/api';

const moodOptions = [
  { label: 'Glad', emoji: '😊' },
  { label: 'Calm', emoji: '😌' },
  { label: 'Blue', emoji: '😔' },
  { label: 'Anxious', emoji: '😰' },
  { label: 'Tired', emoji: '😴' },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function MoodsScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = theme(isDark);
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [selectedMood, setSelectedMood] = useState(moodOptions[0].label);
  const [date, setDate] = useState(today());
  const [intensity, setIntensity] = useState('5');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      setError(null);
      const response = await moodApi.list();
      setEntries(response.items);
    } catch (loadError: any) {
      setError(loadError.message || 'Unable to load mood entries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const resetForm = () => {
    setSelectedMood(moodOptions[0].label);
    setDate(today());
    setIntensity('5');
    setNotes('');
    setEditingId(null);
  };

  const saveEntry = async () => {
    const parsedIntensity = Number(intensity);
    if (!selectedMood || !/^\d{4}-\d{2}-\d{2}$/.test(date) || parsedIntensity < 1 || parsedIntensity > 10) {
      setError('Use a valid date and an intensity from 1 to 10.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = { date: new Date(`${date}T12:00:00`).toISOString(), mood: selectedMood, intensity: parsedIntensity, notes };
      if (editingId) {
        const updated = await moodApi.update(editingId, payload);
        setEntries((current) => current.map((entry) => entry._id === editingId ? updated : entry));
      } else {
        const created = await moodApi.create(payload);
        setEntries((current) => [created, ...current]);
      }
      resetForm();
    } catch (saveError: any) {
      setError(saveError.message || 'Unable to save mood entry.');
    } finally {
      setSaving(false);
    }
  };

  const editEntry = (entry: MoodEntry) => {
    setEditingId(entry._id);
    setSelectedMood(entry.mood);
    setDate(entry.date.slice(0, 10));
    setIntensity(String(entry.intensity || 5));
    setNotes(entry.notes || '');
  };

  const deleteEntry = (id: string) => {
    const remove = async () => {
      try {
        await moodApi.remove(id);
        setEntries((current) => current.filter((entry) => entry._id !== id));
      } catch (deleteError: any) {
        setError(deleteError.message || 'Unable to delete mood entry.');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this mood entry?')) remove();
    } else {
      Alert.alert('Delete mood entry', 'This record will be removed from your history.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: remove },
      ]);
    }
  };

  const getSaveButtonLabel = () => {
    if (saving) return 'Saving...';
    if (editingId) return 'Update mood';
    return 'Save mood';
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={entries}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadEntries} />}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Mood journal</Text>
              <Text style={[styles.subtitle, { color: colors.secondary }]}>Record how you feel and revisit your patterns.</Text>
              <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.text }]}>How are you feeling?</Text>
                <View style={styles.chips}>
                  {moodOptions.map((option) => (
                    <Pressable key={option.label} onPress={() => setSelectedMood(option.label)} style={[styles.chip, { borderColor: colors.border }, selectedMood === option.label && { backgroundColor: colors.brand, borderColor: colors.brand }]}>
                      <Text style={styles.emoji}>{option.emoji}</Text>
                      <Text style={[styles.chipText, { color: selectedMood === option.label ? '#fff' : colors.text }]}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={[styles.label, { color: colors.text }]}>Date (YYYY-MM-DD)</Text>
                <TextInput value={date} onChangeText={setDate} placeholder="2026-08-19" placeholderTextColor={colors.secondary} style={[styles.input, { color: colors.text, borderColor: colors.border }]} />
                <Text style={[styles.label, { color: colors.text }]}>Intensity (1-10)</Text>
                <TextInput value={intensity} onChangeText={setIntensity} keyboardType="number-pad" placeholder="5" placeholderTextColor={colors.secondary} style={[styles.input, { color: colors.text, borderColor: colors.border }]} />
                <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
                <TextInput value={notes} onChangeText={setNotes} multiline placeholder="What is contributing to this feeling?" placeholderTextColor={colors.secondary} style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border }]} />
                {error && <Text style={styles.error}>{error}</Text>}
                <View style={styles.actions}>
                  <Pressable onPress={saveEntry} disabled={saving} style={[styles.primaryButton, { backgroundColor: colors.brand }]}><Text style={styles.primaryText}>{getSaveButtonLabel()}</Text></Pressable>
                  {editingId && <Pressable onPress={resetForm} style={[styles.secondaryButton, { borderColor: colors.border }]}><Text style={[styles.secondaryText, { color: colors.text }]}>Cancel</Text></Pressable>}
                </View>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your history</Text>
            </View>
          }
          ListEmptyComponent={!loading ? <Text style={[styles.empty, { color: colors.secondary }]}>No mood entries yet.</Text> : null}
          renderItem={({ item }) => (
            <View style={[styles.entry, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.entryMain}><Text style={styles.entryEmoji}>{moodOptions.find((option) => option.label === item.mood)?.emoji || '🙂'}</Text><View><Text style={[styles.entryMood, { color: colors.text }]}>{item.mood}</Text><Text style={[styles.entryDate, { color: colors.secondary }]}>{item.date.slice(0, 10)} · Intensity {item.intensity || '-'}</Text>{item.notes ? <Text style={[styles.entryNotes, { color: colors.secondary }]}>{item.notes}</Text> : null}</View></View>
              <View style={styles.entryActions}><Pressable onPress={() => editEntry(item)}><Text style={[styles.actionText, { color: colors.brand }]}>Edit</Text></Pressable><Pressable onPress={() => deleteEntry(item._id)}><Text style={styles.deleteText}>Delete</Text></Pressable></View>
            </View>
          )}
        />
      </KeyboardAvoidingView>
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
  safeArea: { flex: 1 }, container: { flex: 1 }, content: { padding: 20, paddingBottom: 36 }, title: { fontSize: 28, fontWeight: '800' }, subtitle: { marginTop: 4, marginBottom: 18, fontSize: 14 }, form: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 24 }, label: { fontWeight: '700', marginBottom: 8, marginTop: 10 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center' }, emoji: { fontSize: 22 }, chipText: { fontSize: 12, fontWeight: '600', marginTop: 2 }, input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 }, textArea: { minHeight: 74, textAlignVertical: 'top' }, error: { color: '#BA1A1A', marginTop: 10 }, actions: { flexDirection: 'row', gap: 10, marginTop: 16 }, primaryButton: { borderRadius: 10, padding: 13, alignItems: 'center', flex: 1 }, primaryText: { color: '#fff', fontWeight: '700' }, secondaryButton: { borderWidth: 1, borderRadius: 10, padding: 13, alignItems: 'center' }, secondaryText: { fontWeight: '700' }, sectionTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 }, empty: { textAlign: 'center', padding: 24 }, entry: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 }, entryMain: { flexDirection: 'row', gap: 12 }, entryEmoji: { fontSize: 30 }, entryMood: { fontSize: 16, fontWeight: '800', textTransform: 'capitalize' }, entryDate: { fontSize: 12, marginTop: 3 }, entryNotes: { fontSize: 13, marginTop: 8 }, entryActions: { flexDirection: 'row', gap: 18, marginTop: 12, justifyContent: 'flex-end' }, actionText: { fontWeight: '700' }, deleteText: { color: '#BA1A1A', fontWeight: '700' },
});
