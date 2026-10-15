import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiFetchBytes } from '@/services/api';
import { savePdf } from '@/services/download';

import { Fonts } from '@/constants/theme';

interface SessionReportDownloadModalProps {
  visible: boolean;
  onClose: () => void;
  role: 'member' | 'supporter';
  onSuccess?: () => void;
}

const MONTHS = [
  { num: 1, name: 'Jan' },
  { num: 2, name: 'Feb' },
  { num: 3, name: 'Mar' },
  { num: 4, name: 'Apr' },
  { num: 5, name: 'May' },
  { num: 6, name: 'Jun' },
  { num: 7, name: 'Jul' },
  { num: 8, name: 'Aug' },
  { num: 9, name: 'Sep' },
  { num: 10, name: 'Oct' },
  { num: 11, name: 'Nov' },
  { num: 12, name: 'Dec' },
];

export const SessionReportDownloadModal: React.FC<SessionReportDownloadModalProps> = ({
  visible,
  onClose,
  role,
  onSuccess,
}) => {
  const isDark = useColorScheme() === 'dark';

  const colors = {
    modalBg: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#334155' : '#E2E8F0',
    segmentActive: '#2563EB',
    segmentInactive: isDark ? '#0F172A' : '#F1F5F9',
    chipActive: '#2563EB',
    chipActiveText: '#FFFFFF',
    chipInactive: isDark ? '#0F172A' : '#F8FAFC',
    chipBorder: isDark ? '#334155' : '#CBD5E1',
    brand: '#2563EB',
    backdrop: 'rgba(0, 0, 0, 0.5)',
  };

  const currentDate = new Date();
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [downloading, setDownloading] = useState<boolean>(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const query = `role=${role}&period=${period}&year=${selectedYear}${period === 'monthly' ? `&month=${selectedMonth}` : ''}`;
      const bytes = await apiFetchBytes(`/api/sessions/export-pdf?${query}`);

      const monthName = MONTHS.find((m) => m.num === selectedMonth)?.name || selectedMonth;
      const filename = `carecircle-${role}-sessions-${period === 'monthly' ? `${monthName}-${selectedYear}` : selectedYear}.pdf`;

      await savePdf(filename, bytes);

      onClose();
      if (onSuccess) onSuccess();
      if (Platform.OS !== 'web') {
        // Native share sheet handles feedback
      } else {
        Alert.alert('Report Downloaded', 'Your session report has been downloaded successfully.');
      }
    } catch (error: any) {
      console.error('[SessionReportDownload] Failed to download PDF:', error);
      Alert.alert('Download Failed', error?.message || 'Unable to generate session PDF report.');
    } finally {
      setDownloading(false);
    }
  };

  const modalTitle = role === 'supporter' ? 'Export Session Log' : 'Export Session History';

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.backdrop, { backgroundColor: colors.backdrop }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close modal"
        />

        <View style={[styles.container, { backgroundColor: colors.modalBg, borderColor: colors.border }]}>
          {/* Top Sheet Handle Bar */}
          <View style={[styles.sheetHandle, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
                {modalTitle}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Download a clean, itemized PDF record of your sessions.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Period Selector (Monthly vs Yearly) */}
          <View style={[styles.segmentedWrapper, { backgroundColor: colors.segmentInactive, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.segmentedTab,
                period === 'monthly' && { backgroundColor: colors.segmentActive },
              ]}
              onPress={() => setPeriod('monthly')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentedText,
                  { color: period === 'monthly' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Monthly
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentedTab,
                period === 'yearly' && { backgroundColor: colors.segmentActive },
              ]}
              onPress={() => setPeriod('yearly')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentedText,
                  { color: period === 'yearly' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Yearly
              </Text>
            </TouchableOpacity>
          </View>

          {/* Year Stepper Selector */}
          <View style={styles.yearRow}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Year</Text>
            <View style={[styles.yearControls, { borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setSelectedYear((prev) => prev - 1)}
                style={styles.yearBtn}
                hitSlop={8}
              >
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.yearValue, { color: colors.text }]}>{selectedYear}</Text>
              <TouchableOpacity
                onPress={() => setSelectedYear((prev) => prev + 1)}
                style={styles.yearBtn}
                hitSlop={8}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Month Grid (Shown when period === 'monthly') */}
          {period === 'monthly' && (
            <View style={styles.monthSection}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Month</Text>
              <View style={styles.monthGrid}>
                {MONTHS.map((m) => {
                  const isSelected = selectedMonth === m.num;
                  return (
                    <TouchableOpacity
                      key={m.num}
                      style={[
                        styles.monthChip,
                        {
                          backgroundColor: isSelected ? colors.chipActive : colors.chipInactive,
                          borderColor: isSelected ? colors.chipActive : colors.chipBorder,
                        },
                      ]}
                      onPress={() => setSelectedMonth(m.num)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.monthChipText,
                          { color: isSelected ? colors.chipActiveText : colors.text },
                        ]}
                      >
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {period === 'yearly' && (
            <View style={[styles.infoCard, { backgroundColor: colors.segmentInactive }]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.brand} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Exports all session activity from January 1 to December 31, {selectedYear}.
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={downloading}
            >
              <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.downloadBtn, { backgroundColor: colors.brand }]}
              onPress={handleDownload}
              disabled={downloading}
              activeOpacity={0.85}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Download PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 14,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  closeBtn: {
    padding: 4,
  },
  segmentedWrapper: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentedText: {
    fontSize: 14,
    fontWeight: '700',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  yearControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  yearBtn: {
    padding: 4,
  },
  yearValue: {
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 16,
  },
  monthSection: {
    marginBottom: 18,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  monthChip: {
    width: '23%',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  monthChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 18,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  downloadBtn: {},
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
