import React, { useState, useCallback, useMemo } from 'react';
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
  StatusBar,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { API_URL } from '@/services/api';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function BookedSessionsScreen() {
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
    tabInactive: isDark ? '#3B82F680' : '#60A5FA',
    accentRed: '#DC2626',
    divider: isDark ? '#334155' : '#E2E8F0',
  };

  const [activeTab, setActiveTab] = useState<'sessions' | 'history'>('sessions');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Calendar State
  const now = new Date();
  const [calYear, setCalYear] = useState<number>(now.getFullYear());
  const [calMonth, setCalMonth] = useState<number>(now.getMonth());

  // Feedback Modal State
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [selectedSessionForFeedback, setSelectedSessionForFeedback] = useState<any | null>(null);
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const fetchBookings = useCallback(async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
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

  const openFeedbackModal = (session: any) => {
    setSelectedSessionForFeedback(session);
    setRating(5);
    setFeedbackText('');
    setFeedbackModalVisible(true);
  };

  const handleSubmitFeedback = async () => {
    if (!selectedSessionForFeedback) return;
    setSubmittingFeedback(true);
    try {
      // Feedback API submission simulation/endpoint
      await new Promise((r) => setTimeout(r, 600));
      setFeedbackModalVisible(false);
      if (Platform.OS === 'web') {
        window.alert('Thank you! Your feedback has been submitted.');
      } else {
        Alert.alert('Thank you!', 'Your feedback has been submitted successfully.');
      }
    } catch {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Separate Active/Upcoming Bookings vs History (completed/past/cancelled)
  const { upcomingBookings, historyBookings, bookedDatesSet } = useMemo(() => {
    const upcoming: any[] = [];
    const history: any[] = [];
    const dateSet = new Set<number>();
    const currentTimestamp = Date.now();

    bookings.forEach((b) => {
      const sessionEnd = new Date(b.endTime).getTime();
      const isPastOrEnded = sessionEnd < currentTimestamp || b.status === 'cancelled' || b.status === 'completed';

      const sDate = new Date(b.startTime);
      if (sDate.getFullYear() === calYear && sDate.getMonth() === calMonth) {
        dateSet.add(sDate.getDate());
      }

      if (isPastOrEnded) {
        history.push(b);
      } else {
        upcoming.push(b);
      }
    });

    return {
      upcomingBookings: upcoming,
      historyBookings: history,
      bookedDatesSet: dateSet,
    };
  }, [bookings, calYear, calMonth]);

  const displayedList = activeTab === 'sessions' ? upcomingBookings : historyBookings;

  const getInitials = (name?: string) => {
    if (!name) return 'PS';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Calendar calculations
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const daysInCurrentMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

    const cells: { day: number; isCurrentMonth: boolean }[] = [];

    // Previous month overflow days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({ day: daysInPrevMonth - i, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      cells.push({ day: d, isCurrentMonth: true });
    }

    // Next month overflow days (fill up to 35 or 42 cells)
    const totalCells = cells.length <= 35 ? 35 : 42;
    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, isCurrentMonth: false });
    }

    return cells;
  }, [calYear, calMonth]);

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const renderCard = (item: any) => {
    const isExpanded = expandedIds.has(item._id);
    const start = new Date(item.startTime);
    const end = new Date(item.endTime);
    const formattedDate = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });
    const formattedStart = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const formattedEnd = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const hostName = item.supporterId?.name || 'John Doe';
    const hostAvatar = item.supporterId?.avatarUrl;
    const isCancelled = item.status === 'cancelled';

    return (
      <View key={item._id} style={[styles.accordionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                <View style={[styles.hostAvatarFallback, { backgroundColor: colors.brandLight }]}>
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
                {activeTab === 'sessions' ? (
                  <TouchableOpacity
                    onPress={() => {
                      const raw = item.meetingLink?.trim();
                      const url = raw
                        ? (raw.startsWith('http') ? raw : `https://${raw}`)
                        : `https://meet.jit.si/carecircle-session-${item._id.slice(-6)}`;
                      Linking.openURL(url).catch(() => {
                        Alert.alert('Error', 'Unable to open meeting link.');
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
                ) : (
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    Virtual Session (Completed)
                  </Text>
                )}
              </View>
            )}

            {/* Bottom Actions Row */}
            <View style={styles.cardBottomAction}>
              {activeTab === 'sessions' ? (
                /* Cancel Booking Circle Icon */
                !isCancelled && (
                  <TouchableOpacity
                    onPress={() => handleCancelBooking(item._id)}
                    hitSlop={8}
                    style={styles.actionIconBtn}
                    accessibilityLabel="Cancel Booking"
                  >
                    <Ionicons name="close-circle-outline" size={26} color={colors.accentRed} />
                  </TouchableOpacity>
                )
              ) : (
                /* Give Feedback Button in History tab */
                <TouchableOpacity
                  style={[styles.feedbackBtn, { backgroundColor: colors.brand }]}
                  onPress={() => openFeedbackModal(item)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.feedbackBtnText}>Give Feedback</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
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
          My Session
        </Text>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => Alert.alert('Notifications', 'No new session notifications.')}
          hitSlop={12}
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
        {/* Segmented Tabs (Sessions | History) */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[
              styles.segmentTab,
              {
                backgroundColor: activeTab === 'sessions' ? colors.brand : colors.tabInactive,
                borderTopLeftRadius: 10,
                borderBottomLeftRadius: 10,
              },
            ]}
            onPress={() => setActiveTab('sessions')}
            activeOpacity={0.85}
          >
            <Text style={styles.segmentTabText}>Sessions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentTab,
              {
                backgroundColor: activeTab === 'history' ? colors.brand : colors.tabInactive,
                borderTopRightRadius: 10,
                borderBottomRightRadius: 10,
              },
            ]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.85}
          >
            <Text style={styles.segmentTabText}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Sessions List */}
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : displayedList.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 10 }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeTab === 'sessions' ? 'No Active Sessions' : 'No Session History'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {activeTab === 'sessions'
                ? 'You have no upcoming booked sessions scheduled.'
                : 'Your past sessions and support logs will be displayed here.'}
            </Text>
            {activeTab === 'sessions' && (
              <TouchableOpacity
                style={[styles.bookNewBtn, { backgroundColor: colors.brand }]}
                onPress={() => navigation.navigate('BookSession')}
                activeOpacity={0.8}
              >
                <Text style={styles.bookNewBtnText}>Book a Session</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={[styles.sessionsWrapper, displayedList.length > 3 && styles.sessionsScrollContainer]}>
            <ScrollView
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={displayedList.length > 3}
              contentContainerStyle={styles.cardsList}
            >
              {displayedList.map((item) => renderCard(item))}
            </ScrollView>
          </View>
        )}

        {/* Calendar Section (Shown on Sessions tab) */}
        {activeTab === 'sessions' && (
          <View style={styles.calendarSection}>
            <Text style={[styles.calendarHeading, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
              Calendar
            </Text>

            <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Calendar Header Controls */}
              <View style={styles.calControls}>
                <TouchableOpacity onPress={handlePrevMonth} hitSlop={10}>
                  <Ionicons name="chevron-back" size={20} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.calDropdownsRow}>
                  {/* Month Pill */}
                  <View style={[styles.calDropdownPill, { borderColor: colors.border }]}>
                    <Text style={[styles.calDropdownText, { color: colors.text }]}>{MONTH_NAMES[calMonth]}</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                  </View>

                  {/* Year Pill */}
                  <View style={[styles.calDropdownPill, { borderColor: colors.border }]}>
                    <Text style={[styles.calDropdownText, { color: colors.text }]}>{calYear}</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                  </View>
                </View>

                <TouchableOpacity onPress={handleNextMonth} hitSlop={10}>
                  <Ionicons name="chevron-forward" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Day of Week Headers */}
              <View style={styles.calDaysHeader}>
                {DAYS_OF_WEEK.map((d) => (
                  <Text key={d} style={[styles.calDayHeaderText, { color: colors.textSecondary }]}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.calGrid}>
                {calendarGrid.map((item, idx) => {
                  const isBookedDate = item.isCurrentMonth && bookedDatesSet.has(item.day);

                  return (
                    <View key={idx} style={styles.calCell}>
                      <View
                        style={[
                          styles.calCellInner,
                          isBookedDate && {
                            backgroundColor: colors.brand,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.calCellText,
                            {
                              color: !item.isCurrentMonth
                                ? colors.textSecondary + '60'
                                : isBookedDate
                                ? '#FFFFFF'
                                : colors.text,
                              fontWeight: isBookedDate ? '700' : '400',
                            },
                          ]}
                        >
                          {item.day}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Give Feedback Bottom Sheet Modal (slides from bottom to top) */}
      <Modal
        visible={feedbackModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setFeedbackModalVisible(false)}
        >
          <TouchableOpacity
            style={[styles.bottomSheetModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={1}
          >
            {/* Handle bar */}
            <View style={[styles.sheetHandle, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]} />

            <Text style={[styles.modalTitle, { color: colors.text }]}>Rate Your Experience</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              How was your support session with {selectedSessionForFeedback?.supporterId?.name || 'Peer Supporter'}?
            </Text>

            {/* Star Rating */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= rating ? '#F59E0B' : colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Feedback Input */}
            <TextInput
              style={[styles.feedbackInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Share your thoughts, review, or compliments..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              value={feedbackText}
              onChangeText={setFeedbackText}
            />

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelModalBtn, { borderColor: colors.border }]}
                onPress={() => setFeedbackModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.brand }]}
                onPress={handleSubmitFeedback}
                disabled={submittingFeedback}
              >
                {submittingFeedback ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  segmentContainer: {
    flexDirection: 'row',
    height: 44,
    marginBottom: 20,
  },
  segmentTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentTabText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cardsList: {
    gap: 12,
  },
  sessionsWrapper: {
    width: '100%',
  },
  sessionsScrollContainer: {
    maxHeight: 285,
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
    marginTop: 4,
  },
  actionIconBtn: {
    padding: 4,
  },
  feedbackBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  calendarSection: {
    marginTop: 24,
  },
  calendarHeading: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  calendarCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  calControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calDropdownsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  calDropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  calDropdownText: {
    fontSize: 14,
    fontWeight: '600',
  },
  calDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  calDayHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    width: 38,
    textAlign: 'center',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: '14.28%',
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calCellInner: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calCellText: {
    fontSize: 14,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  bookNewBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  bookNewBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  center: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetModalCard: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  feedbackInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtn: {
    borderWidth: 1,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
