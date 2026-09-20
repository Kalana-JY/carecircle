import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/constants/moods';

export const MOOD_SCORE_MAX = 5;

const POSITIVE = '#3E8E7E';
const NEUTRAL = '#E0A458';
const NEGATIVE = '#C4453C';
const EMPTY = '#D8DEE5';

export const scoreColor = (score: number) => {
  if (!score) return EMPTY;
  if (score >= 4) return POSITIVE;
  if (score <= 2) return NEGATIVE;
  return NEUTRAL;
};

export const scoreLabel = (score: number) => {
  if (!score) return 'No entries';
  if (score >= 4.5) return 'Very positive';
  if (score >= 3.5) return 'Positive';
  if (score >= 2.5) return 'Mixed';
  if (score >= 1.5) return 'Low';
  return 'Very low';
};

export type ChartPoint = {
  key: string;
  label: string;
  value: number;
  caption?: string;
  highlight?: boolean;
};

type BarChartProps = {
  points: ChartPoint[];
  height?: number;
  scrollable?: boolean;
  emptyText?: string;
};

/**
 * A dependency-free bar chart for the 1-5 mood scale. Bars with no data render
 * as a flat track so gaps in logging stay visible rather than disappearing.
 */
export function MoodBarChart({
  points,
  height = 132,
  scrollable = false,
  emptyText = 'No mood entries in this period yet.',
}: BarChartProps) {
  if (points.length === 0) {
    return <Text style={styles.empty}>{emptyText}</Text>;
  }

  const hasData = points.some((point) => point.value > 0);

  const bars = (
    <View style={[styles.barRow, { height }]}>
      {points.map((point) => {
        const ratio = Math.max(0, Math.min(1, point.value / MOOD_SCORE_MAX));
        const barHeight = point.value > 0 ? Math.max(6, ratio * (height - 34)) : 4;

        return (
          <View key={point.key} style={[styles.barColumn, scrollable && styles.barColumnFixed]}>
            <Text style={styles.barValue}>{point.value > 0 ? point.value.toFixed(1) : '–'}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: scoreColor(point.value),
                    opacity: point.highlight === false ? 0.55 : 1,
                  },
                ]}
              />
            </View>
            <Text style={[styles.barLabel, point.highlight && styles.barLabelActive]} numberOfLines={1}>
              {point.label}
            </Text>
            {point.caption ? (
              <Text style={styles.barCaption} numberOfLines={1}>
                {point.caption}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );

  return (
    <View>
      {scrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {bars}
        </ScrollView>
      ) : (
        bars
      )}
      {!hasData ? <Text style={styles.empty}>{emptyText}</Text> : null}
    </View>
  );
}

type DeltaPillProps = {
  value: number;
  suffix?: string;
  /** Set when a lower number is the better outcome. */
  invert?: boolean;
};

export function DeltaPill({ value, suffix = '', invert = false }: DeltaPillProps) {
  const positive = invert ? value < 0 : value > 0;
  const tint = value === 0 ? '#6B7380' : positive ? POSITIVE : NEGATIVE;
  const icon = value === 0 ? 'remove' : positive ? 'arrow-up' : 'arrow-down';

  return (
    <View style={[styles.pill, { backgroundColor: `${tint}1A` }]}>
      <Ionicons name={icon} size={12} color={tint} />
      <Text style={[styles.pillText, { color: tint }]}>
        {value > 0 ? '+' : ''}
        {value}
        {suffix}
      </Text>
    </View>
  );
}

/** Horizontal share bar showing the positive / neutral / negative split. */
export function ValenceBar({
  positive,
  neutral,
  negative,
}: {
  positive: number;
  neutral: number;
  negative: number;
}) {
  const total = positive + neutral + negative;

  if (total === 0) return null;

  const segments = [
    { key: 'positive', count: positive, color: POSITIVE },
    { key: 'neutral', count: neutral, color: NEUTRAL },
    { key: 'negative', count: negative, color: NEGATIVE },
  ].filter((segment) => segment.count > 0);

  return (
    <View>
      <View style={styles.valenceTrack}>
        {segments.map((segment) => (
          <View
            key={segment.key}
            style={{
              flex: segment.count,
              backgroundColor: segment.color,
            }}
          />
        ))}
      </View>
      <View style={styles.legendRow}>
        {segments.map((segment) => (
          <View key={segment.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
            <Text style={styles.legendText}>
              {segment.key} {Math.round((segment.count / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function InsightList({ insights }: { insights: string[] }) {
  if (!insights?.length) return null;

  return (
    <View style={styles.insightWrap}>
      {insights.map((insight) => (
        <View key={insight} style={styles.insightRow}>
          <Ionicons name="sparkles-outline" size={15} color={BRAND} style={styles.insightIcon} />
          <Text style={styles.insightText}>{insight}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  barRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barColumnFixed: { flex: 0, width: 58 },
  barTrack: { justifyContent: 'flex-end', flex: 1, width: '100%', alignItems: 'center' },
  bar: { width: '70%', borderRadius: 6, minHeight: 4 },
  barValue: { fontSize: 10, fontWeight: '800', color: '#5E6770', marginBottom: 4 },
  barLabel: { fontSize: 10, color: '#7A828C', fontWeight: '700', marginTop: 6 },
  barLabelActive: { color: BRAND, fontWeight: '800' },
  barCaption: { fontSize: 9, color: '#9AA2AC', fontWeight: '600', marginTop: 1 },
  empty: { color: '#7A828C', textAlign: 'center', paddingVertical: 14, fontSize: 13 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pillText: { fontSize: 12, fontWeight: '800' },
  valenceTrack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: EMPTY,
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#6B7380', fontWeight: '700', textTransform: 'capitalize' },
  insightWrap: { gap: 10 },
  insightRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  insightIcon: { marginTop: 2 },
  insightText: { flex: 1, color: '#3F4750', fontSize: 13, lineHeight: 19 },
});
