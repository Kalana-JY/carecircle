import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dateOnly, MoodEntry } from '@/services/api';
import { BRAND, entryTimestamp, formatLongDate, formatTime, moodEmoji, stampFromDate, todayStamp } from '@/constants/moods';

type Props = {
  visible: boolean;
  entries: MoodEntry[];
  onClose: () => void;
  onSelectDay?: (stamp: string) => void;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function MoodCalendarModal({ visible, entries, onClose, onSelectDay }: Props) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(todayStamp());

  const latestByDay = useMemo(() => {
    const map = new Map<string, { mood: string; count: number; latest: MoodEntry }>();
    [...entries]
      .sort((a, b) => entryTimestamp(b) - entryTimestamp(a))
      .forEach((entry) => {
        const key = dateOnly(entry.date);
        const current = map.get(key);
        if (!current) map.set(key, { mood: entry.mood, count: 1, latest: entry });
        else current.count += 1;
      });
    return map;
  }, [entries]);

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const startOffset = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const items: { stamp: string; day: number; inMonth: boolean }[] = [];
    for (let i = 0; i < startOffset; i += 1) {
      const date = new Date(first);
      date.setDate(date.getDate() - (startOffset - i));
      items.push({ stamp: stampFromDate(date), day: date.getDate(), inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      items.push({ stamp: stampFromDate(date), day, inMonth: true });
    }
    while (items.length % 7 !== 0) {
      const last = items[items.length - 1];
      const date = new Date(`${last.stamp}T00:00:00`);
      date.setDate(date.getDate() + 1);
      items.push({ stamp: stampFromDate(date), day: date.getDate(), inMonth: false });
    }
    return items;
  }, [cursor]);

  const selectedEntries = entries
    .filter((entry) => dateOnly(entry.date) === selected)
    .sort((a, b) => entryTimestamp(b) - entryTimestamp(a));

  const today = todayStamp();
  const monthLabel = cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Your mood calendar</Text>
            <TouchableOpacity onPress={onClose} style={styles.iconButton} accessibilityLabel="Close calendar">
              <Ionicons name="close" size={22} color="#5E6770" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Each day shows your most recent check-in. Tap a date to see how the day unfolded.</Text>

          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              style={styles.iconButton}
              accessibilityLabel="Previous month"
            >
              <Ionicons name="chevron-back" size={22} color={BRAND} />
            </TouchableOpacity>
            <Text style={styles.month}>{monthLabel}</Text>
            <TouchableOpacity
              onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              style={styles.iconButton}
              accessibilityLabel="Next month"
            >
              <Ionicons name="chevron-forward" size={22} color={BRAND} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((label, index) => (
              <Text key={`${label}-${index}`} style={styles.weekday}>{label}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((cell) => {
              const info = latestByDay.get(cell.stamp);
              const isToday = cell.stamp === today;
              const isSelected = cell.stamp === selected;
              const isFuture = cell.stamp > today;
              return (
                <Pressable
                  key={cell.stamp + cell.day}
                  onPress={() => {
                    if (!cell.inMonth || isFuture) return;
                    setSelected(cell.stamp);
                    onSelectDay?.(cell.stamp);
                  }}
                  style={[styles.cell, isSelected && styles.cellSelected, !cell.inMonth && styles.cellMuted]}
                >
                  <Text style={[styles.cellDay, isToday && styles.cellToday, !cell.inMonth && styles.muted]}>{cell.day}</Text>
                  <Text style={styles.cellEmoji}>{info && cell.inMonth ? moodEmoji(info.mood) : ' '}</Text>
                  {info && info.count > 1 && cell.inMonth ? <View style={styles.dot} /> : null}
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.dayTitle}>{formatLongDate(selected)}</Text>
          <ScrollView style={styles.dayList} showsVerticalScrollIndicator={false}>
            {selectedEntries.length === 0 ? (
              <Text style={styles.empty}>No check-in on this day yet. A single note is enough whenever you are ready.</Text>
            ) : (
              selectedEntries.map((entry) => (
                <View key={entry._id} style={styles.dayRow}>
                  <Text style={styles.dayEmoji}>{moodEmoji(entry.mood)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dayMood}>{entry.mood}</Text>
                    {entry.notes ? <Text style={styles.dayNotes}>{entry.notes}</Text> : null}
                  </View>
                  <Text style={styles.dayTime}>{formatTime(entry.createdAt || entry.date)}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20, 28, 36, 0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%',
  },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: '#D5DDE4', marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#1C242C' },
  subtitle: { color: '#6B7380', marginTop: 6, marginBottom: 14, lineHeight: 20 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  month: { fontSize: 16, fontWeight: '800', color: '#1C242C' },
  iconButton: { padding: 6 },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', color: '#8B949E', fontWeight: '800', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, minHeight: 54, alignItems: 'center', paddingVertical: 4, borderRadius: 12 },
  cellSelected: { backgroundColor: '#E7F1F8' },
  cellMuted: { opacity: 0.35 },
  cellDay: { fontSize: 12, fontWeight: '700', color: '#5E6770' },
  cellToday: { color: BRAND },
  cellEmoji: { fontSize: 16, marginTop: 2 },
  muted: { color: '#9AA3AB' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: BRAND, marginTop: 2 },
  dayTitle: { fontSize: 16, fontWeight: '800', color: '#1C242C', marginTop: 12, marginBottom: 8 },
  dayList: { maxHeight: 220 },
  dayRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E7ECF1' },
  dayEmoji: { fontSize: 22 },
  dayMood: { fontWeight: '800', color: BRAND },
  dayNotes: { color: '#3F4750', marginTop: 2, lineHeight: 18 },
  dayTime: { color: '#8B949E', fontSize: 12, fontWeight: '700' },
  empty: { color: '#7A828C', lineHeight: 20, paddingVertical: 8 },
});
