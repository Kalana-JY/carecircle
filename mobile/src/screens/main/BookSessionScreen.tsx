import React, { useState, useCallback } from 'react';
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
  TextInput,
  ScrollView,
  StatusBar,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { apiFetch } from '@/services/api';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ConfirmationBottomSheet } from '@/components/ConfirmationBottomSheet';

const CATEGORY_FILTERS = ['All', 'Popular', 'Stress Management', 'Anxiety', 'Depression', 'General Check-in'];

export default function BookSessionScreen() {
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
    brandLight: isDark ? '#1E3A8A40' : '#EFF6FF',
    divider: isDark ? '#334155' : '#E2E8F0',
  };

  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [sessionToBook, setSessionToBook] = useState<any | null>(null);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    onConfirm?: () => void;
  } | null>(null);

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    onConfirm?: () => void
  ) => {
    setAlertConfig({
      title,
      message,
      type,
      onConfirm,
    });
  };

  // Search & Filter States
  const [searchText, setSearchText] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchAvailableSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/sessions?status=available');
      setSessions(data.items || []);
    } catch (err: any) {
      console.error('[BookSession] Fetch error:', err);
      showAlert('Error', err.message || 'Failed to load available sessions.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAvailableSessions();
    }, [fetchAvailableSessions])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAvailableSessions();
    setRefreshing(false);
  }, [fetchAvailableSessions]);

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

  const handleBookSession = (session: any) => {
    if (session.supporterId?._id === user?._id) {
      showAlert('Cannot Book', 'You cannot book a support session that you host.', 'warning');
      return;
    }
    setSessionToBook(session);
  };

  const performBooking = async () => {
    if (!sessionToBook) return;
    const session = sessionToBook;
    setBookingId(session._id);
    try {
      await apiFetch(`/api/sessions/${session._id}/book`, {
        method: 'POST',
      });
      setSessionToBook(null);
      showAlert(
        'Success',
        'Successfully booked! Session details are available in your Account tab.',
        'success',
        () => navigation.goBack()
      );
    } catch (err: any) {
      console.error('[BookSession] Booking error:', err);
      showAlert('Error', err.message || 'Failed to book session.', 'error');
    } finally {
      setBookingId(null);
    }
  };

  // Filter sessions
  const filteredSessions = sessions.filter((session) => {
    const query = searchText.toLowerCase().trim();
    const titleMatch = (session.title || '').toLowerCase().includes(query);
    const descMatch = (session.description || '').toLowerCase().includes(query);
    const hostMatch = (session.supporterId?.name || '').toLowerCase().includes(query);
    const venueMatch = (session.venue || '').toLowerCase().includes(query);
    const matchesSearch = !query || titleMatch || descMatch || hostMatch || venueMatch;

    if (!matchesSearch) return false;

    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'Popular') return true;
    const catLower = selectedCategory.toLowerCase();
    return (
      (session.title || '').toLowerCase().includes(catLower) ||
      (session.description || '').toLowerCase().includes(catLower)
    );
  });

  const getInitials = (name?: string) => {
    if (!name) return 'PS';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const renderSessionItem = ({ item }: { item: any }) => {
    const isExpanded = expandedIds.has(item._id);
    const start = new Date(item.startTime);
    const end = new Date(item.endTime);
    const formattedDate = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });
    const formattedStart = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const formattedEnd = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const isBookingThis = bookingId === item._id;
    const supporterName = item.supporterId?.name || 'John Doe';
    const supporterAvatar = item.supporterId?.avatarUrl;

    return (
      <View style={[styles.accordionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Accordion Header (Clickable) */}
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
              {item.description || (item.sessionType === 'physical' ? 'In-Person Session' : 'Virtual Session')}
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
                Hosted by: <Text style={{ fontWeight: '600', color: colors.text }}>{supporterName}</Text>
              </Text>
              {supporterAvatar ? (
                <Image source={{ uri: supporterAvatar }} style={styles.hostAvatar} />
              ) : (
                <View style={[styles.hostAvatarFallback, { backgroundColor: colors.brandLight }]}>
                  <Text style={[styles.hostAvatarFallbackText, { color: colors.brand }]}>
                    {getInitials(supporterName)}
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

            {/* Attendees / Capacity */}
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={18} color={colors.textSecondary} style={styles.detailIcon} />
              <Text style={[styles.detailText, { color: colors.text }]}>
                {item.sessionType === 'physical' ? '8/15' : '1 on 1 Available'}
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
                <Text style={[styles.detailText, { color: colors.text }]}>
                  Virtual • Online Video Session
                </Text>
              </View>
            )}

            {/* Book Session Button */}
            <View style={styles.bookBtnContainer}>
              <TouchableOpacity
                style={[styles.bookBtn, { backgroundColor: colors.brand }]}
                onPress={() => handleBookSession(item)}
                disabled={isBookingThis}
                activeOpacity={0.85}
              >
                {isBookingThis ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.bookBtnText}>Book Session</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
          Sessions
        </Text>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate('Notifications')}
          hitSlop={12}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Pill Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBg }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search"
            placeholderTextColor={colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          <Ionicons name="search-outline" size={20} color={colors.text} style={styles.searchIcon} />
        </View>
      </View>

      {/* Horizontal Category Filters */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {CATEGORY_FILTERS.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? (isDark ? '#1E3A8A' : '#EFF6FF') : colors.card,
                    borderColor: isSelected ? colors.brand : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: isSelected ? colors.brand : colors.text,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Sessions List */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : filteredSessions.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={60} color={colors.textSecondary} style={{ opacity: 0.35, marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Sessions Available</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {searchText || selectedCategory !== 'All'
              ? 'No sessions match your search or filter criteria.'
              : 'There are currently no open support sessions scheduled.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item._id}
          renderItem={renderSessionItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} />
          }
        />
      )}

      {/* Booking Confirmation Sheet */}
      <ConfirmationBottomSheet
        visible={!!sessionToBook}
        title="Confirm Booking"
        message={`Would you like to book "${sessionToBook?.title}" with ${sessionToBook?.supporterId?.name || 'Peer Supporter'}?`}
        confirmText="Yes, Book Session"
        cancelText="Cancel"
        onConfirm={performBooking}
        onCancel={() => setSessionToBook(null)}
        loading={!!bookingId}
      />

      {/* Status Alert Bottom Sheet */}
      <ConfirmationBottomSheet
        visible={!!alertConfig}
        title={alertConfig?.title || ''}
        message={alertConfig?.message || ''}
        type={alertConfig?.type}
        confirmText="OK"
        singleButton={true}
        onConfirm={() => {
          const cb = alertConfig?.onConfirm;
          setAlertConfig(null);
          if (cb) cb();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 18,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  searchIcon: {
    marginLeft: 8,
  },
  filterSection: {
    paddingBottom: 14,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 13,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
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
  bookBtnContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  bookBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
});
