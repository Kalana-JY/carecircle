import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moodInsightsApi, type MoodProgressComparison, type MoodSummary } from '@/services/api';
import { BRAND, moodEmoji } from '@/constants/moods';
import { DeltaPill, ValenceBar, scoreColor, scoreLabel } from '@/components/MoodCharts';
import { panelStyles as s } from './panelStyles';

const VERDICTS = {
  improved: { label: 'Improving', icon: 'trending-up' as const, tint: '#3E8E7E' },
  declined: { label: 'Needs care', icon: 'trending-down' as const, tint: '#C4453C' },
  stable: { label: 'Steady', icon: 'remove-outline' as const, tint: '#E0A458' },
  insufficient_data: { label: 'Not enough data', icon: 'help-circle-outline' as const, tint: '#8B949E' },
};

function PeriodCard({
  heading,
  summary,
  emphasised,
}: {
  heading: string;
  summary: MoodSummary & { label: string };
  emphasised?: boolean;
}) {
  return (
    <View style={[styles.periodCard, emphasised && styles.periodCardActive]}>
      <Text style={s.statLabel}>{heading}</Text>
      <Text style={[styles.periodScore, { color: scoreColor(summary.averageScore) }]}>
        {summary.averageScore.toFixed(1)}
      </Text>
      <Text style={s.listMeta}>{scoreLabel(summary.averageScore)}</Text>
      <View style={styles.periodMeta}>
        <Text style={s.muted}>{summary.entryCount} entries</Text>
        <Text style={s.muted}>
          {moodEmoji(summary.dominantMood?.mood)} {summary.dominantMood?.mood || '–'}
        </Text>
      </View>
    </View>
  );
}

/** US-25 - is this period better than the last one? */
export function MoodComparePanel() {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [data, setData] = useState<MoodProgressComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const response = await moodInsightsApi.compare(period);
        if (!active) return;
        setData(response);
        setError(null);
      } catch (loadError: any) {
        if (active) setError(loadError.message || 'Unable to compare your mood progress.');
      } finally {
        if (active) setLoading(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [period]);

  const verdict = VERDICTS[data?.comparison.verdict || 'insufficient_data'];

  return (
    <View style={s.section}>
      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={s.chipRow}>
        {(['week', 'month'] as const).map((option) => (
          <TouchableOpacity
            key={option}
            onPress={() => setPeriod(option)}
            style={[s.chip, period === option && s.chipActive]}
            activeOpacity={0.85}
          >
            <Text style={[s.chipText, period === option && s.chipTextActive]}>
              {option === 'week' ? 'This week vs last' : 'This month vs last'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !data ? <ActivityIndicator style={styles.loader} color={BRAND} /> : null}

      {data ? (
        <>
          <View style={[s.card, styles.spacedTop]}>
            <View style={styles.verdictRow}>
              <View style={[styles.verdictIcon, { backgroundColor: `${verdict.tint}1A` }]}>
                <Ionicons name={verdict.icon} size={22} color={verdict.tint} />
              </View>
              <View style={s.flex1}>
                <Text style={[styles.verdictLabel, { color: verdict.tint }]}>{verdict.label}</Text>
                <Text style={styles.verdictBody}>{data.comparison.message}</Text>
              </View>
            </View>

            <View style={s.divider} />

            <View style={styles.periodRow}>
              <PeriodCard heading="Current" summary={data.current} emphasised />
              <PeriodCard heading="Previous" summary={data.previous} />
            </View>
          </View>

          <View style={s.card}>
            <Text style={[s.cardTitle, styles.cardSpacing]}>What changed</Text>

            <View style={styles.metricRow}>
              <View style={s.flex1}>
                <Text style={s.statLabel}>Average score</Text>
                <Text style={s.listMeta}>
                  {data.previous.averageScore.toFixed(1)} → {data.current.averageScore.toFixed(1)}
                </Text>
              </View>
              <DeltaPill value={data.comparison.scoreDelta} />
            </View>

            <View style={styles.metricRow}>
              <View style={s.flex1}>
                <Text style={s.statLabel}>Positive entries</Text>
                <Text style={s.listMeta}>
                  {data.previous.positiveRate}% → {data.current.positiveRate}%
                </Text>
              </View>
              <DeltaPill value={data.comparison.positiveRateDelta} suffix="%" />
            </View>

            <View style={styles.metricRow}>
              <View style={s.flex1}>
                <Text style={s.statLabel}>Entries logged</Text>
                <Text style={s.listMeta}>
                  {data.previous.entryCount} → {data.current.entryCount}
                </Text>
              </View>
              <DeltaPill value={data.comparison.entryDelta} />
            </View>

            <View style={styles.metricRow}>
              <View style={s.flex1}>
                <Text style={s.statLabel}>Mood swing</Text>
                <Text style={s.listMeta}>
                  {data.previous.volatility} → {data.current.volatility}
                </Text>
              </View>
              {/* Less variability is the healthier direction here. */}
              <DeltaPill
                value={Math.round((data.current.volatility - data.previous.volatility) * 100) / 100}
                invert
              />
            </View>
          </View>

          {data.current.entryCount > 0 ? (
            <View style={s.card}>
              <Text style={[s.cardTitle, styles.cardSpacing]}>Current mood mix</Text>
              <ValenceBar
                positive={data.current.valence.positive}
                neutral={data.current.valence.neutral}
                negative={data.current.valence.negative}
              />
              <Text style={[s.muted, styles.rangeNote]}>
                {data.current.range.start} to {data.current.range.end}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  spacedTop: { marginTop: 14 },
  cardSpacing: { marginBottom: 14 },
  verdictRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  verdictIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  verdictLabel: { fontSize: 15, fontWeight: '800' },
  verdictBody: { color: '#3F4750', fontSize: 13, lineHeight: 19, marginTop: 3 },
  periodRow: { flexDirection: 'row', gap: 10 },
  periodCard: {
    flex: 1,
    backgroundColor: '#F7F9FB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EDF1F5',
  },
  periodCardActive: { backgroundColor: '#FFFFFF', borderColor: BRAND },
  periodScore: { fontSize: 26, fontWeight: '800', marginTop: 4 },
  periodMeta: { marginTop: 8, gap: 2 },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EDF1F5',
  },
  rangeNote: { marginTop: 10, textAlign: 'center' },
});
