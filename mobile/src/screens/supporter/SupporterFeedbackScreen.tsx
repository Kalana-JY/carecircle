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
  RefreshControl,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/store/AuthContext';
import { API_URL } from '@/services/api';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ConfirmationBottomSheet } from '@/components/ConfirmationBottomSheet';

interface FeedbackItem {
  _id: string;
  sessionId: {
    _id: string;
    title: string;
    startTime: string;
    endTime: string;
    sessionType: 'online' | 'physical';
    venue?: string;
  } | null;
  sessionTitle?: string;
  sessionType?: 'online' | 'physical';
  userId: {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  } | null;
  rating: number;
  comment: string;
  createdAt: string;
}

interface FeedbackSummary {
  totalFeedbacks: number;
  averageRating: number;
  ratingBreakdown: { [key: number]: number };
  sessionsList: {
    sessionId: string;
    sessionTitle: string;
    sessionType: string;
    feedbackCount: number;
  }[];
}

export default function SupporterFeedbackScreen({
  isEmbedded = false,
  onGoBack,
}: {
  isEmbedded?: boolean;
  onGoBack?: () => void;
}) {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [summary, setSummary] = useState<FeedbackSummary>({
    totalFeedbacks: 0,
    averageRating: 0,
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    sessionsList: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | null>(null);
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'online' | 'physical'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest' | 'oldest'>('newest');
  const [expandedSessions, setExpandedSessions] = useState<{ [key: string]: boolean }>({});

  // Alert State
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);

  // Dynamic Theme Colors
  const colors = {
    background: isDark ? '#121212' : '#F4F7FB',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#687076',
    border: isDark ? '#2E2E2E' : '#E2E8F0',
    inputBg: isDark ? '#18181B' : '#EDF2F7',
    brand: '#2563EB',
    brandLight: isDark ? '#1E3A8A30' : '#EFF6FF',
    starGold: '#F59E0B',
    starGoldLight: isDark ? '#78350F30' : '#FEF3C7',
    accentGreen: '#0AC600',
    accentGreenLight: isDark ? '#064E3B30' : '#ECFDF5',
    pillActive: '#2563EB',
    pillActiveText: '#FFFFFF',
    pillInactiveBg: isDark ? '#27272A' : '#F1F5F9',
    pillInactiveText: isDark ? '#A1A1AA' : '#64748B',
  };

  const fetchFeedbackData = useCallback(async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/sessions/my-feedback`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data.feedbacks || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.error('[SupporterFeedback] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchFeedbackData();
    }, [fetchFeedbackData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeedbackData();
  };

  const handleBack = () => {
    if (onGoBack) {
      onGoBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  // Helper for member initials
  const getInitials = (name?: string) => {
    if (!name) return 'M';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Format relative or friendly date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
      }
    } catch {
      return dateStr;
    }
  };

  // Filtered & Sorted Feedbacks
  const filteredFeedbacks = useMemo(() => {
    let list = [...feedbacks];

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((item) => {
        const memberName = item.userId?.name?.toLowerCase() || '';
        const title = (item.sessionId?.title || item.sessionTitle || '').toLowerCase();
        const comment = (item.comment || '').toLowerCase();
        return memberName.includes(q) || title.includes(q) || comment.includes(q);
      });
    }

    // Filter by Rating
    if (selectedRatingFilter !== null) {
      if (selectedRatingFilter === 1) {
        list = list.filter((item) => item.rating <= 2);
      } else {
        list = list.filter((item) => item.rating === selectedRatingFilter);
      }
    }

    // Filter by Session
    if (selectedSessionFilter !== 'all') {
      list = list.filter((item) => {
        const sId = item.sessionId?._id || '';
        const sTitle = item.sessionId?.title || item.sessionTitle || '';
        return sId === selectedSessionFilter || sTitle === selectedSessionFilter;
      });
    }

    // Filter by Session Type
    if (selectedTypeFilter !== 'all') {
      list = list.filter((item) => {
        const type = item.sessionId?.sessionType || item.sessionType || 'online';
        return type === selectedTypeFilter;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'highest') return b.rating - a.rating;
      if (sortBy === 'lowest') return a.rating - b.rating;
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      // Default: newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [feedbacks, searchQuery, selectedRatingFilter, selectedSessionFilter, selectedTypeFilter, sortBy]);

  // Session-Wise Grouped Feedbacks
  const sessionGroups = useMemo(() => {
    const groups: {
      key: string;
      sessionTitle: string;
      sessionType: 'online' | 'physical';
      startTime?: string;
      venue?: string;
      feedbacks: FeedbackItem[];
      avgRating: number;
    }[] = [];

    const groupMap = new Map<string, typeof groups[0]>();

    filteredFeedbacks.forEach((item) => {
      const sId = item.sessionId?._id || item.sessionTitle || 'other';
      const sTitle = item.sessionId?.title || item.sessionTitle || 'Support Session';
      const sType = item.sessionId?.sessionType || item.sessionType || 'online';
      const sStart = item.sessionId?.startTime;
      const sVenue = item.sessionId?.venue;

      if (!groupMap.has(sId)) {
        groupMap.set(sId, {
          key: sId,
          sessionTitle: sTitle,
          sessionType: sType,
          startTime: sStart,
          venue: sVenue,
          feedbacks: [item],
          avgRating: item.rating,
        });
      } else {
        const grp = groupMap.get(sId)!;
        grp.feedbacks.push(item);
      }
    });

    groupMap.forEach((grp) => {
      const sum = grp.feedbacks.reduce((acc, f) => acc + f.rating, 0);
      grp.avgRating = Number((sum / grp.feedbacks.length).toFixed(1));
      groups.push(grp);
    });

    return groups;
  }, [filteredFeedbacks]);

  const toggleSessionExpand = (key: string) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key],
    }));
  };

  const isSessionExpanded = (key: string) => {
    // Default to true (expanded)
    return expandedSessions[key] !== false;
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedRatingFilter(null);
    setSelectedSessionFilter('all');
    setSelectedTypeFilter('all');
    setSortBy('newest');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedRatingFilter !== null ||
    selectedSessionFilter !== 'all' ||
    selectedTypeFilter !== 'all' ||
    sortBy !== 'newest';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header */}
      {!isEmbedded && (
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.headerBtn} hitSlop={10} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
              Feedback & Reviews
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() =>
              setAlertConfig({
                title: 'About Member Feedback',
                message:
                  'Feedbacks and ratings submitted by members after attending your sessions help maintain high quality care circle support.',
                type: 'info',
              })
            }
            hitSlop={10}
            accessibilityLabel="Info"
          >
            <Ionicons name="information-circle-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} />}
      >
        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}
        >
          {/* Rating filter pills */}
          <TouchableOpacity
            style={[
              styles.filterPill,
              selectedRatingFilter === null
                ? { backgroundColor: colors.pillActive }
                : { backgroundColor: colors.pillInactiveBg },
            ]}
            onPress={() => setSelectedRatingFilter(null)}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: selectedRatingFilter === null ? colors.pillActiveText : colors.pillInactiveText },
              ]}
            >
              All Stars
            </Text>
          </TouchableOpacity>

          {[5, 4, 3, 1].map((r) => {
            const isSelected = selectedRatingFilter === r;
            const label = r === 1 ? '1-2 ★' : `${r} ★`;
            return (
              <TouchableOpacity
                key={r}
                style={[
                  styles.filterPill,
                  isSelected ? { backgroundColor: colors.pillActive } : { backgroundColor: colors.pillInactiveBg },
                ]}
                onPress={() => setSelectedRatingFilter(isSelected ? null : r)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isSelected ? colors.pillActiveText : colors.pillInactiveText },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Session Type filter pills */}
          <TouchableOpacity
            style={[
              styles.filterPill,
              selectedTypeFilter === 'online'
                ? { backgroundColor: colors.pillActive }
                : { backgroundColor: colors.pillInactiveBg },
            ]}
            onPress={() => setSelectedTypeFilter(selectedTypeFilter === 'online' ? 'all' : 'online')}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: selectedTypeFilter === 'online' ? colors.pillActiveText : colors.pillInactiveText },
              ]}
            >
              💻 Online
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              selectedTypeFilter === 'physical'
                ? { backgroundColor: colors.pillActive }
                : { backgroundColor: colors.pillInactiveBg },
            ]}
            onPress={() => setSelectedTypeFilter(selectedTypeFilter === 'physical' ? 'all' : 'physical')}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: selectedTypeFilter === 'physical' ? colors.pillActiveText : colors.pillInactiveText },
              ]}
            >
              📍 Physical
            </Text>
          </TouchableOpacity>

          {/* Sort By Toggle */}
          <TouchableOpacity
            style={[
              styles.filterPill,
              sortBy !== 'newest'
                ? { backgroundColor: colors.pillActive }
                : { backgroundColor: colors.pillInactiveBg },
            ]}
            onPress={() => {
              if (sortBy === 'newest') setSortBy('highest');
              else if (sortBy === 'highest') setSortBy('lowest');
              else if (sortBy === 'lowest') setSortBy('oldest');
              else setSortBy('newest');
            }}
          >
            <Ionicons
              name="swap-vertical"
              size={14}
              color={sortBy !== 'newest' ? colors.pillActiveText : colors.pillInactiveText}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.filterPillText,
                { color: sortBy !== 'newest' ? colors.pillActiveText : colors.pillInactiveText },
              ]}
            >
              {sortBy === 'highest'
                ? 'Highest Rated'
                : sortBy === 'lowest'
                ? 'Lowest Rated'
                : sortBy === 'oldest'
                ? 'Oldest'
                : 'Sort: Newest'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Sessions Filter Pills (if more than 1 distinct session exists) */}
        {summary.sessionsList && summary.sessionsList.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.filterPillsRow, { marginTop: 4, marginBottom: 14 }]}
          >
            <TouchableOpacity
              style={[
                styles.filterSessionPill,
                selectedSessionFilter === 'all'
                  ? { backgroundColor: isDark ? '#3B82F6' : '#2563EB', borderColor: colors.brand }
                  : { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => setSelectedSessionFilter('all')}
            >
              <Text
                style={[
                  styles.filterSessionPillText,
                  { color: selectedSessionFilter === 'all' ? '#FFFFFF' : colors.text },
                ]}
              >
                All Sessions ({summary.totalFeedbacks})
              </Text>
            </TouchableOpacity>

            {summary.sessionsList.map((s) => {
              const isSelected = selectedSessionFilter === s.sessionId || selectedSessionFilter === s.sessionTitle;
              return (
                <TouchableOpacity
                  key={s.sessionId}
                  style={[
                    styles.filterSessionPill,
                    isSelected
                      ? { backgroundColor: isDark ? '#3B82F6' : '#2563EB', borderColor: colors.brand }
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => setSelectedSessionFilter(isSelected ? 'all' : s.sessionId)}
                >
                  <Text
                    style={[
                      styles.filterSessionPillText,
                      { color: isSelected ? '#FFFFFF' : colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {s.sessionTitle} ({s.feedbackCount})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Active Filter Indicator & Reset */}
        {hasActiveFilters && (
          <View style={styles.activeFilterBanner}>
            <Text style={[styles.activeFilterText, { color: colors.textSecondary }]}>
              Showing {filteredFeedbacks.length} matching review{filteredFeedbacks.length === 1 ? '' : 's'}
            </Text>
            <TouchableOpacity onPress={resetAllFilters} hitSlop={8}>
              <Text style={[styles.resetFilterText, { color: colors.brand }]}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content Loading State */}
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.brand} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading member feedback...</Text>
          </View>
        ) : filteredFeedbacks.length === 0 ? (
          /* Empty State */
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIconBadge, { backgroundColor: colors.brandLight }]}>
              <Ionicons name="chatbubbles-outline" size={40} color={colors.brand} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Feedbacks Found</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              {hasActiveFilters
                ? 'No member reviews match your current filters. Try resetting the filters.'
                : 'You have not received any session feedback from members yet.'}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity
                style={[styles.resetBtn, { backgroundColor: colors.brand }]}
                onPress={resetAllFilters}
                activeOpacity={0.8}
              >
                <Text style={styles.resetBtnText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* SESSION-WISE GROUPED VIEW */
          <View style={styles.groupsContainer}>
            {sessionGroups.map((group) => {
              const expanded = isSessionExpanded(group.key);
              return (
                <View
                  key={group.key}
                  style={[styles.sessionGroupCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  {/* Session Group Header */}
                  <TouchableOpacity
                    style={styles.sessionGroupHeader}
                    onPress={() => toggleSessionExpand(group.key)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.sessionGroupHeaderLeft}>
                      <View style={[styles.sessionTypeBadge, { backgroundColor: colors.brandLight }]}>
                        <Ionicons
                          name={group.sessionType === 'physical' ? 'location' : 'videocam'}
                          size={15}
                          color={colors.brand}
                        />
                        <Text style={[styles.sessionTypeBadgeText, { color: colors.brand }]}>
                          {group.sessionType === 'physical' ? 'Physical' : 'Online'}
                        </Text>
                      </View>

                      <Text style={[styles.sessionGroupTitle, { color: colors.text }]} numberOfLines={1}>
                        {group.sessionTitle}
                      </Text>

                      {group.startTime && (
                        <Text style={[styles.sessionGroupDate, { color: colors.textSecondary }]}>
                          {new Date(group.startTime).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      )}
                    </View>

                    <View style={styles.sessionGroupHeaderRight}>
                      <View style={styles.groupRatingBadge}>
                        <Ionicons name="star" size={14} color={colors.starGold} />
                        <Text style={[styles.groupRatingText, { color: colors.text }]}>{group.avgRating}</Text>
                        <Text style={[styles.groupCountText, { color: colors.textSecondary }]}>
                          ({group.feedbacks.length})
                        </Text>
                      </View>

                      <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Feedback Cards in this Session */}
                  {expanded && (
                    <View style={styles.sessionGroupBody}>
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      {group.feedbacks.map((fb, idx) => (
                        <View key={fb._id} style={[idx > 0 && styles.fbItemDivider, { borderColor: colors.border }]}>
                          <FeedbackCard fb={fb} colors={colors} getInitials={getInitials} formatDate={formatDate} />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Info / Alert Bottom Sheet */}
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

// Reusable Individual Feedback Card
function FeedbackCard({
  fb,
  colors,
  getInitials,
  formatDate,
  showSessionTag = false,
}: {
  fb: FeedbackItem;
  colors: any;
  getInitials: (name?: string) => string;
  formatDate: (date: string) => string;
  showSessionTag?: boolean;
}) {
  const memberName = fb.userId?.name || 'CareCircle Member';
  const sessionTitle = fb.sessionId?.title || fb.sessionTitle || 'Support Session';
  const sessionType = fb.sessionId?.sessionType || fb.sessionType || 'online';

  return (
    <View style={styles.feedbackCardInner}>
      {/* Top row: Avatar, Name, Date */}
      <View style={styles.fbHeaderRow}>
        <View style={styles.fbUserRow}>
          {fb.userId?.avatarUrl ? (
            <Image source={{ uri: fb.userId.avatarUrl }} style={styles.fbAvatarImg} />
          ) : (
            <View style={[styles.fbAvatarFallback, { backgroundColor: colors.brandLight }]}>
              <Text style={[styles.fbAvatarText, { color: colors.brand }]}>{getInitials(memberName)}</Text>
            </View>
          )}

          <View style={styles.fbUserInfo}>
            <Text style={[styles.fbUserName, { color: colors.text }]} numberOfLines={1}>
              {memberName}
            </Text>
            <Text style={[styles.fbDateText, { color: colors.textSecondary }]}>{formatDate(fb.createdAt)}</Text>
          </View>
        </View>

        {/* Stars */}
        <View style={styles.fbStarsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= fb.rating ? 'star' : 'star-outline'}
              size={16}
              color={colors.starGold}
            />
          ))}
          <Text style={[styles.fbRatingScore, { color: colors.text }]}>{fb.rating}.0</Text>
        </View>
      </View>

      {/* Optional Session Tag if in All Reviews mode */}
      {showSessionTag && (
        <View style={styles.sessionTagRow}>
          <View style={[styles.inlineSessionTag, { backgroundColor: colors.inputBg }]}>
            <Ionicons
              name={sessionType === 'physical' ? 'location-outline' : 'videocam-outline'}
              size={13}
              color={colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.inlineSessionTagText, { color: colors.textSecondary }]} numberOfLines={1}>
              {sessionTitle} • {sessionType === 'physical' ? 'Physical' : 'Online'}
            </Text>
          </View>
        </View>
      )}

      {/* Comment / Review Content */}
      {fb.comment && fb.comment.trim().length > 0 ? (
        <View style={[styles.commentBubble, { backgroundColor: colors.inputBg }]}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={14}
            color={colors.textSecondary}
            style={{ opacity: 0.7, marginBottom: 2 }}
          />
          <Text style={[styles.commentText, { color: colors.text }]}>{fb.comment.trim()}</Text>
        </View>
      ) : (
        <Text style={[styles.noCommentText, { color: colors.textSecondary }]}>
          Rated without written comments.
        </Text>
      )}
    </View>
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 6,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterSessionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 200,
  },
  filterSessionPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeFilterBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  activeFilterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  resetFilterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyIconBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  resetBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  groupsContainer: {
    gap: 14,
  },
  sessionGroupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  sessionGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sessionGroupHeaderLeft: {
    flex: 1,
    marginRight: 10,
  },
  sessionTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginBottom: 6,
  },
  sessionTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sessionGroupTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  sessionGroupDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  sessionGroupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupRatingText: {
    fontSize: 14,
    fontWeight: '700',
  },
  groupCountText: {
    fontSize: 12,
  },
  sessionGroupBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  fbItemDivider: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
  },
  allReviewsContainer: {
    gap: 12,
  },
  singleReviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  feedbackCardInner: {
    gap: 10,
  },
  fbHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fbUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  fbAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  fbAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fbAvatarText: {
    fontSize: 13,
    fontWeight: '700',
  },
  fbUserInfo: {
    flex: 1,
  },
  fbUserName: {
    fontSize: 14,
    fontWeight: '700',
  },
  fbDateText: {
    fontSize: 11,
    marginTop: 1,
  },
  fbStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  fbRatingScore: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  sessionTagRow: {
    flexDirection: 'row',
  },
  inlineSessionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inlineSessionTagText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  commentBubble: {
    borderRadius: 12,
    padding: 12,
  },
  commentText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  noCommentText: {
    fontSize: 12.5,
    fontStyle: 'italic',
  },
});
