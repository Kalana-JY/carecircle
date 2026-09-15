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
  Linking,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { API_URL } from '@/services/api';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function BookedSessionsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';

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
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

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
      console.error('[BookedSessions] Failed to fetch booked sessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

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
        console.error('[BookedSessions] Cancel error:', err);
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
          Booked Sessions
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.brand} style={{ marginTop: 40 }} />
        ) : bookings.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Booked Sessions</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              You have no active support sessions scheduled. Browse available sessions in Explore to connect with a peer supporter.
            </Text>
            <TouchableOpacity
              style={[styles.exploreBtn, { backgroundColor: colors.brand }]}
              onPress={() => navigation.navigate('BookSession')}
              activeOpacity={0.8}
            >
              <Text style={styles.exploreBtnText}>Book a Session</Text>
            </TouchableOpacity>
          </View>
        ) : (
          bookings.map((item) => (
            <View key={item._id} style={[styles.bookingItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.bookingHeader}>
                <Text style={[styles.bookingTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <View
                  style={[
                    styles.bookingBadge,
                    {
                      backgroundColor: item.status === 'cancelled' ? colors.accentRed + '15' : colors.accentGreen + '15',
                      borderColor: item.status === 'cancelled' ? colors.accentRed : colors.accentGreen,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.bookingBadgeText,
                      { color: item.status === 'cancelled' ? colors.accentRed : colors.accentGreen },
                    ]}
                  >
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {item.description ? (
                <Text style={[styles.bookingDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {item.description}
                </Text>
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

              {item.sessionType === 'physical' ? (
                <View style={styles.bookingMetaRow}>
                  <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.bookingMetaText, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                    Venue: {item.venue || 'N/A'}
                  </Text>
                </View>
              ) : (
                <View>
                  <View style={styles.bookingMetaRow}>
                    <Ionicons name="videocam-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.bookingMetaText, { color: colors.text, fontWeight: '600' }]}>
                      Online Session (Jitsi)
                    </Text>
                  </View>
                  {item.meetingLink ? (
                    <TouchableOpacity
                      style={[styles.joinBtn, { backgroundColor: colors.brand }]}
                      onPress={() => {
                        if (item.meetingLink) {
                          Linking.openURL(item.meetingLink).catch((err) => {
                            console.error('Failed to open link:', err);
                            Alert.alert('Error', 'Could not open meeting link.');
                          });
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="videocam" size={16} color="#FFF" />
                      <Text style={styles.joinBtnText}>Join Session</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  exploreBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  bookingItem: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  bookingBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bookingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bookingDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  bookingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  bookingMetaText: {
    fontSize: 13,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 8,
    gap: 6,
  },
  joinBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
