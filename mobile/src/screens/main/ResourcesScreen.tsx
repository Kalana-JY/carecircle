import React, { useCallback, useEffect, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SidePanel } from '../../components/SidePanel';
import { ResourcesChrome, ResourceHubTab, BRAND } from '../../components/ResourcesChrome';
import { CrisisSupportPanel } from '../crisis/CrisisSupportPanel';
import { CrisisDirectoryPanel } from '../crisis/CrisisDirectoryPanel';
import { CrisisSavedPanel } from '../crisis/CrisisSavedPanel';
import { CrisisAdminPanel } from '../crisis/CrisisAdminPanel';
import { useAuth } from '@/store/AuthContext';
import { apiFetch } from '@/services/api';
import { getCurrentCoordinates, Coordinates } from '@/services/location';

type ResourceItem = {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  type?: string;
  category?: string;
  url?: string;
  bookmarked?: boolean;
};

const SECTION_TITLES: Record<ResourceHubTab, string> = {
  home: 'RESOURCES',
  support: 'CRISIS',
  directory: 'CRISIS',
  saved: 'RESOURCES',
  admin: 'RESOURCES',
};

export default function ResourcesScreen() {
  const { user } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);
  const [tab, setTab] = useState<ResourceHubTab>('home');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadResources = useCallback(async () => {
    try {
      const data = await apiFetch<ResourceItem[] | { items?: ResourceItem[] }>('/api/resources');
      const list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
      setResources(list);
    } catch {
      setResources([]);
    }
  }, []);

  useEffect(() => {
    loadResources();
    getCurrentCoordinates().then(setCoords);
  }, [loadResources]);

  const categories = Array.from(new Set(resources.map((item) => item.category).filter(Boolean))) as string[];
  const items = resources.filter((item) => {
    const haystack = `${item.title} ${item.type || ''} ${item.category || ''}`.toLowerCase();
    const matchesQuery = haystack.includes(query.toLowerCase());
    const matchesCategory = !category || item.category === category;
    return matchesQuery && matchesCategory;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await loadResources();
    setRefreshKey((value) => value + 1);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ResourcesChrome
        activeTab={tab}
        onTabChange={setTab}
        onAvatarPress={() => setPanelOpen(true)}
        sectionTitle={SECTION_TITLES[tab]}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {tab === 'home' ? (
          <View>
            <Text style={styles.hello}>Hi {user?.name?.split(' ')[0] || 'there'}</Text>
            <Text style={styles.title}>Resources</Text>
            <Text style={styles.subtitle}>Guides, tools, and support you can reach for anytime.</Text>
            <View style={styles.search}>
              <Ionicons name="search-outline" size={18} color="#7A828C" />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search resources..." style={styles.searchInput} placeholderTextColor="#8B949E" />
            </View>
            {categories.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
                <TouchableOpacity onPress={() => setCategory('')} style={[styles.filter, !category && styles.filterActive]}>
                  <Text style={[styles.filterText, !category && styles.filterTextActive]}>All</Text>
                </TouchableOpacity>
                {categories.map((item) => (
                  <TouchableOpacity key={item} onPress={() => setCategory(item)} style={[styles.filter, category === item && styles.filterActive]}>
                    <Text style={[styles.filterText, category === item && styles.filterTextActive]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}
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
            {!items.length ? <Text style={styles.subtitle}>No resources match that search yet.</Text> : null}
          </View>
        ) : null}
        {tab === 'support' ? <CrisisSupportPanel key={`support-${refreshKey}`} coords={coords} /> : null}
        {tab === 'directory' ? <CrisisDirectoryPanel key={`directory-${refreshKey}`} coords={coords} /> : null}
        {tab === 'saved' ? <CrisisSavedPanel key={`saved-${refreshKey}`} /> : null}
        {tab === 'admin' ? <CrisisAdminPanel key={`admin-${refreshKey}`} /> : null}
      </ScrollView>
      <SidePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F7FB' },
  content: { padding: 16, paddingBottom: 40 },
  hello: { color: '#6B7380', fontWeight: '700', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: '#1C242C' },
  subtitle: { color: '#6B7380', marginTop: 4, marginBottom: 16 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E7ECF1', paddingHorizontal: 12, marginBottom: 12 },
  searchInput: { flex: 1, paddingVertical: 12, color: '#1C242C' },
  filters: { gap: 8, marginBottom: 16 },
  filter: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7ECF1', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  filterActive: { backgroundColor: BRAND, borderColor: BRAND },
  filterText: { color: '#6B7380', fontWeight: '700', fontSize: 13 },
  filterTextActive: { color: '#FFFFFF' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E7ECF1' },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E7F1F8', alignItems: 'center', justifyContent: 'center' },
  type: { fontSize: 10, fontWeight: '800', color: '#8B949E', marginBottom: 2 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1C242C' },
  meta: { color: '#6B7380', marginTop: 4, fontSize: 13 },
});
