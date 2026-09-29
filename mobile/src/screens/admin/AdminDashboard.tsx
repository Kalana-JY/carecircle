import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/store/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Fonts } from '@/constants/theme';
import { API_URL } from '@/services/api';
import { AdminSidePanel } from '@/components/AdminSidePanel';

interface AdminStats {
  totalUsers: number;
  peerSupporters: number;
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  pendingApplications: number;
  totalMoodLogs: number;
  totalForumPosts: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';

  const colors = {
    background: isDark ? '#0F172A' : '#F8FAFC',
    card: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#334155' : '#E2E8F0',
    brand: '#2563EB',
    brandLight: isDark ? '#1E3A8A30' : '#EFF6FF',
    accentGreen: '#0AC600',
    accentGreenBg: isDark ? '#064E3B30' : '#ECFDF5',
    accentAmber: '#F59E0B',
    accentAmberBg: isDark ? '#78350F30' : '#FFFBEB',
    accentPurple: '#8B5CF6',
    accentPurpleBg: isDark ? '#4C1D9530' : '#F5F3FF',
    accentRose: '#F43F5E',
    accentRoseBg: isDark ? '#88133730' : '#FFF1F2',
  };

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    peerSupporters: 0,
    totalSessions: 0,
    activeSessions: 0,
    completedSessions: 0,
    pendingApplications: 0,
    totalMoodLogs: 0,
    totalForumPosts: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);

  const fetchStats = useCallback(async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('[AdminDashboard] Stats error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => setIsSidePanelOpen(true)}
          hitSlop={10}
          accessibilityLabel="Open Admin Menu"
        >
          <Ionicons name="menu-outline" size={28} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
            Admin Dashboard
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => Alert.alert('System Alerts', 'Platform operational. All backend microservices running.')}
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
        {/* Welcome Banner */}
        <View style={[styles.welcomeBanner, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF', borderColor: colors.border }]}>
          <View style={styles.bannerTextCol}>
            <Text style={[styles.bannerGreeting, { color: colors.brand }]}>Welcome back,</Text>
            <Text style={[styles.bannerName, { color: colors.text }]}>{user?.name || 'Administrator'}</Text>
            <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
              Monitor real-time analytics, user accounts, and peer support operations.
            </Text>
          </View>
          <View style={[styles.bannerIconBadge, { backgroundColor: colors.brand }]}>
            <Ionicons name="shield-checkmark" size={32} color="#FFFFFF" />
          </View>
        </View>

        {/* Section Heading: Platform Statistics */}
        <Text style={[styles.sectionHeading, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
          Platform Statistics
        </Text>

        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : (
          <>
            {/* Grid of Metric Cards */}
            <View style={styles.statsGrid}>
              {/* Card 1: Total Users */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('UserManagement')}
                activeOpacity={0.8}
              >
                <View style={[styles.statIconContainer, { backgroundColor: colors.brandLight }]}>
                  <Ionicons name="people" size={24} color={colors.brand} />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{stats.totalUsers}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Registered Users</Text>
                <View style={styles.statArrowRow}>
                  <Text style={[styles.statLinkText, { color: colors.brand }]}>Manage Users</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.brand} />
                </View>
              </TouchableOpacity>

              {/* Card 2: Active Sessions */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('SessionManagement')}
                activeOpacity={0.8}
              >
                <View style={[styles.statIconContainer, { backgroundColor: colors.accentGreenBg }]}>
                  <Ionicons name="calendar" size={24} color={colors.accentGreen} />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{stats.activeSessions}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Support Sessions</Text>
                <View style={styles.statArrowRow}>
                  <Text style={[styles.statLinkText, { color: colors.accentGreen }]}>View Sessions</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.accentGreen} />
                </View>
              </TouchableOpacity>

              {/* Card 3: Peer Supporters */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('UserManagement')}
                activeOpacity={0.8}
              >
                <View style={[styles.statIconContainer, { backgroundColor: colors.accentPurpleBg }]}>
                  <Ionicons name="ribbon" size={24} color={colors.accentPurple} />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{stats.peerSupporters}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Certified Supporters</Text>
                <View style={styles.statArrowRow}>
                  <Text style={[styles.statLinkText, { color: colors.accentPurple }]}>Supporters List</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.accentPurple} />
                </View>
              </TouchableOpacity>

              {/* Card 4: Pending Applications */}
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('UserManagement')}
                activeOpacity={0.8}
              >
                <View style={[styles.statIconContainer, { backgroundColor: colors.accentAmberBg }]}>
                  <Ionicons name="document-text" size={24} color={colors.accentAmber} />
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{stats.pendingApplications}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending Applications</Text>
                <View style={styles.statArrowRow}>
                  <Text style={[styles.statLinkText, { color: colors.accentAmber }]}>Review Now</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.accentAmber} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Additional Metrics Row */}
            <View style={styles.secondaryStatsRow}>
              <View style={[styles.secondaryStatBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="checkmark-done-circle" size={22} color={colors.accentGreen} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={[styles.secondaryStatNum, { color: colors.text }]}>{stats.completedSessions}</Text>
                  <Text style={[styles.secondaryStatLbl, { color: colors.textSecondary }]}>Completed Sessions</Text>
                </View>
              </View>

              <View style={[styles.secondaryStatBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="happy" size={22} color={colors.accentRose} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={[styles.secondaryStatNum, { color: colors.text }]}>{stats.totalMoodLogs}</Text>
                  <Text style={[styles.secondaryStatLbl, { color: colors.textSecondary }]}>Mood Entries Logged</Text>
                </View>
              </View>
            </View>

            {/* Section: Management Portals */}
            <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 24, fontFamily: Fonts.rounded || 'System' }]}>
              Management Portals
            </Text>

            {/* Quick Action Navigation List */}
            <View style={styles.portalList}>
              {/* User Management Portal */}
              <TouchableOpacity
                style={[styles.portalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('UserManagement')}
                activeOpacity={0.8}
              >
                <View style={[styles.portalIconBox, { backgroundColor: colors.brandLight }]}>
                  <Ionicons name="people" size={24} color={colors.brand} />
                </View>
                <View style={styles.portalContent}>
                  <Text style={[styles.portalTitle, { color: colors.text }]}>User Management</Text>
                  <Text style={[styles.portalDesc, { color: colors.textSecondary }]}>
                    View members, manage peer supporters, review credentials, and verify identities.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Session Management Portal */}
              <TouchableOpacity
                style={[styles.portalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('SessionManagement')}
                activeOpacity={0.8}
              >
                <View style={[styles.portalIconBox, { backgroundColor: colors.accentGreenBg }]}>
                  <Ionicons name="calendar" size={24} color={colors.accentGreen} />
                </View>
                <View style={styles.portalContent}>
                  <Text style={[styles.portalTitle, { color: colors.text }]}>Session Management</Text>
                  <Text style={[styles.portalDesc, { color: colors.textSecondary }]}>
                    Oversee all 1-on-1 and group counseling schedules, venues, and terminate active slots.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Admin Side Panel Drawer */}
      <AdminSidePanel
        isOpen={isSidePanelOpen}
        onClose={() => setIsSidePanelOpen(false)}
        currentRoute="AdminDashboard"
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  welcomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },
  bannerTextCol: {
    flex: 1,
    marginRight: 12,
  },
  bannerGreeting: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerName: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  bannerIconBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginBottom: 10,
    height: 32,
  },
  statArrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  secondaryStatBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryStatNum: {
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryStatLbl: {
    fontSize: 11,
    fontWeight: '500',
  },
  portalList: {
    gap: 12,
  },
  portalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  portalIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalContent: {
    flex: 1,
  },
  portalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  portalDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  center: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
