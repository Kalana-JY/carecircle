import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
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

  const handleCancelBooking = async (sessionId: string) => {
    const cancelAction = async () => {
      try {
        const response = await fetch(`${API_URL}/api/sessions/${sessionId}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user?.token}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          if (Platform.OS === 'web') {
            window.alert('Booking cancelled successfully.');
          } else {
            Alert.alert('Success', 'Booking cancelled successfully.');
          }
          fetchBookings();
        } else {
          if (Platform.OS === 'web') {
            window.alert(data.message || 'Failed to cancel booking.');
          } else {
            Alert.alert('Error', data.message || 'Failed to cancel booking.');
          }
        }
      } catch (err) {
        console.error('[Profile] Cancel error:', err);
        if (Platform.OS === 'web') {
          window.alert('Server error. Please try again later.');
        } else {
          Alert.alert('Error', 'Server error. Please try again later.');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to cancel this support session booking?')) {
        cancelAction();
      }
    } else {
      Alert.alert(
        'Cancel Booking',
        'Are you sure you want to cancel this support session booking?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: cancelAction,
          },
        ]
      );
    }
  };

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
          <Text style={[styles.name, { color: colors.text }]}>{user?.name || 'Guest User'}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email || 'No email associated'}</Text>
          <Text style={[styles.phone, { color: colors.textSecondary }]}>{user?.phoneNumber || 'No phone number'}</Text>
        </View>

        {/* Peer Supporter Block */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Peer Supporter Status</Text>

          {loading ? (
            <ActivityIndicator size="small" color={colors.brand} style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.statusContent}>
              {appStatus === 'none' && (
                <View>
                  <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                    Apply to become a peer supporter via the Side Panel menu to share your experiences and host counseling or support sessions.
                  </Text>
                </View>
              )}

              {appStatus === 'pending' && (
                <View style={[styles.statusBox, { backgroundColor: colors.brandLight + '30', borderColor: colors.accentOrange }]}>
                  <Ionicons name="time-outline" size={24} color={colors.accentOrange} />
                  <View style={styles.statusTextContainer}>
                    <Text style={[styles.statusTitle, { color: colors.text }]}>Application Pending</Text>
                    <Text style={[styles.statusDescription, { color: colors.textSecondary }]}>
                      Your application is currently under review by our admin team.
                    </Text>
                  </View>
                </View>
              )}

              {appStatus === 'approved' && (
                <View>
                  <View style={[styles.statusBox, { backgroundColor: colors.accentGreen + '1A', borderColor: colors.accentGreen }]}>
                    <Ionicons name="checkmark-circle-outline" size={24} color={colors.accentGreen} />
                    <View style={styles.statusTextContainer}>
                      <Text style={[styles.statusTitle, { color: colors.text }]}>Approved Supporter</Text>
                      <Text style={[styles.statusDescription, { color: colors.textSecondary }]}>
                        Congratulations! You are certified to host support sessions.
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.brand, marginTop: 12 }]}
                    onPress={() => navigation.navigate('ManageSchedule')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnText}>Host & Manage Sessions</Text>
                  </TouchableOpacity>
                </View>
              )}

              {appStatus === 'rejected' && (
                <View>
                  <View style={[styles.statusBox, { backgroundColor: colors.accentRed + '10', borderColor: colors.accentRed }]}>
                    <Ionicons name="close-circle-outline" size={24} color={colors.accentRed} />
                    <View style={styles.statusTextContainer}>
                      <Text style={[styles.statusTitle, { color: colors.text }]}>Application Rejected</Text>
                      <Text style={[styles.statusDescription, { color: colors.textSecondary }]}>
                        Your application was not approved by administration at this time. You can re-apply via the Side Panel menu.
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Booked Sessions */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>My Booked Support Sessions</Text>
          {loadingBookings ? (
            <ActivityIndicator size="small" color={colors.brand} style={{ marginVertical: 20 }} />
          ) : bookings.length === 0 ? (
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
              You have no active support sessions scheduled. Browse sessions in the Explore section to connect with a peer supporter.
            </Text>
          ) : (
            bookings.map((item) => (
              <View key={item._id} style={[styles.bookingItem, { borderColor: colors.border }]}>
                <View style={styles.bookingHeader}>
                  <Text style={[styles.bookingTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                  <View style={[styles.bookingBadge, { backgroundColor: item.status === 'cancelled' ? colors.accentRed + '15' : colors.accentGreen + '15', borderColor: item.status === 'cancelled' ? colors.accentRed : colors.accentGreen }]}>
                    <Text style={[styles.bookingBadgeText, { color: item.status === 'cancelled' ? colors.accentRed : colors.accentGreen }]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                {item.description ? (
                  <Text style={[styles.bookingDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
                ) : null}
                <View style={styles.bookingMetaRow}>
                  <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.bookingMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                    Host: {item.supporterId?.name || 'Peer Supporter'}
                  </Text>
                </View>
                <View style={styles.bookingMetaRow}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.bookingMetaText, { color: colors.textSecondary }]}>
                    {new Date(item.startTime).toLocaleDateString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    at{' '}
                    {new Date(item.startTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {new Date(item.endTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                {item.meetingLink ? (
                  <View style={styles.bookingMetaRow}>
                    <Ionicons name="link-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.bookingMetaText, { color: colors.brand, fontWeight: '600' }]} numberOfLines={1}>
                      Link: {item.meetingLink}
                    </Text>
                  </View>
                ) : null}
                {item.status !== 'cancelled' && (
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.accentRed }]}
                    onPress={() => handleCancelBooking(item._id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.accentRed }]}>Cancel Booking</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.accentRed }]}
          onPress={signOut}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.accentRed} />
          <Text style={[styles.logoutText, { color: colors.accentRed }]}>Sign Out</Text>
        </TouchableOpacity>
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
    marginBottom: 16,
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
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  statusContent: {
    marginTop: 4,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
  },
  bookingItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  bookingBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bookingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bookingDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  bookingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  bookingMetaText: {
    fontSize: 13,
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
