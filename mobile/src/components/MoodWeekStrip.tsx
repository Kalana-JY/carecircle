import React, { useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND, moodEmoji, stampFromDate, todayStamp } from '@/constants/moods';

export type DayMood = {
  stamp: string;
  label: string;
  day: number;
  isToday: boolean;
  mood?: string;
  count: number;
};

type Props = {
  days: DayMood[];
  onOpenCalendar?: () => void;
  onSelectDay?: (stamp: string) => void;
};

export function buildRecentDays(latestByDay: Map<string, { mood: string; count: number }>, length = 7): DayMood[] {
  const days: DayMood[] = [];
  for (let offset = length - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const stamp = stampFromDate(date);
    const info = latestByDay.get(stamp);
    days.push({
      stamp,
      label: date.toLocaleDateString('en-US', { weekday: 'narrow' }),
      day: date.getDate(),
      isToday: stamp === todayStamp(),
      mood: info?.mood,
      count: info?.count || 0,
    });
  }
  return days;
}

export function MoodWeekStrip({ days, onOpenCalendar, onSelectDay }: Props) {
  const scroller = useRef<ScrollView>(null);

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>Mood history</Text>
        <View style={styles.actions}>
          <Text style={styles.link}>Last 7 days</Text>
          {onOpenCalendar ? (
            <TouchableOpacity onPress={onOpenCalendar} style={styles.calBtn} accessibilityLabel="Open mood calendar">
              <Ionicons name="calendar" size={20} color={BRAND} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
      >
        {days.map((day) => (
          <TouchableOpacity
            key={day.stamp}
            style={styles.item}
            onPress={() => (onSelectDay ? onSelectDay(day.stamp) : onOpenCalendar?.())}
            activeOpacity={0.85}
          >
            <Text style={[styles.dow, day.isToday && styles.dowToday]}>{day.label}</Text>
            <View style={[styles.circle, day.mood && styles.circleMood, day.isToday && styles.circleToday]}>
              {day.mood ? (
                <Text style={styles.emoji}>{moodEmoji(day.mood)}</Text>
              ) : (
                <Text style={[styles.date, day.isToday && styles.dateToday]}>{day.day}</Text>
              )}
              {day.count > 1 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{day.count}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.caption, day.isToday && styles.dowToday]}>{day.day}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#1C242C' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  link: { color: BRAND, fontWeight: '800', fontSize: 12 },
  calBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E7F1F8', alignItems: 'center', justifyContent: 'center' },
  row: { gap: 8, paddingBottom: 8, flexDirection: 'row' },
  item: { alignItems: 'center', width: 52 },
  dow: { fontSize: 12, color: '#8B949E', fontWeight: '800', marginBottom: 6 },
  dowToday: { color: BRAND },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8EDF2',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleMood: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CDE0EE',
  },
  circleToday: {
    borderWidth: 2.5,
    borderColor: BRAND,
    backgroundColor: '#FFFFFF',
  },
  emoji: { fontSize: 26, lineHeight: 32 },
  date: { fontSize: 15, fontWeight: '800', color: '#5E6770' },
  dateToday: { color: BRAND },
  caption: { marginTop: 6, fontSize: 11, fontWeight: '700', color: '#8B949E' },
  badge: {
    position: 'absolute',
    right: -2,
    top: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
});
