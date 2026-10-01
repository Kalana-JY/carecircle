import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { tokenStorage } from '@/services/storage';
import { Fonts } from '@/constants/theme';

interface SessionReminderPreset {
  id: string;
  label: string;
  valueHours: number;
  enabled: boolean;
}

const STORAGE_KEY = 'carecircle_session_reminders_v1';

const DEFAULT_SESSION_PRESETS: SessionReminderPreset[] = [
  { id: 'p1', label: '1 hour', valueHours: 1, enabled: true },
  { id: 'p2', label: '3 hours', valueHours: 3, enabled: false },
  { id: 'p3', label: '6 hours', valueHours: 6, enabled: false },
  { id: 'p4', label: '12 hours', valueHours: 12, enabled: true },
  { id: 'p5', label: '24 hours', valueHours: 24, enabled: true },
];

export default function ReminderScreen() {
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';

  // App Unified Color System
  const colors = {
    background: isDark ? '#121212' : '#EDF4F9',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#687076',
    border: isDark ? '#2E2E2E' : '#E8EEF4',
    divider: isDark ? '#2A2E33' : '#F0F4F8',
    brand: isDark ? '#4478A8' : '#245B8B',
    switchActive: isDark ? '#4478A8' : '#245B8B',
    switchInactive: isDark ? '#3F3F46' : '#D1D5DB',
    thumbActive: '#FFFFFF',
  };

  // State: Session Reminders
  const [sessionRemindersEnabled, setSessionRemindersEnabled] = useState<boolean>(true);
  const [sessionPresets, setSessionPresets] = useState<SessionReminderPreset[]>(DEFAULT_SESSION_PRESETS);

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await tokenStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.sessionRemindersEnabled !== undefined) {
            setSessionRemindersEnabled(parsed.sessionRemindersEnabled);
          }
          if (parsed.sessionPresets && Array.isArray(parsed.sessionPresets)) {
            const cleanPresets = DEFAULT_SESSION_PRESETS.map((def) => {
              const found = parsed.sessionPresets.find((p: any) => p.id === def.id || p.valueHours === def.valueHours);
              return found ? { ...def, enabled: found.enabled } : def;
            });
            setSessionPresets(cleanPresets);
          }
        }
      } catch (e) {
        console.warn('[Reminder] Error loading settings:', e);
      }
    };
    loadSettings();
  }, []);

  // Save settings on changes
  const saveSettings = useCallback(async (overrides?: any) => {
    try {
      const stateToSave = {
        sessionRemindersEnabled,
        sessionPresets,
        ...overrides,
      };
      await tokenStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('[Reminder] Error saving settings:', e);
    }
  }, [sessionRemindersEnabled, sessionPresets]);

  // Toggle Session Preset
  const toggleSessionPreset = (id: string) => {
    const updated = sessionPresets.map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    setSessionPresets(updated);
    saveSettings({ sessionPresets: updated });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
          Reminder
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* SESSION REMINDERS CARD */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Card Header */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.badgeRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.brand} style={{ marginRight: 8 }} />
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Session Reminders</Text>
            </View>
            <Switch
              value={sessionRemindersEnabled}
              onValueChange={(val) => {
                setSessionRemindersEnabled(val);
                saveSettings({ sessionRemindersEnabled: val });
              }}
              trackColor={{ false: colors.switchInactive, true: colors.switchActive }}
              thumbColor={colors.thumbActive}
              ios_backgroundColor={colors.switchInactive}
            />
          </View>

          {sessionRemindersEnabled && (
            <>
              <View style={[styles.rowDivider, { backgroundColor: colors.divider, marginVertical: 10 }]} />

              {/* Clean Preset Reminder Tick List */}
              <View style={styles.presetsList}>
                {sessionPresets.map((preset, index) => (
                  <React.Fragment key={preset.id}>
                    <TouchableOpacity
                      style={styles.tickRow}
                      onPress={() => toggleSessionPreset(preset.id)}
                      activeOpacity={0.65}
                    >
                      <Text
                        style={[
                          styles.tickLabel,
                          {
                            color: colors.text,
                            fontWeight: preset.enabled ? '600' : '400',
                          },
                        ]}
                      >
                        {preset.label}
                      </Text>
                      <View style={styles.tickIconWrapper}>
                        {preset.enabled ? (
                          <Ionicons name="checkmark" size={22} color={colors.brand} />
                        ) : (
                          <View style={{ width: 22, height: 22 }} />
                        )}
                      </View>
                    </TouchableOpacity>
                    {index < sessionPresets.length - 1 && (
                      <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  rowDivider: {
    height: 1,
    width: '100%',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  presetsList: {
    marginVertical: 4,
  },
  tickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  tickLabel: {
    fontSize: 15,
  },
  tickIconWrapper: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
