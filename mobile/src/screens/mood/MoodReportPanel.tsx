import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  moodReportApi,
  type MoodReport,
  type MoodReportShare,
} from '@/services/api';
import { BRAND, moodEmoji } from '@/constants/moods';
import { InsightList, ValenceBar, scoreColor, scoreLabel } from '@/components/MoodCharts';
import { saveCsv, savePdf, shareLink } from '@/services/download';
import { panelStyles as s } from './panelStyles';

const RANGES = [
  { key: 7, label: 'Last 7 days' },
  { key: 30, label: 'Last 30 days' },
  { key: 90, label: 'Last 90 days' },
];

const startKeyFor = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));
  return date.toISOString().slice(0, 10);
};

const notify = (title: string, message: string) => {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
};

const expiryLabel = (value: string) => {
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
  if (days <= 0) return 'Expired';
  return `Expires in ${days} ${days === 1 ? 'day' : 'days'}`;
};

/** US-26 to US-29 - generate, export, and share a mood report. */
export function MoodReportPanel() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<MoodReport | null>(null);
  const [shares, setShares] = useState<MoodReportShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'csv' | 'pdf' | 'share' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [recipientNote, setRecipientNote] = useState('');
  const [includeNotes, setIncludeNotes] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState('7');

  const range = { start: startKeyFor(days) };

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const [summary, shareList] = await Promise.all([
          moodReportApi.summary({ start: startKeyFor(days) }),
          moodReportApi.listShares(),
        ]);
        if (!active) return;
        setReport(summary);
        setShares(shareList.items);
        setError(null);
      } catch (loadError: any) {
        if (active) setError(loadError.message || 'Unable to generate your mood report.');
      } finally {
        if (active) setLoading(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [days]);

  const exportCsv = async () => {
    try {
      setBusy('csv');
      const csv = await moodReportApi.exportCsv(range);
      const result = await saveCsv(`mood-report-${range.start}.csv`, csv);
      if (!result.shared) notify('Saved', `Report saved to ${result.uri}`);
    } catch (exportError: any) {
      notify('Export failed', exportError.message || 'Unable to export the CSV.');
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = async () => {
    try {
      setBusy('pdf');
      const bytes = await moodReportApi.exportPdf(range);
      const result = await savePdf(`mood-report-${range.start}.pdf`, bytes);
      if (!result.shared) notify('Saved', `Report saved to ${result.uri}`);
    } catch (exportError: any) {
      notify('Export failed', exportError.message || 'Unable to export the PDF.');
    } finally {
      setBusy(null);
    }
  };

  const createShare = async () => {
    const expiry = Number(expiresInDays);
    if (!Number.isInteger(expiry) || expiry < 1 || expiry > 90) {
      notify('Check the expiry', 'Choose between 1 and 90 days.');
      return;
    }
    try {
      setBusy('share');
      const created = await moodReportApi.createShare({
        start: range.start,
        expiresInDays: expiry,
        recipientNote: recipientNote.trim() || undefined,
        includeNotes,
      });
      setShareOpen(false);
      setRecipientNote('');
      setIncludeNotes(false);
      setShares((current) => [created.data, ...current]);
      const sent = await shareLink(created.data.shareUrl, 'My CareCircle mood report');
      if (!sent) notify('Link copied', 'The share link is on your clipboard.');
    } catch (shareError: any) {
      notify('Share failed', shareError.message || 'Unable to create a share link.');
    } finally {
      setBusy(null);
    }
  };

  const revoke = async (share: MoodReportShare) => {
    try {
      const updated = await moodReportApi.revokeShare(share._id);
      setShares((current) => current.map((item) => (item._id === share._id ? updated.data : item)));
    } catch (revokeError: any) {
      notify('Could not revoke', revokeError.message || 'Please try again.');
    }
  };

  if (loading && !report) {
    return <ActivityIndicator style={styles.loader} color={BRAND} />;
  }

  return (
    <View style={s.section}>
      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={s.chipRow}>
        {RANGES.map((option) => (
          <TouchableOpacity
            key={option.key}
            onPress={() => setDays(option.key)}
            style={[s.chip, days === option.key && s.chipActive]}
            activeOpacity={0.85}
          >
            <Text style={[s.chipText, days === option.key && s.chipTextActive]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[s.card, styles.spacedTop]}>
        <View style={s.cardHeader}>
          <View style={s.flex1}>
            <Text style={s.cardTitle}>Mood report</Text>
            <Text style={s.cardSubtitle}>
              {report?.range.start} to {report?.range.end}
            </Text>
          </View>
          <Text style={[styles.headlineScore, { color: scoreColor(report?.summary.averageScore || 0) }]}>
            {report?.summary.averageScore?.toFixed(1) ?? '0.0'}
          </Text>
        </View>

        <Text style={s.muted}>{scoreLabel(report?.summary.averageScore || 0)}</Text>

        <View style={s.statGrid}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Entries</Text>
            <Text style={s.statValue}>{report?.summary.entryCount ?? 0}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Positive</Text>
            <Text style={s.statValue}>{report?.summary.positiveRate ?? 0}%</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Most felt</Text>
            <Text style={s.statValue}>
              {moodEmoji(report?.summary.dominantMood?.mood)} {report?.summary.dominantMood?.mood ?? '–'}
            </Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Trend</Text>
            <Text style={s.statValue}>{report?.trend.direction.replace('_', ' ') ?? '–'}</Text>
          </View>
        </View>

        {report?.summary.entryCount ? (
          <>
            <View style={s.divider} />
            <ValenceBar
              positive={report.summary.valence.positive}
              neutral={report.summary.valence.neutral}
              negative={report.summary.valence.negative}
            />
          </>
        ) : null}
      </View>

      {report?.insights.length ? (
        <View style={s.card}>
          <Text style={[s.cardTitle, styles.cardSpacing]}>Highlights</Text>
          <InsightList insights={report.insights} />
        </View>
      ) : null}

      <View style={s.card}>
        <Text style={[s.cardTitle, styles.cardSpacing]}>Export &amp; share</Text>

        <View style={[s.buttonRow, styles.exportRow]}>
          <TouchableOpacity
            onPress={exportPdf}
            disabled={busy !== null}
            style={[s.primaryButton, s.flex1, busy !== null && s.disabled]}
            activeOpacity={0.85}
          >
            {busy === 'pdf' ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="document-text-outline" size={17} color="#FFFFFF" />
            )}
            <Text style={s.primaryText}>PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={exportCsv}
            disabled={busy !== null}
            style={[s.secondaryButton, s.flex1, busy !== null && s.disabled]}
            activeOpacity={0.85}
          >
            {busy === 'csv' ? (
              <ActivityIndicator color={BRAND} size="small" />
            ) : (
              <Ionicons name="grid-outline" size={17} color={BRAND} />
            )}
            <Text style={s.secondaryText}>CSV</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setShareOpen(true)}
          disabled={busy !== null}
          style={[s.secondaryButton, busy !== null && s.disabled]}
          activeOpacity={0.85}
        >
          <Ionicons name="link-outline" size={17} color={BRAND} />
          <Text style={s.secondaryText}>Create share link</Text>
        </TouchableOpacity>

        <Text style={[s.muted, styles.shareHint]}>
          A share link lets a therapist or trusted person open this report without a CareCircle account.
        </Text>
      </View>

      {shares.length ? (
        <View style={s.card}>
          <Text style={[s.cardTitle, styles.cardSpacing]}>Share links</Text>
          {shares.map((share) => (
            <View key={share._id} style={s.listRow}>
              <Ionicons
                name={share.active ? 'link' : 'close-circle-outline'}
                size={18}
                color={share.active ? BRAND : '#9AA2AC'}
              />
              <View style={s.flex1}>
                <Text style={s.listTitle}>
                  {share.range.start} to {share.range.end}
                </Text>
                <Text style={s.listMeta}>
                  {share.active ? expiryLabel(share.expiresAt) : 'Revoked'} · {share.viewCount}{' '}
                  {share.viewCount === 1 ? 'view' : 'views'}
                  {share.includeNotes ? ' · includes notes' : ''}
                </Text>
              </View>
              {share.active ? (
                <>
                  <TouchableOpacity onPress={() => shareLink(share.shareUrl)} hitSlop={8} accessibilityLabel="Send link">
                    <Ionicons name="share-outline" size={18} color={BRAND} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => revoke(share)} hitSlop={8} accessibilityLabel="Revoke link">
                    <Ionicons name="trash-outline" size={18} color="#C4453C" />
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <Modal visible={shareOpen} transparent animationType="slide" onRequestClose={() => setShareOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={s.cardTitle}>Share your report</Text>
              <Text style={[s.cardSubtitle, styles.modalIntro]}>
                Anyone with the link can view this report until it expires. You can revoke it at any time.
              </Text>

              <Text style={s.inputLabel}>Note for the recipient</Text>
              <TextInput
                value={recipientNote}
                onChangeText={setRecipientNote}
                placeholder="e.g. For my therapy session on Friday"
                placeholderTextColor="#8B949E"
                style={s.input}
                maxLength={300}
              />

              <Text style={s.inputLabel}>Link expires after (days)</Text>
              <TextInput
                value={expiresInDays}
                onChangeText={setExpiresInDays}
                keyboardType="number-pad"
                style={s.input}
                maxLength={2}
              />

              <View style={styles.switchRow}>
                <View style={s.flex1}>
                  <Text style={s.listTitle}>Include my written notes</Text>
                  <Text style={s.listMeta}>Off by default to keep private reflections out of the report.</Text>
                </View>
                <Switch
                  value={includeNotes}
                  onValueChange={setIncludeNotes}
                  trackColor={{ true: BRAND, false: '#D8DEE5' }}
                />
              </View>

              <TouchableOpacity
                onPress={createShare}
                disabled={busy === 'share'}
                style={[s.primaryButton, styles.modalAction, busy === 'share' && s.disabled]}
              >
                {busy === 'share' ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                <Text style={s.primaryText}>Create link</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShareOpen(false)} style={s.cancelButton}>
                <Text style={s.muted}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  spacedTop: { marginTop: 14 },
  cardSpacing: { marginBottom: 14 },
  headlineScore: { fontSize: 28, fontWeight: '800' },
  exportRow: { marginBottom: 10 },
  shareHint: { marginTop: 10, lineHeight: 17 },
  modalIntro: { marginTop: 4, lineHeight: 18 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  modalAction: { marginTop: 20 },
});
