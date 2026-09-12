import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { dateOnly, wellnessActivityApi, WellnessActivity } from '../../services/api';

const pad = (value: number) => String(value).padStart(2, '0');
const today = () => { const date = new Date(); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; };
const weekStart = () => { const date = new Date(); date.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; };

export default function WellnessActivitiesScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = theme(isDark);
  const [activities, setActivities] = useState<WellnessActivity[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Consistency');
  const [date, setDate] = useState(today());
  const [duration, setDuration] = useState('10');
  const [notes, setNotes] = useState('');
  const [targetPerWeek, setTargetPerWeek] = useState('5');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<WellnessActivity | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = useCallback(async () => {
    try { setActivities((await wellnessActivityApi.list()).items); setError(null); } catch (loadError: any) { setError(loadError.message || 'Unable to load activities.'); }
  }, []);
  useEffect(() => { loadActivities(); }, [loadActivities]);

  const saveActivity = async () => {
    const target = Number(targetPerWeek);
    const minutes = Number(duration);
    if (!title.trim() || !category.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440 || !Number.isInteger(target) || target < 1 || target > 7) { setError('Add a valid title, date, duration, and weekly target.'); return; }
    try {
      const payload = { title: title.trim(), category: category.trim(), date, duration: minutes, notes: notes.trim(), targetPerWeek: target };
      if (editingId) await wellnessActivityApi.update(editingId, payload); else await wellnessActivityApi.create(payload);
      setTitle(''); setCategory('Consistency'); setDate(today()); setDuration('10'); setNotes(''); setTargetPerWeek('5'); setEditingId(null); await loadActivities();
    } catch (saveError: any) { setError(saveError.message || 'Unable to save activity.'); }
  };

  const deleteActivity = (id: string) => {
    const remove = async () => {
      try {
        await wellnessActivityApi.remove(id);
        await loadActivities();
        Alert.alert('Activity deleted', 'The wellness activity was removed from your history.');
      } catch (deleteError: any) { setError(deleteError.message || 'Unable to delete activity.'); }
    };
    Alert.alert('Delete activity', 'This activity and its logs will be removed.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: remove }]);
  };

  const logActivity = async (activity: WellnessActivity) => {
    try { await wellnessActivityApi.log(activity._id, today(), 1); await loadActivities(); } catch (logError: any) { setError(logError.message || 'Unable to log activity.'); }
  };

  const progressFor = (activity: WellnessActivity) => activity.logs.filter((log) => dateOnly(log.date) >= weekStart() && dateOnly(log.date) <= today()).length;
  const resetForm = () => { setTitle(''); setCategory('Consistency'); setDate(today()); setDuration('10'); setNotes(''); setTargetPerWeek('5'); setEditingId(null); setError(null); };

  return <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
    <FlatList
      data={activities}
      keyExtractor={(item) => item._id}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<View><Text style={[styles.date, { color: colors.secondary }]}>{today()}</Text><Text style={[styles.title, { color: colors.text }]}>Wellness activity history</Text><Text style={[styles.subtitle, { color: colors.secondary }]}>{editingId ? 'Edit Wellness Activity' : 'Review your saved habits, newest dates first.'}</Text><View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}><TextInput value={title} onChangeText={setTitle} placeholder="Activity name" placeholderTextColor={colors.secondary} style={[styles.input, { color: colors.text, borderColor: colors.border }]} /><TextInput value={category} onChangeText={setCategory} placeholder="Category" placeholderTextColor={colors.secondary} style={[styles.input, { color: colors.text, borderColor: colors.border }]} /><TextInput value={date} onChangeText={setDate} placeholder="Date (YYYY-MM-DD)" placeholderTextColor={colors.secondary} style={[styles.input, { color: colors.text, borderColor: colors.border }]} /><TextInput value={duration} onChangeText={setDuration} keyboardType="number-pad" placeholder="Duration in minutes" placeholderTextColor={colors.secondary} style={[styles.input, { color: colors.text, borderColor: colors.border }]} /><TextInput value={notes} onChangeText={setNotes} multiline placeholder="Notes (optional)" placeholderTextColor={colors.secondary} style={[styles.input, styles.notesInput, { color: colors.text, borderColor: colors.border }]} /><TextInput value={targetPerWeek} onChangeText={setTargetPerWeek} keyboardType="number-pad" placeholder="Days per week" placeholderTextColor={colors.secondary} style={[styles.input, { color: colors.text, borderColor: colors.border }]} />{error && <Text style={styles.error}>{error}</Text>}<View style={styles.actions}><Pressable onPress={saveActivity} style={[styles.primaryButton, { backgroundColor: colors.brand }]}><Text style={styles.primaryText}>{editingId ? 'Update activity' : '+ New activity'}</Text></Pressable>{editingId && <Pressable onPress={resetForm} style={[styles.cancelButton, { borderColor: colors.border }]}><Text style={{ color: colors.text }}>Cancel</Text></Pressable>}</View></View><Text style={[styles.sectionTitle, { color: colors.text }]}>Saved activities</Text></View>}
      ListEmptyComponent={<Text style={[styles.empty, { color: colors.secondary }]}>Create an activity to start building your routine.</Text>}
      renderItem={({ item }) => { const completed = progressFor(item); const todayLogged = item.logs.some((log) => dateOnly(log.date) === today()); return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.cardHeader}><View style={styles.cardCopy}><Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.badge, { color: colors.secondary }]}>{item.category.toUpperCase()}</Text><Text style={[styles.detail, { color: colors.secondary }]}>{dateOnly(item.date)} · {item.duration} min</Text>{item.notes ? <Text style={[styles.detail, { color: colors.secondary }]} numberOfLines={2}>{item.notes}</Text> : null}</View><View style={styles.iconActions}><Pressable onPress={() => { setEditingId(item._id); setTitle(item.title); setCategory(item.category); setDate(dateOnly(item.date)); setDuration(String(item.duration)); setNotes(item.notes || ''); setTargetPerWeek(String(item.targetPerWeek)); }}><Text style={{ color: colors.secondary }}>Edit</Text></Pressable><Pressable onPress={() => deleteActivity(item._id)}><Text style={styles.delete}>Delete</Text></Pressable></View></View><View style={styles.progressTrack}><View style={[styles.progress, { backgroundColor: colors.brand, width: `${Math.min(100, (completed / item.targetPerWeek) * 100)}%` }]} /></View><View style={styles.progressMeta}><Text style={{ color: colors.secondary }}>{completed} / {item.targetPerWeek} this week</Text><Text style={[styles.percent, { color: colors.text }]}>{Math.round((completed / item.targetPerWeek) * 100)}%</Text></View><View style={styles.cardActions}><Pressable onPress={() => setSelectedActivity(item)}><Text style={[styles.viewDetails, { color: colors.brand }]}>View details</Text></Pressable><Pressable onPress={() => logActivity(item)} disabled={todayLogged} style={[styles.logButton, { borderColor: colors.border }, todayLogged && styles.loggedButton]}><Text style={{ color: todayLogged ? colors.secondary : colors.text }}>{todayLogged ? 'Logged today' : 'Log today'}</Text></Pressable></View></View>; }}
    />
    <Modal visible={selectedActivity !== null} transparent animationType="slide" onRequestClose={() => setSelectedActivity(null)}>
      <View style={styles.modalBackdrop}><View style={[styles.modalCard, { backgroundColor: colors.card }]}><Text style={[styles.modalTitle, { color: colors.text }]}>{selectedActivity?.title}</Text><Text style={[styles.modalCategory, { color: colors.secondary }]}>{selectedActivity?.category.toUpperCase()}</Text><Text style={[styles.modalDetail, { color: colors.text }]}>Date: {selectedActivity ? dateOnly(selectedActivity.date) : ''}</Text><Text style={[styles.modalDetail, { color: colors.text }]}>Duration: {selectedActivity?.duration} minutes</Text><Text style={[styles.modalDetail, { color: colors.text }]}>Notes: {selectedActivity?.notes || 'No notes added.'}</Text><Pressable onPress={() => setSelectedActivity(null)} style={[styles.closeButton, { backgroundColor: colors.brand }]}><Text style={styles.primaryText}>Close</Text></Pressable></View></View>
    </Modal>
  </SafeAreaView>;
}

const theme = (isDark: boolean) => ({ background: isDark ? '#121212' : '#F5F7FA', card: isDark ? '#1E1E1E' : '#FFFFFF', text: isDark ? '#ECEDEE' : '#1C2024', secondary: isDark ? '#9BA1A6' : '#687076', border: isDark ? '#2E2E2E' : '#D4D7D9', brand: '#245B8B' });
const styles = StyleSheet.create({ safeArea: { flex: 1 }, content: { padding: 20, paddingBottom: 40 }, date: { fontSize: 12, fontWeight: '700', marginBottom: 6 }, title: { fontSize: 25, fontWeight: '800' }, subtitle: { fontSize: 14, marginTop: 4, marginBottom: 18 }, form: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 20 }, input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 8 }, notesInput: { minHeight: 64, textAlignVertical: 'top' }, actions: { flexDirection: 'row', gap: 8, marginTop: 4 }, primaryButton: { flex: 1, borderRadius: 8, padding: 12, alignItems: 'center' }, primaryText: { color: '#fff', fontWeight: '800' }, cancelButton: { borderWidth: 1, borderRadius: 8, padding: 12 }, error: { color: '#BA1A1A', marginBottom: 8 }, sectionTitle: { fontSize: 19, fontWeight: '800', marginBottom: 10 }, empty: { textAlign: 'center', padding: 24 }, card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 }, cardHeader: { flexDirection: 'row', justifyContent: 'space-between' }, cardCopy: { flex: 1 }, cardTitle: { fontSize: 15, fontWeight: '800' }, badge: { fontSize: 10, fontWeight: '800', marginTop: 5 }, detail: { fontSize: 12, marginTop: 5 }, iconActions: { flexDirection: 'row', gap: 12 }, delete: { color: '#BA1A1A' }, cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }, viewDetails: { fontWeight: '800' }, progressTrack: { height: 6, borderRadius: 6, backgroundColor: '#E1E3E4', marginTop: 18, overflow: 'hidden' }, progress: { height: 6, borderRadius: 6 }, progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }, percent: { fontWeight: '800' }, logButton: { borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center' }, loggedButton: { opacity: 0.65 }, modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }, modalCard: { padding: 24, borderTopLeftRadius: 18, borderTopRightRadius: 18 }, modalTitle: { fontSize: 22, fontWeight: '800' }, modalCategory: { fontSize: 11, fontWeight: '800', marginTop: 6, marginBottom: 18 }, modalDetail: { fontSize: 15, marginBottom: 12 }, closeButton: { borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 10 } });