import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { API_URL } from '@/services/api';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { type ReminderNotification } from '@/services/api';
import { ConfirmationBottomSheet } from '@/components/ConfirmationBottomSheet';

type FilterCategory = 'all' | 'sessions' | 'reminders' | 'wellbeing';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';

  const colors = {
    background: isDark ? '#121212' : '#EDF4F9',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#687076',
    border: isDark ? '#2E2E2E' : '#E8EEF4',
    brand: isDark ? '#4478A8' : '#245B8B',
    brandLight: isDark ? '#1E3A5F' : '#E8F1F9',
    accentRed: '#FF5C5C',
    unreadBg: isDark ? '#1A2938' : '#F0F7FD',
    unreadBorder: isDark ? '#2B4A6A' : '#CCE2F5',
  };

  const [notifications, setNotifications] = useState<ReminderNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all');
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.token) return;
    try {
      const response = await fetch(`${API_URL}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.data) {
        setNotifications(data.data);
      }
    } catch (error) {
      console.error('[Notifications] Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n
        )
      );
    } catch (error) {
      console.error('[Notifications] Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
      );
    } catch (error) {
      console.error('[Notifications] Failed to mark all as read:', error);
    }
  };

  const handleNotificationPress = (notification: ReminderNotification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }

    const type = notification.type;
    if (
      type === 'session_booked' ||
      type === 'session_updated' ||
      type === 'session_cancelled' ||
      type === 'session_deleted' ||
      type === 'session_reminder'
    ) {
      if (type === 'session_cancelled' && notification.metadata?.memberId) {
        navigation.navigate('ManageSchedule');
      } else {
        navigation.navigate('BookedSessions');
      }
    } else if (type === 'mood_log_reminder') {
      navigation.navigate('Mood');
    } else if (type === 'wellness_activity_reminder') {
      navigation.navigate('WellnessActivities');
    } else if (type === 'custom_reminder') {
      navigation.navigate('Reminder');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      // Sessions
      case 'session_booked':
        return 'calendar';
      case 'session_updated':
        return 'create-outline';
      case 'session_cancelled':
        return 'close-circle-outline';
      case 'session_deleted':
        return 'trash-outline';
      case 'session_reminder':
        return 'time-outline';

      // Reminders
      case 'mood_log_reminder':
        return 'heart-outline';
      case 'wellness_activity_reminder':
        return 'fitness-outline';
      case 'custom_reminder':
        return 'alarm-outline';

      // Wellbeing & Tips
      case 'daily_wellbeing_tip':
        return 'bulb-outline';
      case 'motivational_message':
        return 'sparkles-outline';

      // Goals
      case 'goal_reminder':
      case 'deadline_approaching':
      case 'deadline_missed':
        return 'flag-outline';

      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'session_booked':
        return '#245B8B';
      case 'session_updated':
        return '#0288D1';
      case 'session_cancelled':
        return '#E53935';
      case 'session_deleted':
        return '#C62828';
      case 'session_reminder':
        return '#FB8C00';

      case 'mood_log_reminder':
        return '#E91E63';
      case 'wellness_activity_reminder':
        return '#43A047';
      case 'custom_reminder':
        return '#8E24AA';

      case 'daily_wellbeing_tip':
        return '#F59E0B';
      case 'motivational_message':
        return '#8B5CF6';

      case 'goal_reminder':
      case 'deadline_approaching':
      case 'deadline_missed':
        return '#3F51B5';

      default:
        return colors.brand;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Filtering
  const filteredNotifications = notifications.filter((n) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'sessions') {
      return (
        n.type === 'session_booked' ||
        n.type === 'session_updated' ||
        n.type === 'session_cancelled' ||
        n.type === 'session_deleted' ||
        n.type === 'session_reminder'
      );
    }
    if (selectedFilter === 'reminders') {
      return (
        n.type === 'session_reminder' ||
        n.type === 'mood_log_reminder' ||
        n.type === 'wellness_activity_reminder' ||
        n.type === 'custom_reminder'
      );
    }
    if (selectedFilter === 'wellbeing') {
      return n.type === 'daily_wellbeing_tip' || n.type === 'motivational_message';
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header matching design */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
          Notification
        </Text>

        <View style={styles.headerRight}>
          {unreadCount > 0 ? (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={markAllAsRead}
              activeOpacity={0.7}
              hitSlop={10}
              accessibilityLabel="Mark all as read"
            >
              <Ionicons name="checkmark-done" size={24} color={colors.brand} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { key: 'all', label: 'All' },
            { key: 'sessions', label: 'Sessions' },
            { key: 'reminders', label: 'Reminders' },
            { key: 'wellbeing', label: 'Wellbeing' },
          ].map((tab) => {
            const isSelected = selectedFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setSelectedFilter(tab.key as FilterCategory)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? colors.brand : colors.card,
                    borderColor: isSelected ? colors.brand : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.brand} size="large" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading notifications...
            </Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {selectedFilter === 'all'
                ? "You're all caught up! Session updates, cancellations, and reminders will appear here."
                : `No ${selectedFilter} notifications found.`}
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {filteredNotifications.map((notification) => {
              const iconColor = getNotificationColor(notification.type);
              const isUnread = !notification.read;

              return (
                <TouchableOpacity
                  key={notification._id}
                  style={[
                    styles.notificationCard,
                    {
                      backgroundColor: isUnread ? colors.unreadBg : colors.card,
                      borderColor: isUnread ? colors.unreadBorder : colors.border,
                    },
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                  activeOpacity={0.75}
                >
                  <View style={styles.notificationContent}>
                    <View
                      style={[
                        styles.iconWrapper,
                        { backgroundColor: iconColor + '1A' },
                      ]}
                    >
                      <Ionicons
                        name={getNotificationIcon(notification.type) as any}
                        size={22}
                        color={iconColor}
                      />
                    </View>

                    <View style={styles.notificationText}>
                      <View style={styles.titleRow}>
                        <Text
                          style={[
                            styles.notificationTitle,
                            { color: colors.text },
                            isUnread && styles.unreadTitle,
                          ]}
                          numberOfLines={1}
                        >
                          {notification.title}
                        </Text>
                        <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
                          {formatTime(notification.createdAt)}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.notificationBody,
                          { color: isUnread ? colors.text : colors.textSecondary },
                        ]}
                        numberOfLines={3}
                      >
                        {notification.body}
                      </Text>
                    </View>

                    {isUnread && (
                      <View style={[styles.unreadDot, { backgroundColor: colors.brand }]} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Confirmation / Alert Bottom Sheet */}
      <ConfirmationBottomSheet
        visible={!!alertConfig}
        title={alertConfig?.title || ''}
        message={alertConfig?.message || ''}
        type={alertConfig?.type || 'info'}
        singleButton={true}
        confirmText="OK"
        onConfirm={() => setAlertConfig(null)}
        onCancel={() => setAlertConfig(null)}
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  markAllBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationsList: {
    gap: 10,
  },
  notificationCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notificationText: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '800',
  },
  notificationBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 0,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    flexShrink: 0,
  },
});