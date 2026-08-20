import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { apiFetch } from '@/services/api';
import { Fonts, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function BookSessionScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const isDark = useColorScheme() === 'dark';
  const colors = {
    background: isDark ? '#121212' : '#F5F7FA',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#687076',
    border: isDark ? '#2E2E2E' : '#E6E8EB',
    inputBg: isDark ? '#1A1A1A' : '#F0F2F5',
    brand: '#245B8B',
    brandLight: isDark ? '#1E3A5F' : '#E8F1F9',
    accentGreen: '#34C759',
    accentRed: '#FF3B30',
  };

  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const fetchAvailableSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/sessions?status=available');
      setSessions(data.items || []);
    } catch (err: any) {
      console.error('[BookSession] Fetch error:', err);
      Alert.alert('Error', err.message || 'Failed to load available sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAvailableSessions();
    }, [fetchAvailableSessions])
  );

  const handleBookSession = async (session: any) => {
    // Prevent booking own sessions
    if (session.supporterId?._id === user?._id) {
      Alert.alert('Cannot Book', 'You cannot book a support session that you host.');
      return;
    }

    const performBooking = async () => {
      setBookingId(session._id);
      try {
        await apiFetch(`/api/sessions/${session._id}/book`, {
          method: 'POST',
        });
        if (Platform.OS === 'web') {
          window.alert(`Successfully booked! Session link and details are available in your Profile tab.`);
        } else {
          Alert.alert(
            'Success',
            'Successfully booked! Session details are available in your Profile tab.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
        if (Platform.OS === 'web') {
          navigation.goBack();
        }
      } catch (err: any) {
        console.error('[BookSession] Booking error:', err);
        Alert.alert('Error', err.message || 'Failed to book session.');
      } finally {
        setBookingId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Book session "${session.title}" hosted by ${session.supporterId?.name}?`)) {
        performBooking();
      }
    } else {
      Alert.alert(
        'Confirm Booking',
        `Would you like to book "${session.title}" with ${session.supporterId?.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: performBooking },
        ]
      );
    }
  };

  const renderSessionItem = ({ item }: { item: any }) => {
    const start = new Date(item.startTime);
    const end = new Date(item.endTime);
    const formattedDate = start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const formattedStart = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedEnd = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const isBookingThis = bookingId === item._id;

    return (
      <View style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.badge, { backgroundColor: colors.brandLight, borderColor: colors.brand }]}>
            <Text style={[styles.badgeText, { color: colors.brand }]}>AVAILABLE</Text>
          </View>
        </View>

        {item.description ? (
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
        ) : (
          <Text style={[styles.cardDescPlaceholder, { color: colors.textSecondary }]}>No additional details provided.</Text>
        )}

        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
            Hosted by: <Text style={{ fontWeight: '600', color: colors.text }}>{item.supporterId?.name || 'Certified Peer Supporter'}</Text>
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {formattedDate}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {formattedStart} - {formattedEnd}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: colors.brand }]}
          onPress={() => handleBookSession(item)}
          disabled={isBookingThis}
          activeOpacity={0.8}
        >
          {isBookingThis ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="bookmark-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.bookBtnText}>Book Session</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>Peer Support Sessions</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Schedule a live chat session with approved peer support volunteers.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} style={{ opacity: 0.3, marginBottom: 10 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Sessions Available</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            There are no peer supporter session slots open for booking at the moment. Please check back later.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item._id}
          renderItem={renderSessionItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#0000001A',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  listContainer: {
    padding: 20,
    gap: 16,
  },
  sessionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardDescPlaceholder: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#0000001A',
    marginVertical: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 13,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  bookBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
