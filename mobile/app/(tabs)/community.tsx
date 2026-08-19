import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Fonts } from '../../constants/theme';
import { apiFetch } from '../../utils/api';
import { FORUM_CATEGORY_NAMES, ForumPostItem } from '../../constants/forum';
import { timeAgo } from '../../utils/format';

export default function CommunityScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [activeSection, setActiveSection] = useState<'forum' | 'chat'>('forum');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [posts, setPosts] = useState<ForumPostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const colors = {
    background: isDark ? '#121212' : '#F5F7FA',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#687076',
    border: isDark ? '#2E2E2E' : '#E6E8EB',
    brand: '#245B8B',
    brandLight: isDark ? '#1E3A5F' : '#E8F1F9',
  };

  const loadPosts = useCallback(async () => {
    try {
      const query =
        selectedCategory === 'All' ? '' : `?category=${encodeURIComponent(selectedCategory)}`;
      const data = await apiFetch(`/api/forum${query}`);
      setPosts(data.items ?? []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts])
  );

  const renderPost = ({ item }: { item: ForumPostItem }) => (
    <TouchableOpacity
      style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.85}
      onPress={() => router.push(`/forum/${item._id}`)}
    >
      <View style={styles.postTopRow}>
        <View style={[styles.categoryBadge, { backgroundColor: colors.brandLight }]}>
          <Text style={[styles.categoryText, { color: colors.brand }]}>{item.category}</Text>
        </View>
        <Text style={[styles.timeText, { color: colors.textSecondary }]}>
          {timeAgo(item.createdAt)}
        </Text>
      </View>
      <Text style={[styles.postTitle, { color: colors.text }]} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={[styles.postContent, { color: colors.textSecondary }]} numberOfLines={2}>
        {item.content}
      </Text>
      <View style={styles.postFooter}>
        <View style={styles.authorRow}>
          <View style={[styles.avatar, { backgroundColor: colors.brandLight }]}>
            <Ionicons
              name={item.isAnonymous ? 'eye-off-outline' : 'person-outline'}
              size={12}
              color={colors.brand}
            />
          </View>
          <Text style={[styles.authorText, { color: colors.textSecondary }]}>
            {item.isAnonymous ? 'Anonymous' : item.authorName || 'Member'}
          </Text>
        </View>
        <View style={styles.commentRow}>
          <Ionicons name="chatbubble-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.commentCount, { color: colors.textSecondary }]}>
            {item.commentCount}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Sticky Custom Header */}
      <View style={[styles.header, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
            Community
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Peer-support forum
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.newPostBtn, { backgroundColor: colors.brand }]}
          activeOpacity={0.8}
          onPress={() => router.push('/forum/create')}
        >
          <Ionicons name="create-outline" size={16} color="#FFFFFF" />
          <Text style={styles.newPostBtnText}>New Post</Text>
        </TouchableOpacity>
      </View>

      {/* Section Toggle: Forum | Chat Room */}
      <View style={[styles.sectionToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.sectionToggleOption,
            { backgroundColor: activeSection === 'forum' ? colors.brand : 'transparent' },
          ]}
          onPress={() => setActiveSection('forum')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={15}
            color={activeSection === 'forum' ? '#FFFFFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.sectionToggleText,
              { color: activeSection === 'forum' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            Forum
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sectionToggleOption,
            { backgroundColor: activeSection === 'chat' ? colors.brand : 'transparent' },
          ]}
          onPress={() => setActiveSection('chat')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="chatbox-ellipses-outline"
            size={15}
            color={activeSection === 'chat' ? '#FFFFFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.sectionToggleText,
              { color: activeSection === 'chat' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            Chat Room
          </Text>
        </TouchableOpacity>
      </View>

      {activeSection === 'forum' ? (
        <>
          {/* Category Filter Chips */}
          <View style={[styles.chipsContainer, { backgroundColor: colors.background }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContent}
            >
              {['All', ...FORUM_CATEGORY_NAMES].map((category) => {
                const isSelected = selectedCategory === category;
                return (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? colors.brand : colors.card,
                        borderColor: isSelected ? colors.brand : colors.border,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedCategory(category);
                      setIsLoading(true);
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.brand} />
            </View>
          ) : posts.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No posts yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Be the first to share something in this space.
              </Text>
            </View>
          ) : (
            <FlatList
              data={posts}
              keyExtractor={(item) => item._id}
              renderItem={renderPost}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      ) : (
        /* Chat Room placeholder — functionality comes later */
        <View style={styles.centerContainer}>
          <Ionicons name="chatbox-ellipses-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.4 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Chat rooms are on the way</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Soon you'll be able to connect live with your circles right here.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  newPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  newPostBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  chipsContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#0000001A',
  },
  sectionToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  sectionToggleOption: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    height: 38,
    borderRadius: 9,
  },
  sectionToggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  chipsContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 40,
    gap: 14,
  },
  postCard: {
    borderRadius: 16,
    borderWidth: 1,
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
  postTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  postContent: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  commentCount: {
    fontSize: 13,
    fontWeight: '600',
  },
});
