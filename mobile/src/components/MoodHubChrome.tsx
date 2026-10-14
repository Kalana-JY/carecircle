import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/store/AuthContext';
import heroBanner from '../../assets/images/hero-banner.png';
import heroBench from '../../assets/images/hero-slide-bench.png';
import heroMeditate from '../../assets/images/hero-slide-meditate.png';

const HERO_SLIDES = [heroBanner, heroMeditate, heroBench];
const HERO_INTERVAL_MS = 2000;

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

export function ProfileAvatar({ name, uri, size = 40 }: { name?: string; uri?: string; size?: number }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return <Text style={styles.avatarText}>{getInitials(name)}</Text>;
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
  const [slide, setSlide] = useState(0);
  const [previousSlide, setPreviousSlide] = useState(0);
  const slideRef = useRef(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      const current = slideRef.current;
      const next = (current + 1) % HERO_SLIDES.length;
      setPreviousSlide(current);
      slideRef.current = next;
      setSlide(next);
      fade.setValue(0);
      Animated.timing(fade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, HERO_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      fade.stopAnimation();
    };
  }, [fade]);

  return (
    <View>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onAvatarPress}
          style={styles.avatar}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <ProfileAvatar name={user?.name} uri={user?.avatarUrl} size={40} />
        </TouchableOpacity>
        <Text style={styles.brand}>CareCircle</Text>
      </View>

      <View style={styles.hero}>
        <Image source={HERO_SLIDES[previousSlide]} style={styles.heroFill} resizeMode="cover" />
        <Animated.Image
          source={HERO_SLIDES[slide]}
          style={[styles.heroFill, { opacity: fade }]}
          resizeMode="cover"
        />
        <View style={styles.heroScrim} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroGreeting}>{greetingForNow(user?.name)}</Text>
          <Text style={styles.heroDate}>{longDateLabel()}</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => onTabChange(tab.key)}
              style={[styles.tab, selected && styles.tabActive]}
              activeOpacity={0.85}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={tab.label}
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
    borderRadius: 22,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroFill: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 24, 32, 0.45)',
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
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
