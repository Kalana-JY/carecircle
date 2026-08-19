import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  status: 'approved' | 'reported' | 'removed';
  size?: 'sm' | 'md';
}

const CONFIG = {
  approved: { label: 'Approved', emoji: '✅', color: '#1E9E4F', bg: 'rgba(52, 199, 89, 0.12)' },
  reported: { label: 'Reported', emoji: '🚩', color: '#C77700', bg: 'rgba(255, 149, 0, 0.14)' },
  removed: { label: 'Removed', emoji: '🚫', color: '#93000A', bg: 'rgba(186, 26, 26, 0.10)' },
} as const;

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = CONFIG[status];
  if (!config) return null;

  const isMd = size === 'md';

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, isMd && styles.badgeMd]}>
      <Text style={[styles.emoji, isMd && styles.emojiMd]}>{config.emoji}</Text>
      <Text style={[styles.text, { color: config.color }, isMd && styles.textMd]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  emoji: {
    fontSize: 11,
  },
  emojiMd: {
    fontSize: 13,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
  textMd: {
    fontSize: 12,
  },
});
