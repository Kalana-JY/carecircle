import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { API_URL } from '@/services/api';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SidePanel } from '../../components/SidePanel';
import { ConfirmationBottomSheet } from '@/components/ConfirmationBottomSheet';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);
  const [appStatus, setAppStatus] = useState<string>('none');
  const [bookings, setBookings] = useState<any[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);

  // Dynamic Theme Colors matching mockup
  const colors = {
    background: isDark ? '#121212' : '#EDF4F9',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#687076',
    border: isDark ? '#2E2E2E' : '#E8EEF4',
    brand: '#245B8B',
    brandLight: isDark ? '#1E3A5F' : '#E8F1F9',
    logoutRed: '#FF5C5C',
  };

  const fetchApplicationStatus = useCallback(async () => {
    if (!user?.token) return;
    try {
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
    }
  }, [user]);

  const fetchBookings = useCallback(async () => {
    if (!user?.token) return;
    try {
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
    }
  }, [user]);

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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header with hamburger and centered title */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setIsSidePanelOpen(true)}
          style={styles.menuBtn}
          hitSlop={12}
          accessibilityLabel="Open side menu"
        >
          <Ionicons name="menu-outline" size={26} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
          Account
        </Text>

        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card - click to navigate to Personal Info */}
        <TouchableOpacity
          style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('PersonalInfo')}
          activeOpacity={0.75}
        >
          <View style={styles.userCardLeft}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.brandLight }]}>
                <Text style={[styles.avatarFallbackText, { color: colors.brand }]}>
                  {getInitials(user?.name)}
                </Text>
              </View>
            )}

            <View style={styles.userInfoText}>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {user?.name || 'Jason Smith'}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                {user?.email || 'jason.smith@gmail.com'}
              </Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Sessions & Notification Card */}
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* My Sessions (Members only) */}
          {appStatus !== 'approved' && (
            <>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => navigation.navigate('BookedSessions')}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="calendar-outline" size={20} color={colors.text} />
                  <Text style={[styles.menuTitle, { color: colors.text }]}>My Sessions</Text>
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
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </>
          )}

          {/* Manage Sessions (Peer Supporters only) */}
          {appStatus === 'approved' && (
            <>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => navigation.navigate('ManageSchedule')}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="calendar-number-outline" size={20} color={colors.text} />
                  <Text style={[styles.menuTitle, { color: colors.text }]}>Manage Sessions</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Feedback & Reviews Navigation */}
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => navigation.navigate('SupporterFeedback')}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <Ionicons name="star-outline" size={20} color={colors.text} />
                  <Text style={[styles.menuTitle, { color: colors.text }]}>Feedback & Reviews</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </>
          )}

            {/* Notification */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() =>
                setAlertConfig({
                  title: 'Notifications',
                  message: 'No new notifications right now.',
                  type: 'info',
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="notifications-outline" size={20} color={colors.text} />
                <Text style={[styles.menuTitle, { color: colors.text }]}>Notification</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Preferences, Support & Logout Card */}
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* App Preferences */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() =>
                setAlertConfig({
                  title: 'App Preferences',
                  message: 'Personalize your notification and display settings.',
                  type: 'info',
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="eye-outline" size={20} color={colors.text} />
                <Text style={[styles.menuTitle, { color: colors.text }]}>App Preferences</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Help and Support */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate('HelpSupport')}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="help-circle-outline" size={20} color={colors.text} />
                <Text style={[styles.menuTitle, { color: colors.text }]}>Help and Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Logout */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => setShowLogoutConfirm(true)}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="log-out-outline" size={20} color={colors.logoutRed} />
                <Text style={[styles.menuTitle, { color: colors.logoutRed }]}>Logout</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

      {/* Side Panel Drawer */}
      <SidePanel isOpen={isSidePanelOpen} onClose={() => setIsSidePanelOpen(false)} />

      {/* Logout Confirmation Bottom Sheet */}
      <ConfirmationBottomSheet
        visible={showLogoutConfirm}
        title="Logout"
        message="Sure you want to log out?"
        confirmText="Yes, Logout"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          signOut();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* Status / Alert Bottom Sheet */}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuBtn: {
    padding: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  userCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontSize: 18,
    fontWeight: '700',
  },
  userInfoText: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
  },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
    marginRight: 16,
  },
});
