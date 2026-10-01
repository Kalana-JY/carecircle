import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Image,
  Linking,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/store/AuthContext';
import { API_URL } from '@/services/api';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ConfirmationBottomSheet } from '@/components/ConfirmationBottomSheet';

interface SessionItem {
  _id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: 'available' | 'booked' | 'cancelled' | 'completed';
  meetingLink?: string;
  sessionType?: 'online' | 'physical';
  venue?: string;
  supporterId?: {
    _id: string;
    name: string;
    email: string;
    phoneNumber?: string;
    avatarUrl?: string;
  };
  userId?: {
    _id: string;
    name: string;
    email: string;
    phoneNumber?: string;
  } | null;
}

export default function SessionManagementScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';

  const colors = {
    background: isDark ? '#0F172A' : '#F8FAFC',
    card: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#334155' : '#E2E8F0',
    inputBg: isDark ? '#1E293B' : '#F1F5F9',
    brand: '#2563EB',
    accentRed: '#DC2626',
    divider: isDark ? '#334155' : '#E2E8F0',
  };

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Confirmation Bottom Sheet
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string | null;
    type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    icon?: keyof typeof Ionicons.glyphMap;
    singleButton?: boolean;
    isDestructive?: boolean;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    onConfirm?: () => void
  ) => {
    setConfirmDialog({
      title,
      message,
      type,
      singleButton: true,
      confirmText: 'OK',
      onConfirm: () => {
        setConfirmDialog(null);
        if (onConfirm) onConfirm();
      },
    });
  };

  const fetchSessions = useCallback(async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/sessions?admin=true`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.items || []);
      }
    } catch (err) {
      console.error('[SessionManagement] Fetch Error:', err);
      showAlert('Error', 'Failed to load sessions.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSessions();
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleTerminateSession = (sessionId: string, sessionTitle: string) => {
    setConfirmDialog({
      title: 'Terminate Session',
      message: `Sure you want to terminate and delete session "${sessionTitle}"?`,
      type: 'error',
      confirmText: 'Yes, Terminate',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const res = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${user?.token}`,
            },
          });
          setConfirmDialog(null);
          if (res.ok) {
            showAlert('Success', 'Session terminated and removed successfully.', 'success');
            fetchSessions();
          } else {
            const data = await res.json();
            showAlert('Error', data.message || 'Failed to terminate session.', 'error');
          }
        } catch {
          showAlert('Error', 'Server error while terminating session.', 'error');
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchSearch =
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.supporterId?.name && s.supporterId.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.venue && s.venue.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    });
  }, [sessions, searchQuery]);

  const getInitials = (name?: string) => {
    if (!name) return 'PS';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={10}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
          Session Management
        </Text>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => showAlert('Notifications', 'No new session alerts.', 'info')}
          hitSlop={10}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} />
        }
      >
        {/* Search Bar */}
        <View style={[styles.searchPill, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Ionicons name="search" size={20} color={colors.textSecondary} />
        </View>

        {/* Sessions List */}
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : filteredSessions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Sessions Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              There are no support sessions matching your search.
            </Text>
          </View>
        ) : (
          <View style={styles.sessionsList}>
            {filteredSessions.map((item) => {
              const isExpanded = expandedIds.has(item._id);
              const start = new Date(item.startTime);
              const end = new Date(item.endTime);
              const formattedDate = start.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: '2-digit',
                year: 'numeric',
              });
              const formattedStart = start.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });
              const formattedEnd = end.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });

              const hostName = item.supporterId?.name || 'John Doe';
              const hostAvatar = item.supporterId?.avatarUrl;

              return (
                <View
                  key={item._id}
                  style={[
                    styles.accordionCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  {/* Accordion Header */}
                  <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => toggleExpand(item._id)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.cardHeaderLeft}>
                      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.description || (item.sessionType === 'physical' ? 'Physical Session' : 'Virtual Session')}
                      </Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                      size={22}
                      color={colors.text}
                    />
                  </TouchableOpacity>

                  {/* Accordion Body */}
                  {isExpanded && (
                    <View style={styles.cardBody}>
                      <View style={[styles.cardDivider, { backgroundColor: colors.divider }]} />

                      {/* Hosted By */}
                      <View style={styles.detailRow}>
                        <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={styles.detailIcon} />
                        <Text style={[styles.detailText, { color: colors.text }]}>
                          Hosted by: <Text style={{ fontWeight: '600', color: colors.text }}>{hostName}</Text>
                        </Text>
                        {hostAvatar ? (
                          <Image source={{ uri: hostAvatar }} style={styles.hostAvatar} />
                        ) : (
                          <View style={[styles.hostAvatarFallback, { backgroundColor: '#EFF6FF' }]}>
                            <Text style={[styles.hostAvatarFallbackText, { color: colors.brand }]}>
                              {getInitials(hostName)}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Date */}
                      <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={styles.detailIcon} />
                        <Text style={[styles.detailText, { color: colors.text }]}>{formattedDate}</Text>
                      </View>

                      {/* Time */}
                      <View style={styles.detailRow}>
                        <Ionicons name="time-outline" size={18} color={colors.textSecondary} style={styles.detailIcon} />
                        <Text style={[styles.detailText, { color: colors.text }]}>
                          {formattedStart} - {formattedEnd}
                        </Text>
                      </View>

                      {/* Capacity / Attendees */}
                      <View style={styles.detailRow}>
                        <Ionicons name="people-outline" size={18} color={colors.textSecondary} style={styles.detailIcon} />
                        <Text style={[styles.detailText, { color: colors.text }]}>
                          {item.sessionType === 'physical' ? '8/15' : '1 on 1 Session'}
                        </Text>
                      </View>

                      {/* Location / Format */}
                      {item.sessionType === 'physical' ? (
                        <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                          <Ionicons name="location-outline" size={18} color={colors.textSecondary} style={[styles.detailIcon, { marginTop: 2 }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.detailText, { color: colors.text }]}>
                              Physical • Venue: {item.venue || 'Community Center'}
                            </Text>
                            <Text style={[styles.detailSubText, { color: colors.textSecondary }]}>
                              123 Main St, Suite 400
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.detailRow}>
                          <Ionicons name="videocam-outline" size={18} color={colors.textSecondary} style={styles.detailIcon} />
                          <TouchableOpacity
                            onPress={() => {
                              const raw = item.meetingLink?.trim();
                              const url = raw
                                ? (raw.startsWith('http') ? raw : `https://${raw}`)
                                : `https://meet.jit.si/carecircle-session-${item._id.slice(-6)}`;
                              Linking.openURL(url).catch(() => {
                                showAlert('Error', 'Unable to open meeting link.', 'error');
                              });
                            }}
                            activeOpacity={0.7}
                            style={styles.meetingLinkBtn}
                          >
                            <Text style={[styles.detailText, styles.linkText, { color: colors.brand }]}>
                              Meeting Link
                            </Text>
                            <Ionicons name="open-outline" size={14} color={colors.brand} style={{ marginLeft: 4 }} />
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Terminate Button */}
                      <View style={styles.cardBottomAction}>
                        <TouchableOpacity
                          style={styles.terminateBtn}
                          onPress={() => handleTerminateSession(item._id, item.title)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.terminateBtnText}>Terminate</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Confirmation & Status Alert Bottom Sheet Modal */}
      <ConfirmationBottomSheet
        visible={!!confirmDialog}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        type={confirmDialog?.type}
        icon={confirmDialog?.icon}
        confirmText={confirmDialog?.confirmText || 'OK'}
        cancelText={confirmDialog?.cancelText}
        singleButton={confirmDialog?.singleButton}
        isDestructive={confirmDialog?.isDestructive}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={confirmDialog?.cancelText !== null && !confirmDialog?.singleButton ? () => setConfirmDialog(null) : undefined}
        loading={confirmLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 44,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  sessionsList: {
    gap: 12,
  },
  accordionCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardBody: {
    marginTop: 8,
  },
  cardDivider: {
    height: 1,
    marginBottom: 12,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailIcon: {
    width: 26,
    marginRight: 6,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  detailSubText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  hostAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: 8,
  },
  hostAvatarFallback: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  hostAvatarFallbackText: {
    fontSize: 10,
    fontWeight: '700',
  },
  meetingLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  cardBottomAction: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 6,
  },
  terminateBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  terminateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  center: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
});
