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
import { journalApi, JournalEntry } from '@/utils/api';

const today = () => new Date().toISOString().slice(0, 10);

export default function JournalsScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = theme(isDark);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [date, setDate] = useState(today());
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mood, setMood] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      setError(null);
      const response = await journalApi.list();
      setEntries(response.items);
    } catch (loadError: any) {
      setError(loadError.message || 'Unable to load journal entries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const resetForm = () => {
    setDate(today());
    setTitle('');
    setBody('');
    setMood('');
    setEditingId(null);
  };

  const saveEntry = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !body.trim()) {
      setError('Enter a valid date and some journal text.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = { date: new Date(`${date}T12:00:00`).toISOString(), title: title.trim(), body: body.trim(), mood: mood.trim() };
      if (editingId) {
        const updated = await journalApi.update(editingId, payload);
        setEntries((current) => current.map((entry) => entry._id === editingId ? updated : entry));
      } else {
        const created = await journalApi.create(payload);
        setEntries((current) => [created, ...current]);
      }
      resetForm();
    } catch (saveError: any) {
      setError(saveError.message || 'Unable to save journal entry.');
    } finally {
      setSaving(false);
    }
  };

  const editEntry = (entry: JournalEntry) => {
    setEditingId(entry._id);
    setDate(entry.date.slice(0, 10));
    setTitle(entry.title || '');
    setBody(entry.body);
    setMood(entry.mood || '');
  };

  const deleteEntry = (id: string) => {
    const remove = async () => {
      try {
        await journalApi.remove(id);
        setEntries((current) => current.filter((entry) => entry._id !== id));
      } catch (deleteError: any) {
        setError(deleteError.message || 'Unable to delete journal entry.');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this journal entry?')) remove();
    } else {
      Alert.alert('Delete journal entry', 'This record will be removed from your history.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: remove },
      ]);
    }
  };

  const getSaveButtonLabel = () => {
    if (saving) return 'Saving...';
    if (editingId) return 'Update entry';
    return 'Save entry';
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
              <Text style={[styles.title, { color: colors.text }]}>Journal</Text>
              <Text style={[styles.subtitle, { color: colors.secondary }]}>Write freely and keep your reflections in one place.</Text>
              <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.text }]}>Date (YYYY-MM-DD)</Text>
                <TextInput value={date} onChangeText={setDate} placeholder="2026-08-19" placeholderTextColor={colors.secondary} style={[styles.input, { color: colors.text, borderColor: colors.border }]} />
                <Text style={[styles.label, { color: colors.text }]}>Title</Text>
                <TextInput value={title} onChangeText={setTitle} placeholder="A short title" placeholderTextColor={colors.secondary} style={[styles.input, { color: colors.text, borderColor: colors.border }]} />
                <Text style={[styles.label, { color: colors.text }]}>How are you feeling?</Text>
                <TextInput value={mood} onChangeText={setMood} placeholder="Optional mood" placeholderTextColor={colors.secondary} style={[styles.input, { color: colors.text, borderColor: colors.border }]} />
                <Text style={[styles.label, { color: colors.text }]}>Your entry</Text>
                <TextInput value={body} onChangeText={setBody} multiline placeholder="Write about your day..." placeholderTextColor={colors.secondary} style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border }]} />
                {error && <Text style={styles.error}>{error}</Text>}
                <View style={styles.actions}>
                  <Pressable onPress={saveEntry} disabled={saving} style={[styles.primaryButton, { backgroundColor: colors.brand }]}><Text style={styles.primaryText}>{getSaveButtonLabel()}</Text></Pressable>
                  {editingId && <Pressable onPress={resetForm} style={[styles.secondaryButton, { borderColor: colors.border }]}><Text style={[styles.secondaryText, { color: colors.text }]}>Cancel</Text></Pressable>}
                </View>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your entries</Text>
            </View>
          }
          ListEmptyComponent={!loading ? <Text style={[styles.empty, { color: colors.secondary }]}>No journal entries yet.</Text> : null}
          renderItem={({ item }) => (
            <View style={[styles.entry, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.entryTitle, { color: colors.text }]}>{item.title || 'Untitled entry'}</Text>
              <Text style={[styles.entryDate, { color: colors.secondary }]}>{item.date.slice(0, 10)}{item.mood ? ` · ${item.mood}` : ''}</Text>
              <Text style={[styles.entryBody, { color: colors.text }]} numberOfLines={4}>{item.body}</Text>
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
  safeArea: { flex: 1 }, container: { flex: 1 }, content: { padding: 20, paddingBottom: 36 }, title: { fontSize: 28, fontWeight: '800' }, subtitle: { marginTop: 4, marginBottom: 18, fontSize: 14 }, form: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 24 }, label: { fontWeight: '700', marginBottom: 8, marginTop: 10 }, input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 }, textArea: { minHeight: 130, textAlignVertical: 'top' }, error: { color: '#BA1A1A', marginTop: 10 }, actions: { flexDirection: 'row', gap: 10, marginTop: 16 }, primaryButton: { borderRadius: 10, padding: 13, alignItems: 'center', flex: 1 }, primaryText: { color: '#fff', fontWeight: '700' }, secondaryButton: { borderWidth: 1, borderRadius: 10, padding: 13, alignItems: 'center' }, secondaryText: { fontWeight: '700' }, sectionTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 }, empty: { textAlign: 'center', padding: 24 }, entry: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 }, entryTitle: { fontSize: 17, fontWeight: '800' }, entryDate: { fontSize: 12, marginTop: 4 }, entryBody: { fontSize: 14, lineHeight: 21, marginTop: 10 }, entryActions: { flexDirection: 'row', gap: 18, marginTop: 12, justifyContent: 'flex-end' }, actionText: { fontWeight: '700' }, deleteText: { color: '#BA1A1A', fontWeight: '700' },
});
