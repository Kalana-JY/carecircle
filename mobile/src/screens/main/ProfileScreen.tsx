import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { API_URL } from '@/services/api';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';
  const [appStatus, setAppStatus] = useState<string>('none');
  const [loading, setLoading] = useState<boolean>(true);

  // Dynamic Theme Colors
  const colors = {
    background: isDark ? '#121212' : '#F5F7FA',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#687076',
    border: isDark ? '#2E2E2E' : '#E6E8EB',
    brand: '#245B8B',
    brandLight: isDark ? '#1E3A5F' : '#E8F1F9',
    accentOrange: '#FF9500',
    accentGreen: '#34C759',
    accentRed: '#FF3B30',
  };

  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState<boolean>(false);

  const fetchApplicationStatus = useCallback(async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/peer-supporters/status`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.status) {
        setAppStatus(data.status);
      }
    } catch (error) {
      console.error('[Profile] Failed to fetch application status:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchBookings = useCallback(async () => {
    if (!user?.token) return;
    try {
      setLoadingBookings(true);
      const response = await fetch(`${API_URL}/api/sessions/my-bookings`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.items) {
        setBookings(data.items);
      }
    } catch (error) {
      console.error('[Profile] Failed to fetch booked sessions:', error);
    } finally {
      setLoadingBookings(false);
    }
  }, [user]);

  // Refresh status whenever the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchApplicationStatus();
      fetchBookings();
    }, [fetchApplicationStatus, fetchBookings])
  );

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getStatusBadgeConfig = () => {
    if (appStatus === 'approved') {
      return {
        label: 'Peer Supporter',
        icon: 'shield-checkmark' as const,
        bg: isDark ? 'rgba(52, 199, 89, 0.18)' : 'rgba(52, 199, 89, 0.12)',
        border: isDark ? 'rgba(52, 199, 89, 0.35)' : 'rgba(52, 199, 89, 0.3)',
        text: isDark ? '#4CD964' : '#1E9E4F',
      };
    }
    if (appStatus === 'pending') {
      return {
        label: 'Pending',
        icon: 'time-outline' as const,
        bg: isDark ? 'rgba(255, 149, 0, 0.18)' : 'rgba(255, 149, 0, 0.12)',
        border: isDark ? 'rgba(255, 149, 0, 0.35)' : 'rgba(255, 149, 0, 0.3)',
        text: isDark ? '#FF9F0A' : '#C77700',
      };
    }
    return {
      label: 'Member',
      icon: 'person-outline' as const,
      bg: isDark ? 'rgba(58, 124, 165, 0.18)' : 'rgba(58, 124, 165, 0.1)',
      border: isDark ? 'rgba(58, 124, 165, 0.35)' : 'rgba(58, 124, 165, 0.25)',
      text: colors.brand,
    };
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={[styles.pageTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
            My Profile
          </Text>
        </View>

        {/* User Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.brandLight }]}>
            <Text style={[styles.avatarText, { color: colors.brand }]}>
              {getInitials(user?.name)}
            </Text>
          </View>
          {(() => {
            const badge = getStatusBadgeConfig();
            return (
              <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                <Ionicons name={badge.icon} size={13} color={badge.text} />
                <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                  {badge.label}
                </Text>
              </View>
            );
          })()}
          <Text style={[styles.name, { color: colors.text }]}>{user?.name || 'Guest User'}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email || 'No email associated'}</Text>
          <Text style={[styles.phone, { color: colors.textSecondary }]}>{user?.phoneNumber || 'No phone number'}</Text>
        </View>

        {/* Menu Section Card */}
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Manage Sessions (only for approved Peer Supporters) */}
          {appStatus === 'approved' && (
            <>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => navigation.navigate('ManageSchedule')}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="calendar-outline" size={22} color={colors.text} />
                  <Text style={[styles.menuTitle, { color: colors.text }]}>Manage Sessions</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            </>
          )}

          {/* Booked Sessions */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('BookedSessions')}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="calendar-number-outline" size={22} color={colors.text} />
              <Text style={[styles.menuTitle, { color: colors.text }]}>Booked Sessions</Text>
            </View>
            <View style={styles.menuRight}>
              {bookings.length > 0 && (
                <View style={[styles.badgePill, { backgroundColor: colors.brandLight }]}>
                  <Text style={[styles.badgePillText, { color: colors.brand }]}>{bookings.length}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

          {/* Sign Out */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={signOut}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="log-out-outline" size={22} color={colors.accentRed} />
              <Text style={[styles.menuTitle, { color: colors.accentRed }]}>Sign Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 20,
    marginTop: Platform.OS === 'android' ? 10 : 0,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  profileCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    fontWeight: '500',
  },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
