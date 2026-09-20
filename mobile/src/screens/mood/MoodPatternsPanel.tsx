import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moodInsightsApi, type MoodCorrelation, type MoodPatterns } from '@/services/api';
import { BRAND } from '@/constants/moods';
import { InsightList, MoodBarChart, scoreColor } from '@/components/MoodCharts';
import { panelStyles as s } from './panelStyles';

function CorrelationRow({ item }: { item: MoodCorrelation }) {
  const lifting = item.impact > 0;
  const tint = lifting ? '#3E8E7E' : '#C4453C';

  return (
    <View style={styles.correlationRow}>
      <View style={[styles.correlationIcon, { backgroundColor: `${tint}1A` }]}>
        <Ionicons name={lifting ? 'arrow-up' : 'arrow-down'} size={15} color={tint} />
      </View>
      <View style={s.flex1}>
        <Text style={styles.correlationLabel}>{item.value}</Text>
        <Text style={s.listMeta}>
          {item.entryCount} {item.entryCount === 1 ? 'entry' : 'entries'} · average {item.averageScore}
        </Text>
      </View>
      <Text style={[styles.impact, { color: tint }]}>
        {item.impact > 0 ? '+' : ''}
        {item.impact}
      </Text>
    </View>
  );
}

function CorrelationCard({
  title,
  subtitle,
  items,
  emptyText,
}: {
  title: string;
  subtitle: string;
  items: MoodCorrelation[];
  emptyText: string;
}) {
  return (
    <View style={s.card}>
      <View style={styles.headingWrap}>
        <Text style={s.cardTitle}>{title}</Text>
        <Text style={s.cardSubtitle}>{subtitle}</Text>
      </View>
      {items.length ? (
        items.map((item) => <CorrelationRow key={item.value} item={item} />)
      ) : (
        <Text style={s.empty}>{emptyText}</Text>
      )}
    </View>
  );
}

/** US-24 - what appears to drive the ups and downs. */
export function MoodPatternsPanel() {
  const [data, setData] = useState<MoodPatterns | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const response = await moodInsightsApi.patterns();
        if (!active) return;
        setData(response);
        setError(null);
      } catch (loadError: any) {
        if (active) setError(loadError.message || 'Unable to analyse your mood patterns.');
      } finally {
        if (active) setLoading(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, []);

  const dayPoints = useMemo(
    () =>
      (data?.byDayOfWeek || []).map((day) => ({
        key: day.dayOfWeek,
        label: day.dayOfWeek.slice(0, 3),
        value: day.averageScore,
        caption: day.entryCount ? `${day.entryCount}` : undefined,
      })),
    [data]
  );

  const bestDay = useMemo(() => {
    const logged = (data?.byDayOfWeek || []).filter((day) => day.entryCount > 0);
    if (logged.length < 2) return null;
    const sorted = [...logged].sort((a, b) => b.averageScore - a.averageScore);
    return { best: sorted[0], worst: sorted[sorted.length - 1] };
  }, [data]);

  if (loading && !data) {
    return <ActivityIndicator style={styles.loader} color={BRAND} />;
  }

  const hasEntries = (data?.summary.entryCount || 0) > 0;

  return (
    <View style={s.section}>
      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={[s.card, styles.spacedTop]}>
        <View style={styles.headingWrap}>
          <Text style={s.cardTitle}>What we noticed</Text>
          <Text style={s.cardSubtitle}>Based on your last 90 days</Text>
        </View>
        {hasEntries ? (
          <InsightList insights={data?.insights || []} />
        ) : (
          <Text style={s.empty}>Log moods with activities and tags to unlock pattern analysis.</Text>
        )}
      </View>

      <View style={s.card}>
        <View style={styles.headingWrap}>
          <Text style={s.cardTitle}>Mood by day of week</Text>
          {bestDay ? (
            <Text style={s.cardSubtitle}>
              {bestDay.best.dayOfWeek} is your strongest, {bestDay.worst.dayOfWeek} the hardest
            </Text>
          ) : (
            <Text style={s.cardSubtitle}>Average score for each weekday</Text>
          )}
        </View>
        <MoodBarChart points={dayPoints} emptyText="Not enough entries to compare weekdays." />
      </View>

      <CorrelationCard
        title="Activities that lift you"
        subtitle="Logged alongside your better moods"
        items={data?.activities.lifting || []}
        emptyText="Add activities when logging a mood to see what helps."
      />

      <CorrelationCard
        title="Activities that drain you"
        subtitle="Logged alongside your lower moods"
        items={data?.activities.draining || []}
        emptyText="Nothing is dragging your mood down right now."
      />

      {(data?.tags.lifting.length || 0) + (data?.tags.draining.length || 0) > 0 ? (
        <View style={s.card}>
          <View style={styles.headingWrap}>
            <Text style={s.cardTitle}>Tags linked to your mood</Text>
            <Text style={s.cardSubtitle}>Themes that show up in your entries</Text>
          </View>
          {[...(data?.tags.lifting || []), ...(data?.tags.draining || [])].map((item) => (
            <CorrelationRow key={item.value} item={item} />
          ))}
        </View>
      ) : null}

      {hasEntries ? (
        <View style={s.card}>
          <View style={styles.headingWrap}>
            <Text style={s.cardTitle}>Streaks</Text>
            <Text style={s.cardSubtitle}>Longest runs of consecutive days</Text>
          </View>
          <View style={s.rowBetween}>
            <View style={styles.streakBox}>
              <Text style={[styles.streakValue, { color: scoreColor(5) }]}>
                {data?.streaks.longestPositive.length ?? 0}
              </Text>
              <Text style={s.statLabel}>Positive days</Text>
              {data?.streaks.longestPositive.start ? (
                <Text style={s.listMeta}>
                  {data.streaks.longestPositive.start} – {data.streaks.longestPositive.end}
                </Text>
              ) : null}
            </View>
            <View style={styles.streakBox}>
              <Text style={[styles.streakValue, { color: scoreColor(1) }]}>
                {data?.streaks.longestNegative.length ?? 0}
              </Text>
              <Text style={s.statLabel}>Low days</Text>
              {data?.streaks.longestNegative.start ? (
                <Text style={s.listMeta}>
                  {data.streaks.longestNegative.start} – {data.streaks.longestNegative.end}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  spacedTop: { marginTop: 14 },
  headingWrap: { marginBottom: 14 },
  correlationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
  },
  correlationIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  correlationLabel: { fontSize: 14, fontWeight: '700', color: '#1C242C', textTransform: 'capitalize' },
  impact: { fontSize: 15, fontWeight: '800' },
  streakBox: { flex: 1 },
  streakValue: { fontSize: 28, fontWeight: '800' },
});
