import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  moodInsightsApi,
  type MoodComparison,
  type MoodMonthlyTrends,
  type MoodTrendDirection,
  type MoodWeeklyTrends,
} from '@/services/api';
import { BRAND, moodEmoji } from '@/constants/moods';
import { DeltaPill, MoodBarChart, scoreColor, scoreLabel } from '@/components/MoodCharts';
import { panelStyles as s } from './panelStyles';

type Scope = 'weekly' | 'monthly';

const TREND_COPY: Record<MoodTrendDirection['direction'], { label: string; icon: string; tint: string }> = {
  improving: { label: 'Trending up', icon: 'trending-up', tint: '#3E8E7E' },
  declining: { label: 'Trending down', icon: 'trending-down', tint: '#C4453C' },
  stable: { label: 'Holding steady', icon: 'remove-outline', tint: '#E0A458' },
  insufficient_data: { label: 'Need more entries', icon: 'ellipsis-horizontal', tint: '#8B949E' },
};

function TrendBanner({ trend, comparison }: { trend: MoodTrendDirection; comparison: MoodComparison | null }) {
  const copy = TREND_COPY[trend.direction];

  return (
    <View style={[styles.banner, { backgroundColor: `${copy.tint}14`, borderColor: `${copy.tint}40` }]}>
      <View style={styles.bannerTop}>
        <Text style={[styles.bannerLabel, { color: copy.tint }]}>{copy.label}</Text>
        {comparison ? <DeltaPill value={comparison.scoreDelta} /> : null}
      </View>
      <Text style={styles.bannerBody}>
        {comparison?.message || 'Keep logging to build a clearer picture of your wellbeing.'}
      </Text>
    </View>
  );
}

/** US-22 and US-23 - short-term weekly patterns and long-term monthly wellbeing. */
export function MoodTrendsPanel() {
  const [scope, setScope] = useState<Scope>('weekly');
  const [weekly, setWeekly] = useState<MoodWeeklyTrends | null>(null);
  const [monthly, setMonthly] = useState<MoodMonthlyTrends | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        if (scope === 'weekly') {
          const response = await moodInsightsApi.weekly(6);
          if (active) setWeekly(response);
        } else {
          const response = await moodInsightsApi.monthly(6);
          if (active) setMonthly(response);
        }
        if (active) setError(null);
      } catch (loadError: any) {
        if (active) setError(loadError.message || 'Unable to load your mood trends.');
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [scope]);

  const weekPoints = useMemo(
    () =>
      (weekly?.weeks || []).map((week) => ({
        key: week.weekStart,
        label: week.weekStart.slice(5).replace('-', '/'),
        value: week.averageScore,
        caption: `${week.entryCount} logs`,
        highlight: week.isCurrentWeek,
      })),
    [weekly]
  );

  const dayPoints = useMemo(
    () =>
      (weekly?.thisWeek.days || []).map((day) => ({
        key: day.date,
        label: day.dayOfWeek.slice(0, 3),
        value: day.averageScore,
      })),
    [weekly]
  );

  const monthPoints = useMemo(
    () =>
      (monthly?.months || []).map((month) => ({
        key: month.month,
        label: month.label.split(' ')[0].slice(0, 3),
        value: month.averageScore,
        caption: `${month.daysLogged}d`,
        highlight: month.isCurrentMonth,
      })),
    [monthly]
  );

  const active = scope === 'weekly' ? weekly : monthly;

  return (
    <View style={s.section}>
      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={s.chipRow}>
        <TouchableOpacity
          onPress={() => setScope('weekly')}
          style={[s.chip, scope === 'weekly' && s.chipActive]}
          activeOpacity={0.85}
        >
          <Text style={[s.chipText, scope === 'weekly' && s.chipTextActive]}>Weekly</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setScope('monthly')}
          style={[s.chip, scope === 'monthly' && s.chipActive]}
          activeOpacity={0.85}
        >
          <Text style={[s.chipText, scope === 'monthly' && s.chipTextActive]}>Monthly</Text>
        </TouchableOpacity>
      </View>

      {!active && !error ? <ActivityIndicator style={styles.loader} color={BRAND} /> : null}

      {scope === 'weekly' && weekly ? (
        <>
          <View style={styles.spacedTop}>
            <TrendBanner trend={weekly.trend} comparison={weekly.weekOverWeek} />
          </View>

          <View style={s.card}>
            <View style={s.cardHeader}>
              <View>
                <Text style={s.cardTitle}>This week</Text>
                <Text style={s.cardSubtitle}>
                  {weekly.thisWeek.weekStart} to {weekly.thisWeek.weekEnd}
                </Text>
              </View>
              <Text style={[styles.headlineScore, { color: scoreColor(weekly.thisWeek.averageScore) }]}>
                {weekly.thisWeek.averageScore.toFixed(1)}
              </Text>
            </View>
            <MoodBarChart points={dayPoints} emptyText="Nothing logged this week yet." />
            <View style={s.divider} />
            <View style={s.rowBetween}>
              <Text style={s.muted}>
                {weekly.thisWeek.entryCount} entries · {scoreLabel(weekly.thisWeek.averageScore)}
              </Text>
              <Text style={s.muted}>
                {moodEmoji(weekly.thisWeek.dominantMood?.mood)} {weekly.thisWeek.dominantMood?.mood || '–'}
              </Text>
            </View>
          </View>

          <View style={s.card}>
            <Text style={[s.cardTitle, styles.chartTitle]}>Last 6 weeks</Text>
            <MoodBarChart points={weekPoints} scrollable />
          </View>

          {weekly.lastWeek ? (
            <View style={s.card}>
              <Text style={[s.cardTitle, styles.chartTitle]}>Week over week</Text>
              <View style={styles.compareRow}>
                <View style={s.flex1}>
                  <Text style={s.statLabel}>This week</Text>
                  <Text style={s.statValue}>{weekly.thisWeek.averageScore.toFixed(1)}</Text>
                  <Text style={s.listMeta}>{weekly.thisWeek.entryCount} entries</Text>
                </View>
                <View style={s.flex1}>
                  <Text style={s.statLabel}>Last week</Text>
                  <Text style={s.statValue}>{weekly.lastWeek.averageScore.toFixed(1)}</Text>
                  <Text style={s.listMeta}>{weekly.lastWeek.entryCount} entries</Text>
                </View>
                <View style={styles.deltaCell}>
                  <Text style={s.statLabel}>Change</Text>
                  <View style={styles.deltaWrap}>
                    <DeltaPill value={weekly.weekOverWeek?.scoreDelta ?? 0} />
                  </View>
                </View>
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      {scope === 'monthly' && monthly ? (
        <>
          <View style={styles.spacedTop}>
            <TrendBanner trend={monthly.trend} comparison={monthly.monthOverMonth} />
          </View>

          <View style={s.card}>
            <Text style={[s.cardTitle, styles.chartTitle]}>Last 6 months</Text>
            <MoodBarChart points={monthPoints} scrollable />
          </View>

          {monthly.months
            .filter((month) => month.entryCount > 0)
            .reverse()
            .map((month) => (
              <View key={month.month} style={s.card}>
                <View style={s.cardHeader}>
                  <View>
                    <Text style={s.cardTitle}>{month.label}</Text>
                    <Text style={s.cardSubtitle}>
                      {month.entryCount} entries across {month.daysLogged} days
                    </Text>
                  </View>
                  <Text style={[styles.headlineScore, { color: scoreColor(month.averageScore) }]}>
                    {month.averageScore.toFixed(1)}
                  </Text>
                </View>
                <View style={s.rowBetween}>
                  <View>
                    <Text style={s.statLabel}>Best day</Text>
                    <Text style={styles.dayValue}>{month.bestDay?.date ?? '–'}</Text>
                  </View>
                  <View>
                    <Text style={s.statLabel}>Hardest day</Text>
                    <Text style={styles.dayValue}>{month.hardestDay?.date ?? '–'}</Text>
                  </View>
                  <View>
                    <Text style={s.statLabel}>Most felt</Text>
                    <Text style={styles.dayValue}>
                      {moodEmoji(month.dominantMood?.mood)} {month.dominantMood?.mood ?? '–'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

          {monthly.months.every((month) => month.entryCount === 0) ? (
            <View style={s.card}>
              <Text style={s.empty}>No monthly data yet. Log moods over a few weeks to see long-term trends.</Text>
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
  banner: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  bannerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  bannerLabel: { fontSize: 14, fontWeight: '800' },
  bannerBody: { color: '#3F4750', fontSize: 13, lineHeight: 19 },
  headlineScore: { fontSize: 26, fontWeight: '800' },
  chartTitle: { marginBottom: 14 },
  compareRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  deltaCell: { width: 78 },
  deltaWrap: { flexDirection: 'row', marginTop: 4 },
  dayValue: { fontSize: 13, fontWeight: '700', color: '#1C242C', marginTop: 3 },
});
