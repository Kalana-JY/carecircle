import React from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/store/AuthContext';
import heroBanner from '../../assets/images/hero-banner.png';

const BRAND = '#3A7CA5';

export type HubTab = 'moods' | 'journal' | 'progress' | 'reminder';

const TABS: { key: HubTab; label: string }[] = [
  { key: 'moods', label: 'My Moods' },
  { key: 'journal', label: 'Journal' },
  { key: 'progress', label: 'Progress' },
  { key: 'reminder', label: 'Reminder' },
];

export function greetingForNow(name?: string) {
  const hour = new Date().getHours();
  const first = name?.split(' ')[0] || 'there';
  if (hour < 12) return `Good morning, ${first}`;
  if (hour < 17) return `Good afternoon, ${first}`;
  return `Good evening, ${first}`;
}

export function longDateLabel() {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
}

export function getInitials(name?: string) {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

type ChromeProps = {
  activeTab: HubTab;
  onTabChange: (tab: HubTab) => void;
  onAvatarPress: () => void;
};

export function MoodHubChrome({ activeTab, onTabChange, onAvatarPress }: ChromeProps) {
  const { user } = useAuth();

  return (
    <View>
      <View style={styles.header}>
        <TouchableOpacity onPress={onAvatarPress} style={styles.avatar} activeOpacity={0.8}>
          <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
        </TouchableOpacity>
        <Text style={styles.brand}>CareCircle</Text>
      </View>

      <ImageBackground source={heroBanner} style={styles.hero} imageStyle={styles.heroImage}>
        <View style={styles.heroScrim} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroGreeting}>{greetingForNow(user?.name)}</Text>
          <Text style={styles.heroDate}>{longDateLabel()}</Text>
        </View>
      </ImageBackground>

      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => onTabChange(tab.key)}
              style={[styles.tab, selected && styles.tabActive]}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  avatarText: {
    color: BRAND,
    fontWeight: '800',
    fontSize: 13,
  },
  brand: {
    color: BRAND,
    fontSize: 26,
    fontWeight: '700',
    fontFamily: Fonts.serif || Fonts.rounded || 'System',
  },
  hero: {
    marginHorizontal: 16,
    height: 168,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroImage: {
    borderRadius: 22,
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 24, 32, 0.18)',
    borderRadius: 22,
  },
  heroCopy: {
    padding: 16,
  },
  heroGreeting: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  heroDate: {
    color: '#FFFFFF',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 6,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  tabActive: {
    backgroundColor: BRAND,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5B6570',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
});
