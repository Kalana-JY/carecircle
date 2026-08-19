import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Fonts, Colors } from '@/constants/theme';
import { apiFetch } from '@/services/api';
import { ForumPostItem } from '@/constants/forum';
import { timeAgo } from '@/services/format';
import { StatusBadge } from '@/components/status-badge';

export default function ForumDetailScreen() {
  const route = useRoute<any>();
  const { id } = route.params;
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[colorScheme];

  const [post, setPost] = useState<ForumPostItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPost = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/forum/${id}`);
      setPost(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load post');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const submitComment = async () => {
    if (!comment.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await apiFetch(`/api/forum/${id}/comments`, {
        method: 'POST',
        body: { content: comment.trim() },
      });
      setPost((prev) =>
        prev
          ? {
              ...prev,
              commentCount: prev.commentCount + 1,
              comments: [...(prev.comments || []), created],
            }
          : prev
      );
      setComment('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reportComment = async (commentId: string) => {
    try {
      const updated = await apiFetch(`/api/forum/${id}/comments/${commentId}/report`, {
        method: 'POST',
      });
      setPost((prev) =>
        prev
          ? {
              ...prev,
              comments: (prev.comments || []).map((c) =>
                c._id === commentId ? { ...c, status: updated.status } : c
              ),
            }
          : prev
      );
      Alert.alert('Comment Reported', 'Thank you. A moderator will review this comment.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to report comment');
    }
  };

  const handleReport = (commentId: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Report this comment to moderators?')) {
        reportComment(commentId);
      }
    } else {
      Alert.alert('Report Comment', 'Report this comment to moderators?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report', style: 'destructive', onPress: () => reportComment(commentId) },
      ]);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>Post</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Post not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <View style={[styles.header, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>Post</Text>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Post Content */}
          <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.postTopRow}>
              <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '1A' }]}>
                <Text style={[styles.categoryText, { color: colors.primary }]}>{post.category}</Text>
              </View>
            </View>

            <Text style={[styles.postTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
              {post.title}
            </Text>

            <View style={styles.authorRow}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + '1A' }]}>
                <Ionicons
                  name={post.isAnonymous ? 'eye-off-outline' : 'person-outline'}
                  size={14}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.authorText, { color: colors.textSecondary }]}>
                {post.isAnonymous ? 'Anonymous' : post.authorName || 'Member'}
              </Text>
              <Text style={[styles.dotText, { color: colors.textSecondary }]}>·</Text>
              <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                {timeAgo(post.createdAt)}
              </Text>
            </View>

            <Text style={[styles.postContent, { color: colors.text }]}>{post.content}</Text>
          </View>

          {/* Comments */}
          <View style={styles.commentsHeader}>
            <Text style={[styles.commentsTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
              Comments
            </Text>
            <Text style={[styles.commentsCount, { color: colors.textSecondary }]}>
              {post.commentCount}
            </Text>
          </View>

          {(post.comments || []).length === 0 ? (
            <View style={[styles.noCommentsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.noCommentsText, { color: colors.textSecondary }]}>
                No comments yet. Start the conversation.
              </Text>
            </View>
          ) : (
            <View style={styles.commentsList}>
              {(post.comments || []).map((item) => (
                <View
                  key={item._id}
                  style={[styles.commentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.commentHeaderRow}>
                    <View style={styles.commentAuthorRow}>
                      <View style={[styles.commentAvatar, { backgroundColor: colors.primary + '1A' }]}>
                        <Ionicons
                          name={item.isAnonymous ? 'eye-off-outline' : 'person-outline'}
                          size={12}
                          color={colors.primary}
                        />
                      </View>
                      <Text style={[styles.commentAuthor, { color: colors.textSecondary }]}>
                        {item.isAnonymous ? 'Anonymous' : item.authorName || 'Member'}
                      </Text>
                      <Text style={[styles.dotText, { color: colors.textSecondary }]}>·</Text>
                      <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                        {timeAgo(item.createdAt)}
                      </Text>
                    </View>
                    <StatusBadge status={item.status} />
                    {item.status === 'approved' && (
                      <TouchableOpacity
                        style={styles.reportButton}
                        onPress={() => handleReport(item._id)}
                        hitSlop={8}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="flag-outline" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={[styles.commentContent, { color: colors.text }]}>{item.content}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Comment Input Bar */}
        <View
          style={[
            styles.commentBar,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          <View style={[styles.commentInputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <TextInput
              style={[styles.commentInput, { color: colors.text }]}
              placeholder="Write a supportive comment..."
              placeholderTextColor={colors.textSecondary}
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: comment.trim() ? colors.primary : colors.border },
            ]}
            onPress={submitComment}
            disabled={isSubmitting || !comment.trim()}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 24,
  },
  postCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
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
    marginBottom: 12,
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
  postTitle: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 25,
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dotText: {
    fontSize: 13,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  postContent: {
    fontSize: 15,
    lineHeight: 24,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  commentsCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  noCommentsCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
  },
  noCommentsText: {
    fontSize: 14,
  },
  commentsList: {
    gap: 10,
  },
  commentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  reportButton: {
    padding: 4,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  commentAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 21,
  },
  commentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  commentInputWrapper: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    maxHeight: 90,
  },
  commentInput: {
    fontSize: 14,
    paddingVertical: 8,
    maxHeight: 80,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
