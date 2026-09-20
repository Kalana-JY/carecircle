import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moodInsightsApi, type MoodHistoryResponse } from '@/services/api';
import { BRAND, formatLongDate, moodEmoji, shortMonth } from '@/constants/moods';
import { MoodBarChart, ValenceBar, scoreColor, scoreLabel } from '@/components/MoodCharts';
import { panelStyles as s } from './panelStyles';

const RANGES = [
  { key: 7, label: '7 days' },
  { key: 30, label: '30 days' },
  { key: 90, label: '90 days' },
];

const PAGE_SIZE = 10;

const startKeyFor = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));
  return date.toISOString().slice(0, 10);
};

/** US-21 - the emotional journey: what was logged, when, and how it trended. */
export function MoodHistoryPanel() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<MoodHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const response = await moodInsightsApi.history({ start: startKeyFor(days), limit: 200 });
        if (!active) return;
        setData(response);
        setVisible(PAGE_SIZE);
        setError(null);
      } catch (loadError: any) {
        if (active) setError(loadError.message || 'Unable to load your mood history.');
      } finally {
        if (active) setLoading(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [days]);

  // A long range would squeeze the bars flat, so only recent days are charted.
  const chartPoints = useMemo(() => {
    if (!data) return [];
    return data.timeline.slice(-14).map((day) => ({
      key: day.date,
      label: day.date.slice(8, 10),
      value: day.averageScore,
      caption: day.dayOfWeek.slice(0, 3),
    }));
  }, [data]);

  if (loading && !data) {
    return <ActivityIndicator style={styles.loader} color={BRAND} />;
  }

  return (
    <View style={s.section}>
      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={s.chipRow}>
        {RANGES.map((range) => (
          <TouchableOpacity
            key={range.key}
            onPress={() => setDays(range.key)}
            style={[s.chip, days === range.key && s.chipActive]}
            activeOpacity={0.85}
          >
            <Text style={[s.chipText, days === range.key && s.chipTextActive]}>{range.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[s.card, styles.spacedTop]}>
        <View style={s.cardHeader}>
          <View>
            <Text style={s.cardTitle}>Your emotional journey</Text>
            <Text style={s.cardSubtitle}>Last {days} days</Text>
          </View>
          <View style={styles.scorePill}>
            <Text style={[styles.scoreValue, { color: scoreColor(data?.summary.averageScore || 0) }]}>
              {data?.summary.averageScore?.toFixed(1) ?? '0.0'}
            </Text>
            <Text style={s.statUnit}>/ 5</Text>
          </View>
        </View>

        <Text style={[s.muted, styles.scoreCaption]}>{scoreLabel(data?.summary.averageScore || 0)}</Text>

        <View style={s.statGrid}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Entries</Text>
            <Text style={s.statValue}>{data?.summary.entryCount ?? 0}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Most felt</Text>
            <Text style={s.statValue}>
              {moodEmoji(data?.summary.dominantMood?.mood)} {data?.summary.dominantMood?.mood ?? '–'}
            </Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Best day</Text>
            <Text style={s.statValue}>{data?.summary.highestScore || '–'}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Hardest day</Text>
            <Text style={s.statValue}>{data?.summary.lowestScore || '–'}</Text>
          </View>
        </View>

        {data?.summary.entryCount ? (
          <>
            <View style={s.divider} />
            <ValenceBar
              positive={data.summary.valence.positive}
              neutral={data.summary.valence.neutral}
              negative={data.summary.valence.negative}
            />
          </>
        ) : null}
      </View>

      <View style={s.card}>
        <Text style={[s.cardTitle, styles.chartTitle]}>Recent daily average</Text>
        <MoodBarChart points={chartPoints} emptyText="No entries in this range yet." />
      </View>

      <View style={s.card}>
        <Text style={[s.cardTitle, styles.chartTitle]}>All entries</Text>
        {data?.items.slice(0, visible).map((entry) => (
          <View key={entry._id} style={s.listRow}>
            <View style={[styles.dateChip, { backgroundColor: scoreColor(entry.score) }]}>
              <Text style={styles.dateChipText}>{shortMonth(entry.date)}</Text>
            </View>
            <View style={s.flex1}>
              <Text style={s.listTitle}>
                {moodEmoji(entry.mood)} {entry.mood}
              </Text>
              {entry.notes ? (
                <Text style={styles.notes} numberOfLines={2}>
                  {entry.notes}
                </Text>
              ) : null}
              <Text style={s.listMeta}>{formatLongDate(entry.date)}</Text>
            </View>
            <Text style={[styles.entryScore, { color: scoreColor(entry.score) }]}>{entry.score}</Text>
          </View>
        ))}

        {!data?.items.length ? (
          <Text style={s.empty}>No mood entries yet. Log how you feel to start your history.</Text>
        ) : null}

        {data && visible < data.items.length ? (
          <TouchableOpacity onPress={() => setVisible((current) => current + PAGE_SIZE)} style={styles.moreButton}>
            <Text style={styles.moreText}>Show {Math.min(PAGE_SIZE, data.items.length - visible)} more</Text>
            <Ionicons name="chevron-down" size={16} color={BRAND} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  spacedTop: { marginTop: 14 },
  scorePill: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  scoreValue: { fontSize: 30, fontWeight: '800' },
  scoreCaption: { marginTop: -8, marginBottom: 4 },
  chartTitle: { marginBottom: 14 },
  dateChip: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  dateChipText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  notes: { color: '#5E6770', fontSize: 12, marginTop: 3, lineHeight: 17 },
  entryScore: { fontSize: 17, fontWeight: '800' },
  moreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 12 },
  moreText: { color: BRAND, fontWeight: '800', fontSize: 13 },
});
