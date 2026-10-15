import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MoodBarChart, scoreColor } from '@/components/MoodCharts';
import { BRAND, labelForAverage, moodEmoji, todayStamp } from '@/constants/moods';
import {
  moodInsightsApi,
  moodReportApi,
  wellnessActivityApi,
  type ActivityWeekSummary,
  type MoodPatterns,
  type MoodWeeklyTrends,
} from '@/services/api';
import { saveCsv } from '@/services/download';
import { panelStyles as s } from './panelStyles';

/**
 * Progress overview built from saved moods and ticked wellbeing logs.
 * Activity counts are not treated as a change in mood.
 */
export function MoodProgressDashboard() {
  const [weekly, setWeekly] = useState<MoodWeeklyTrends | null>(null);
  const [patterns, setPatterns] = useState<MoodPatterns | null>(null);
  const [activities, setActivities] = useState<ActivityWeekSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [weekResult, patternResult, activityResult] = await Promise.all([
        moodInsightsApi.weekly(1),
        moodInsightsApi.patterns(),
        wellnessActivityApi.summary(),
      ]);
      setWeekly(weekResult);
      setPatterns(patternResult);
      setActivities(activityResult);
    } catch (loadError: any) {
      setError(loadError.message || 'Unable to load your progress.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const exportCsv = async () => {
    try {
      setExporting(true);
      setExportMessage(null);
      const csv = await moodReportApi.exportCsv();
      const result = await saveCsv(`mood-report-${todayStamp()}.csv`, csv);
      setExportMessage(result.shared ? 'Your CSV report is ready.' : 'Your CSV report was saved on this device.');
    } catch (exportError: any) {
      setExportMessage(exportError.message || 'Unable to export the report.');
    } finally {
      setExporting(false);
    }
  };

  if (loading && !weekly) {
    return <ActivityIndicator style={styles.loader} color={BRAND} accessibilityLabel="Loading progress" />;
  }

  const average = weekly?.thisWeek.averageScore || 0;
  const moodName = labelForAverage(average);
  const streak = weekly?.recordingStreak?.length || 0;
  const dayPoints = (weekly?.thisWeek.days || []).map((day) => ({
    key: day.date,
    label: day.dayOfWeek.slice(0, 3),
    value: day.averageScore,
    caption: day.dominantMood ? moodEmoji(day.dominantMood) : '',
  }));
  const insights = (patterns?.insights || []).slice(0, 3);

  return (
    <View style={s.section}>
      {error ? (
        <View style={styles.bannerError}>
          <Text style={s.error}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retry} accessibilityRole="button" accessibilityLabel="Try loading progress again">
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={s.card}>
        <Text style={s.cardSubtitle}>This week · Monday to Sunday</Text>
        <Text style={styles.moodName} accessibilityRole="header">
          {moodEmoji(moodName)} {moodName}
        </Text>
        <Text style={[styles.scoreLine, { color: scoreColor(average) }]}>
          Average mood {average ? average.toFixed(1) : '0'} out of 5
        </Text>
        <Text style={styles.support}>
          {weekly?.thisWeek.entryCount
            ? `${weekly.thisWeek.entryCount} mood ${weekly.thisWeek.entryCount === 1 ? 'entry' : 'entries'} this week.`
            : 'No mood saved this week yet. Your average will appear after the first entry.'}
        </Text>
      </View>

      <View style={styles.statRow}>
        <View style={[s.card, styles.statCard]} accessibilityLabel={`Mood recording streak, ${streak} days`}>
          <Ionicons name="flame-outline" size={20} color={BRAND} />
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={s.statLabel}>Day streak</Text>
          <Text style={styles.statHint}>{streak ? 'Days in a row with a mood saved' : 'Save a mood to start'}</Text>
        </View>
        <View
          style={[s.card, styles.statCard]}
          accessibilityLabel={`Wellbeing activities, ${activities?.loggedDays || 0} of ${activities?.targetDays || 0} planned days logged`}
        >
          <Ionicons name="leaf-outline" size={20} color="#3E6658" />
          <Text style={styles.statValue}>
            {activities?.loggedDays || 0}
            <Text style={styles.statUnit}>/{activities?.targetDays || 0}</Text>
          </Text>
          <Text style={s.statLabel}>Activity days</Text>
          <Text style={styles.statHint}>Ticked logs only. This does not change your mood score.</Text>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Weekly mood</Text>
        <Text style={s.cardSubtitle}>
          {weekly?.thisWeek.weekStart || 'Monday'} to {weekly?.thisWeek.weekEnd || 'Sunday'}
        </Text>
        <View style={styles.chartGap}>
          <MoodBarChart points={dayPoints} emptyText="Nothing logged from Monday to Sunday yet." />
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>From your records</Text>
        {insights.length === 0 ? (
          <Text style={s.empty}>Insights appear after you save a few moods.</Text>
        ) : (
          insights.map((insight) => (
            <View key={insight} style={styles.insightRow}>
              <Ionicons name="sparkles-outline" size={16} color={BRAND} />
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity
        onPress={exportCsv}
        disabled={exporting}
        style={[s.secondaryButton, exporting && s.disabled]}
        accessibilityRole="button"
        accessibilityLabel="Export mood report as CSV"
        accessibilityState={{ disabled: exporting, busy: exporting }}
      >
        <Ionicons name="download-outline" size={18} color={BRAND} />
        <Text style={s.secondaryText}>{exporting ? 'Preparing CSV...' : 'Export CSV report'}</Text>
      </TouchableOpacity>
      {exportMessage ? <Text style={styles.exportMessage}>{exportMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 28 },
  moodName: { fontSize: 28, fontWeight: '800', color: '#1C242C', marginTop: 6 },
  scoreLine: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  support: { color: '#41474F', fontSize: 14, lineHeight: 22, marginTop: 8 },
  statRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, marginBottom: 16 },
  statValue: { fontSize: 28, fontWeight: '800', color: '#1C242C', marginTop: 8 },
  statUnit: { fontSize: 16, color: '#5E6770', fontWeight: '700' },
  statHint: { color: '#41474F', fontSize: 12, lineHeight: 18, marginTop: 6 },
  chartGap: { marginTop: 12 },
  insightRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'flex-start' },
  insightText: { flex: 1, color: '#1C242C', fontSize: 14, lineHeight: 22 },
  exportMessage: { color: '#1C242C', fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 8 },
  bannerError: { marginBottom: 8 },
  retry: { minHeight: 44, justifyContent: 'center' },
  retryText: { color: BRAND, fontWeight: '800' },
});
