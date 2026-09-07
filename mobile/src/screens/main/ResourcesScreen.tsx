import React, { useCallback, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getInitials } from '../../components/MoodHubChrome';
import { SidePanel } from '../../components/SidePanel';
import { useAuth } from '@/store/AuthContext';
import { Fonts } from '@/constants/theme';
import { apiFetch } from '@/services/api';

const BRAND = '#3A7CA5';

const FALLBACK: ResourceItem[] = [
  { id: 'breath', title: '5-Min Breathing Space', type: 'Meditation' },
  { id: 'compassion', title: 'Self-Compassion Check-in', type: 'Audio Guide' },
  { id: 'journal', title: 'Stress Relief Journaling', type: 'Journal' },
  { id: 'crisis', title: 'Crisis Hotlines & Help', type: 'Directory' },
];

type ResourceItem = {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  type?: string;
  category?: string;
  url?: string;
};

export default function ResourcesScreen() {
  const { user } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadResources = useCallback(async () => {
    try {
      const data = await apiFetch<ResourceItem[]>('/api/resources');
      setResources(Array.isArray(data) ? data : []);
    } catch {
      setResources([]);
    }
  }, []);

  React.useEffect(() => {
    loadResources();
  }, [loadResources]);

  const items = (resources.length ? resources : FALLBACK).filter((item) =>
    `${item.title} ${item.type || ''} ${item.category || ''}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setPanelOpen(true)} style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
        </TouchableOpacity>
        <Text style={styles.brand}>CareCircle</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadResources(); setRefreshing(false); }} />}
      >
        <Text style={styles.title}>Resources</Text>
        <Text style={styles.subtitle}>Guides, tools, and support you can reach for anytime.</Text>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={18} color="#7A828C" />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search resources..." style={styles.searchInput} placeholderTextColor="#8B949E" />
        </View>
        {items.map((item) => (
          <TouchableOpacity
            key={item._id || item.id || item.title}
            style={styles.card}
            onPress={() => item.url && Linking.openURL(item.url)}
            activeOpacity={0.85}
          >
            <View style={styles.icon}>
              <Ionicons name="document-text-outline" size={20} color={BRAND} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.type}>{(item.type || item.category || 'Resource').toUpperCase()}</Text>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.description ? <Text style={styles.meta} numberOfLines={2}>{item.description}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9AA3AB" />
          </TouchableOpacity>
        ))}
      </ScrollView>
      <SidePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F7FB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#D7E6F2', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: BRAND, fontWeight: '800' },
  brand: { color: BRAND, fontSize: 26, fontWeight: '700', fontFamily: Fonts.serif || 'System' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: '#1C242C' },
  subtitle: { color: '#6B7380', marginTop: 4, marginBottom: 16 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E7ECF1', paddingHorizontal: 12, marginBottom: 16 },
  searchInput: { flex: 1, paddingVertical: 12, color: '#1C242C' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E7ECF1' },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E7F1F8', alignItems: 'center', justifyContent: 'center' },
  type: { fontSize: 10, fontWeight: '800', color: '#8B949E', marginBottom: 2 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1C242C' },
  meta: { color: '#6B7380', marginTop: 4, fontSize: 13 },
});
