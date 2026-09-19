import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AchievementItem } from '@/services/api';
import { GOAL_BRAND, achievementIcon } from '@/constants/goals';

type Props = {
  catalog: AchievementItem[];
};

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  flame: 'flame',
  trophy: 'trophy',
  star: 'star',
  walk: 'walk',
  ribbon: 'ribbon',
};

export function AchievementsPanel({ catalog }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const unlocked = catalog.filter((item) => item.unlocked);
  const locked = catalog.filter((item) => !item.unlocked);

  return (
    <View style={[styles.page, wide && styles.pageWide]}>
      <Text style={styles.heading}>Milestones</Text>
      {unlocked.map((item) => (
        <View key={item.key} style={styles.card}>
          <View style={styles.icon}>
            <Ionicons name={ICON_MAP[achievementIcon(item.key)]} size={22} color={GOAL_BRAND} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.copy}>{item.description}</Text>
          </View>
        </View>
      ))}
      {unlocked.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.copy}>Complete a goal or keep a streak to unlock your first milestone.</Text>
        </View>
      ) : null}

      {locked.length ? <Text style={styles.lockedLabel}>Still ahead</Text> : null}
      {locked.map((item) => (
        <View key={item.key} style={[styles.card, styles.lockedCard]}>
          <View style={[styles.icon, styles.lockedIcon]}>
            <Ionicons name={ICON_MAP[achievementIcon(item.key)]} size={22} color="#9AA3AD" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: '#6B7380' }]}>{item.title}</Text>
            <Text style={styles.copy}>{item.description}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28 },
  pageWide: { maxWidth: 720, width: '100%', alignSelf: 'center' },
  heading: { fontSize: 22, fontWeight: '800', color: '#1C242C', marginBottom: 14 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E7ECF1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  lockedCard: { opacity: 0.78 },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E7F1F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedIcon: { backgroundColor: '#EEF1F4' },
  title: { fontSize: 16, fontWeight: '800', color: '#1C242C' },
  copy: { color: '#6B7380', marginTop: 4 },
  lockedLabel: { marginTop: 10, marginBottom: 8, fontWeight: '800', color: '#7A828C', letterSpacing: 0.6 },
});
