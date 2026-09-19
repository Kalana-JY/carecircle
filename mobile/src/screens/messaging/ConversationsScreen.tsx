import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { timeAgo } from '@/services/format';

const BRAND = '#245B8B';

interface Participant {
  _id: string;
  name: string;
}

interface LastMessage {
  _id: string;
  content: string;
  senderName: string;
  createdAt: string;
}

interface ConversationItem {
  _id: string;
  type: 'dm' | 'group';
  name: string;
  description: string;
  participants: Participant[];
  lastMessage: LastMessage | null;
  lastMessageAt: string | null;
}

export default function ConversationsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const isDark = useColorScheme() === 'dark';
  const [activeTab, setActiveTab] = useState<'dm' | 'group'>('dm');
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ConversationItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const colors = {
    background: isDark ? '#121212' : '#F5F7FA',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#687076',
    border: isDark ? '#2E2E2E' : '#E6E8EB',
    brand: BRAND,
    brandLight: isDark ? '#1E3A5F' : '#E8F1F9',
    inputBg: isDark ? '#1A1A1A' : '#FFFFFF',
  };

  const loadConversations = useCallback(async () => {
    try {
      const data = await apiFetch('/api/conversations');
      setConversations(data.items ?? []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const data = await apiFetch(`/api/conversations/search?q=${encodeURIComponent(q)}`);
      setSearchResults(data.items ?? []);
    } catch {
      setSearchResults([]);
    }
  }, []);

  const getConversationTitle = (conv: ConversationItem) => {
    if (conv.type === 'group') return conv.name;
    const other = conv.participants.find((p) => String(p._id) !== String(user?._id));
    return other?.name || 'Unknown';
  };

  const getConversationIcon = (conv: ConversationItem) => {
    if (conv.type === 'group') return 'people-outline';
    return 'person-outline';
  };

  const filtered = conversations.filter((conv) => conv.type === activeTab);
  const displayData = isSearching ? searchResults.filter((c) => c.type === activeTab) : filtered;

  const renderConversation = ({ item }: { item: ConversationItem }) => {
    const title = getConversationTitle(item);
    const icon = getConversationIcon(item);

    return (
      <TouchableOpacity
        style={[styles.convRow, { borderBottomColor: colors.border }]}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('ChatRoom', {
            conversationId: item._id,
            title,
          })
        }
      >
        <View style={[styles.convIcon, { backgroundColor: item.type === 'group' ? colors.brandLight : (isDark ? '#1E3A5F' : '#D7E6F2') }]}>
          <Ionicons name={icon as any} size={20} color={colors.brand} />
        </View>
        <View style={styles.convInfo}>
          <View style={styles.convTopRow}>
            <Text style={[styles.convTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
            {item.lastMessage && (
              <Text style={[styles.convTime, { color: colors.textSecondary }]}>{timeAgo(item.lastMessage.createdAt)}</Text>
            )}
          </View>
          {item.lastMessage ? (
            <Text style={[styles.convPreview, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.lastMessage.senderName}: {item.lastMessage.content}
            </Text>
          ) : (
            <Text style={[styles.convPreview, { color: colors.textSecondary }]}>No messages yet</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.brand} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
        <View style={styles.headerActions}>
          {activeTab === 'dm' && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('UserList')}
            >
              <Ionicons name="person-add-outline" size={20} color={colors.brand} />
            </TouchableOpacity>
          )}
          {activeTab === 'group' && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('CreateGroup')}
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.brand} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab toggle */}
      <View style={[styles.tabToggle, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.tab, { backgroundColor: activeTab === 'dm' ? colors.brand : 'transparent' }]}
          onPress={() => setActiveTab('dm')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="chatbubble-outline"
            size={15}
            color={activeTab === 'dm' ? '#FFFFFF' : colors.textSecondary}
          />
          <Text style={[styles.tabText, { color: activeTab === 'dm' ? '#FFFFFF' : colors.textSecondary }]}>
            Direct
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, { backgroundColor: activeTab === 'group' ? colors.brand : 'transparent' }]}
          onPress={() => setActiveTab('group')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="people-outline"
            size={15}
            color={activeTab === 'group' ? '#FFFFFF' : colors.textSecondary}
          />
          <Text style={[styles.tabText, { color: activeTab === 'group' ? '#FFFFFF' : colors.textSecondary }]}>
            Groups
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search (for groups) */}
      {activeTab === 'group' && (
        <View style={[styles.searchContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search groups..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      )}

      {/* Conversations list */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(item) => item._id}
          renderItem={renderConversation}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons
                name={activeTab === 'dm' ? 'chatbubble-outline' : 'people-outline'}
                size={48}
                color={colors.textSecondary}
                style={{ opacity: 0.4 }}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {activeTab === 'dm' ? 'No conversations yet' : 'No groups yet'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {activeTab === 'dm'
                  ? 'Start a conversation from the user list.'
                  : 'Create a group to chat with multiple people.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 8 },
  tabToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    height: 38,
    borderRadius: 9,
  },
  tabText: { fontSize: 14, fontWeight: '700' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },
  list: { padding: 16, gap: 2 },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  convIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  convInfo: { flex: 1 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  convTime: { fontSize: 12, marginLeft: 8 },
  convPreview: { fontSize: 13, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 12 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
