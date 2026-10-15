import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { GoalItem, GoalReminder, goalApi } from '@/services/api';
import { GOAL_BRAND } from '@/constants/goals';

type Choice = 'deadline' | 'daily' | 'weekly' | 'off';
const choices: { key: Choice; title: string; detail: string }[] = [
  { key: 'deadline', title: 'Before the deadline', detail: 'One gentle nudge, one day before your goal is due.' },
  { key: 'daily', title: 'Every day', detail: 'Make a little time for your goal each day.' },
  { key: 'weekly', title: 'Every week', detail: 'A weekly check-in, starting at the next chosen time.' },
  { key: 'off', title: 'No reminders', detail: 'Work at your own pace.' },
];

export function GoalReminderEditor({ goal, onClose, onSaved }: {
  goal: GoalItem; onClose: () => void; onSaved: (message: string) => void;
}) {
  const [choice, setChoice] = useState<Choice>('deadline');
  const [time, setTime] = useState('20:00');
  const [existing, setExisting] = useState<GoalReminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    let active = true;
    goalApi.getReminder(goal._id).then(({ data }) => {
      if (!active) return;
      setExisting(data);
      setChoice(data.frequency === 'once' ? 'deadline' : data.frequency === 'weekly' ? 'weekly' : 'daily');
      const when = new Date(data.remindAt);
      setTime(`${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`);
    }).catch((err) => {
      if (active && err.status !== 404) {
        setLoadFailed(true);
        setError(err.message || 'Could not load the reminder. Close and try again.');
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [goal._id]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      if (choice === 'off') {
        if (existing) await goalApi.cancelReminder(goal._id);
        onSaved('Reminders are off for this goal.');
        return;
      }
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Enter a valid time in 24-hour format, such as 20:00.');
      const [hour, minute] = time.split(':').map(Number);
      let when = new Date();
      if (choice === 'deadline') {
        if (!goal.deadline) throw new Error('Add a goal deadline before choosing a deadline reminder.');
        const dateKey = goal.deadline.slice(0, 10);
        when = new Date(`${dateKey}T12:00:00`);
        when.setDate(when.getDate() - 1);
      }
      when.setHours(hour, minute, 0, 0);
      if (choice !== 'deadline' && when.getTime() <= Date.now()) when.setDate(when.getDate() + 1);
      if (when.getTime() <= Date.now()) throw new Error('The day before this deadline has already passed. Choose daily or weekly, or extend the deadline.');
      const payload = {
        remindAt: when.toISOString(),
        frequency: choice === 'deadline' ? 'once' : choice,
        message: `A small step counts. Take a moment for ${goal.title}.`,
      };
      const result = existing ? await goalApi.updateReminder(goal._id, payload) : await goalApi.createReminder(goal._id, payload);
      setExisting(result.data);
      onSaved(`Reminder saved: ${choice === 'deadline' ? 'one day before the deadline' : choice === 'daily' ? 'daily' : 'weekly'} at ${time}. Next: ${when.toLocaleDateString()}.`);
    } catch (err: any) {
      setError(err.message || 'Could not save. Please try again.');
    } finally { setSaving(false); }
  };

  return <View style={styles.panel}>
    <Text accessibilityRole="header" style={styles.heading}>A little encouragement</Text>
    <Text style={styles.copy}>Choose a reminder that fits your routine.</Text>
    {loading ? <Text style={styles.copy}>Loading reminder…</Text> : <>
      {choices.map(item => <TouchableOpacity key={item.key} accessibilityRole="radio" accessibilityState={{ checked: choice === item.key }} disabled={saving} onPress={() => setChoice(item.key)} style={[styles.option, choice === item.key && styles.selected]}>
        <Text style={styles.title}>{choice === item.key ? '●' : '○'}  {item.title}</Text>
        <Text style={styles.copy}>{item.detail}</Text>
      </TouchableOpacity>)}
      {choice !== 'off' ? <>
        <Text style={styles.title}>Your local time (24-hour)</Text>
        <TextInput accessibilityLabel="Reminder time in 24-hour format" value={time} onChangeText={setTime} placeholder="20:00" maxLength={5} editable={!saving} style={styles.input} />
      </> : null}
      <Text style={styles.copy}>Reminders appear in the app’s notifications when it checks for updates.</Text>
    </>}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <View style={styles.actions}>
      <TouchableOpacity accessibilityRole="button" disabled={loading || saving || loadFailed} onPress={save} style={[styles.save, (loading || saving || loadFailed) && { opacity: 0.5 }]}><Text style={styles.saveText}>{saving ? 'Saving…' : 'Save reminder'}</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={onClose} style={styles.cancel}><Text style={styles.title}>Close</Text></TouchableOpacity>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  panel: { padding: 14, marginTop: 14, backgroundColor: '#F0F7FB', borderRadius: 14, borderWidth: 1, borderColor: '#C8DFEC' },
  heading: { fontSize: 17, fontWeight: '800', color: '#203746' },
  copy: { fontSize: 12, lineHeight: 18, color: '#536575', marginTop: 4 },
  title: { fontSize: 13, fontWeight: '700', color: '#203746' },
  option: { borderWidth: 1, borderColor: '#DCE5EB', backgroundColor: '#FFFFFF', padding: 12, marginVertical: 4, borderRadius: 10, minHeight: 48 },
  selected: { borderColor: GOAL_BRAND, backgroundColor: '#E7F2FA' },
  input: { marginVertical: 8, minHeight: 44, padding: 12, borderWidth: 1, borderColor: '#B9CCD8', borderRadius: 10, backgroundColor: '#FFFFFF', color: '#203746' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  save: { minHeight: 44, padding: 12, borderRadius: 10, backgroundColor: GOAL_BRAND, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '700' },
  cancel: { minHeight: 44, padding: 12, justifyContent: 'center' },
  error: { color: '#A32121', marginTop: 8, lineHeight: 18 },
});
