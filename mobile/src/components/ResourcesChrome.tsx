import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { getInitials } from './MoodHubChrome';
import { useAuth } from '@/store/AuthContext';

export const BRAND = '#3A7CA5';

export type ResourceHubTab = 'home' | 'support' | 'directory' | 'saved' | 'admin';

const TABS: { key: ResourceHubTab; label: string; icon: keyof typeof Ionicons.glyphMap; adminOnly?: boolean }[] = [
  { key: 'home', label: 'Home', icon: 'home-outline' },
  { key: 'support', label: 'Support', icon: 'heart-outline' },
  { key: 'directory', label: 'Directory', icon: 'folder-outline' },
  { key: 'saved', label: 'Saved', icon: 'bookmark-outline' },
  { key: 'admin', label: 'Admin', icon: 'shield-outline', adminOnly: true },
];

type Props = {
  activeTab: ResourceHubTab;
  onTabChange: (tab: ResourceHubTab) => void;
  onAvatarPress: () => void;
  sectionTitle: string;
};

export function ResourcesChrome({ activeTab, onTabChange, onAvatarPress, sectionTitle }: Props) {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.isAdmin || user?.email?.toLowerCase().includes('admin'));
  const tabs = TABS.filter((tab) => !tab.adminOnly || isAdmin);

  return (
    <View>
      <View style={styles.header}>
        <TouchableOpacity onPress={onAvatarPress} style={styles.avatar} activeOpacity={0.8}>
          <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
        </TouchableOpacity>
        <View style={styles.brandWrap}>
          <Text style={styles.brand}>CareCircle</Text>
          <Text style={styles.section}>{sectionTitle}</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {tabs.map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <TouchableOpacity key={tab.key} onPress={() => onTabChange(tab.key)} style={styles.tab} activeOpacity={0.85}>
              <View style={[styles.iconWrap, selected && styles.iconWrapActive]}>
                <Ionicons name={tab.icon} size={18} color={selected ? '#FFFFFF' : BRAND} />
              </View>
              <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D7E6F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: BRAND, fontWeight: '800', fontSize: 13 },
  brandWrap: { alignItems: 'flex-end' },
  brand: {
    color: BRAND,
    fontSize: 26,
    fontWeight: '700',
    fontFamily: Fonts.serif || 'System',
  },
  section: { color: '#6B7380', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  tabs: { paddingHorizontal: 16, paddingBottom: 8, gap: 16 },
  tab: { alignItems: 'center', minWidth: 58 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E7F1F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  iconWrapActive: { backgroundColor: BRAND },
  tabLabel: { fontSize: 11, fontWeight: '700', color: '#6B7380' },
  tabLabelActive: { color: BRAND },
});
