import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GOAL_BRAND, fromDisplayDate, toDisplayDate } from '@/constants/goals';

export function InlineGoalCalendar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const parsed = fromDisplayDate(value);
  const initial = parsed ? new Date(`${parsed}T12:00:00`) : new Date();
  const [month, setMonth] = useState(Number.isNaN(initial.getTime()) ? new Date() : initial);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const offset = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Math.ceil((offset + count) / 7) * 7;
  const move = (amount: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + amount, 1));
  return (
    <View style={styles.calendar}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => move(-1)} style={styles.arrow}><Text style={styles.arrowText}>‹</Text></TouchableOpacity>
        <Text accessibilityRole="header" style={styles.heading}>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next month" onPress={() => move(1)} style={styles.arrow}><Text style={styles.arrowText}>›</Text></TouchableOpacity>
      </View>
      <View style={styles.grid}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <View key={day} style={styles.cell}><Text style={styles.muted}>{day}</Text></View>)}
        {Array.from({ length: cells }, (_, index) => {
          const day = index - offset + 1;
          if (day < 1 || day > count) return <View key={index} style={styles.cell} />;
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const disabled = date < today;
          const selected = parsed === key;
          return <TouchableOpacity key={index} accessibilityRole="button" accessibilityLabel={date.toDateString()} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => onChange(toDisplayDate(key))} style={[styles.cell, selected && styles.selected]}><Text style={{ color: disabled ? '#A0A8B2' : selected ? '#FFFFFF' : '#1C242C', fontWeight: selected ? '700' : '400' }}>{day}</Text></TouchableOpacity>;
        })}
      </View>
      <Text style={styles.hint}>Choose today or a future date.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: { width: '100%', marginTop: 8, padding: 8, borderWidth: 1, borderColor: '#DDE3EA', borderRadius: 14, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontWeight: '700', color: '#1C242C' },
  arrow: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  arrowText: { fontSize: 28, color: GOAL_BRAND },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.285714%', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  selected: { backgroundColor: GOAL_BRAND },
  muted: { color: '#667383', fontSize: 12 },
  hint: { color: '#667383', fontSize: 12, padding: 8 },
});
