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
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/store/AuthContext';

const BRAND = '#245B8B';

interface UserItem {
  _id: string;
  name: string;
  email: string;
}

export default function CreateGroupScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const isDark = useColorScheme() === 'dark';
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

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

  const loadUsers = useCallback(async () => {
    try {
      const q = query ? `?q=${encodeURIComponent(query)}` : '';
      const data = await apiFetch(`/api/conversations/users${q}`);
      setUsers(data.items ?? []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  const toggleUser = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Group name is required');
      return;
    }
    if (selected.size < 1) {
      Alert.alert('Error', 'Select at least 1 participant');
      return;
    }

    setIsCreating(true);
    try {
      const data = await apiFetch('/api/conversations/group', {
        method: 'POST',
        body: {
          name: groupName.trim(),
          description: description.trim(),
          participantIds: Array.from(selected),
        },
      });
      navigation.replace('ChatRoom', {
        conversationId: data._id,
        title: data.name,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  const renderUser = ({ item }: { item: UserItem }) => {
    const isSelected = selected.has(item._id);
    return (
      <TouchableOpacity
        style={[styles.userRow, { borderColor: isSelected ? colors.brand : colors.border, backgroundColor: colors.card }]}
        onPress={() => toggleUser(item._id)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: isSelected ? colors.brand : colors.brandLight }]}>
          <Text style={[styles.avatarText, { color: isSelected ? '#FFFFFF' : colors.brand }]}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{item.email}</Text>
        </View>
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={isSelected ? colors.brand : '#C4C9CF'}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.brand} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Group</Text>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={isCreating}
          style={[styles.createBtn, { opacity: isCreating ? 0.5 : 1 }]}
        >
          <Text style={[styles.createBtnText, { color: colors.brand }]}>{isCreating ? 'Creating...' : 'Create'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
          value={groupName}
          onChangeText={setGroupName}
          placeholder="Group name"
          placeholderTextColor={colors.textSecondary}
          maxLength={60}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Description (optional)"
          placeholderTextColor={colors.textSecondary}
          maxLength={200}
        />
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={query}
          onChangeText={setQuery}
          placeholder="Search users..."
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {selected.size > 0 && (
        <Text style={[styles.selectedCount, { color: colors.brand }]}>{selected.size} participant{selected.size > 1 ? 's' : ''} selected</Text>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No users found</Text>
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
  headerTitle: { fontSize: 17, fontWeight: '700' },
  createBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  createBtnText: { fontSize: 15, fontWeight: '700' },
  form: { padding: 16, gap: 10 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },
  selectedCount: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  list: { padding: 16, gap: 8 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700' },
  userEmail: { fontSize: 12, marginTop: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 14 },
});
