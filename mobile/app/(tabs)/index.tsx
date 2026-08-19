import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Fonts } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface CircleItem {
  id: string;
  name: string;
  members: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface ResourceItem {
  id: string;
  title: string;
  duration: string;
  icon: keyof typeof Ionicons.glyphMap;
  type: string;
}

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  // Dynamic Theme Colors
  const colors = {
    background: isDark ? '#121212' : '#F5F7FA',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#687076',
    border: isDark ? '#2E2E2E' : '#E6E8EB',
    brand: '#245B8B',
    brandLight: isDark ? '#1E3A5F' : '#E8F1F9',
    accentGreen: '#34C759',
    accentPurple: '#AF52DE',
    accentOrange: '#FF9500',
    avatarBg: isDark ? '#245B8B' : '#E8F1F9',
    avatarText: isDark ? '#FFFFFF' : '#245B8B',
    quoteBg: isDark ? '#1E293B' : '#EDF2F7',
  };

  const moods = [
    { label: 'Glad', emoji: '😊', value: 'glad' },
    { label: 'Calm', emoji: '😌', value: 'calm' },
    { label: 'Blue', emoji: '😔', value: 'blue' },
    { label: 'Anxious', emoji: '😰', value: 'anxious' },
    { label: 'Tired', emoji: '😴', value: 'tired' },
  ];

  const activeCircles: CircleItem[] = [
    { id: '1', name: 'Mindfulness & Breathing', members: 14, icon: 'flower-outline', color: colors.accentGreen },
    { id: '2', name: 'Anxiety Support Space', members: 9, icon: 'chatbubbles-outline', color: colors.brand },
    { id: '3', name: 'Daily Gratitude', members: 22, icon: 'heart-outline', color: colors.accentPurple },
    { id: '4', name: 'Grief & Healing', members: 6, icon: 'shield-checkmark-outline', color: colors.accentOrange },
  ];

  const quickResources: ResourceItem[] = [
    { id: '1', title: '5-Min Breathing Space', duration: '5 mins', icon: 'leaf-outline', type: 'Meditation' },
    { id: '2', title: 'Self-Compassion Check-in', duration: '10 mins', icon: 'heart-circle-outline', type: 'Audio Guide' },
    { id: '3', title: 'Stress Relief Journaling', duration: 'Daily Prompt', icon: 'book-outline', type: 'Journal' },
  ];

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      const confirmSignOut = window.confirm('Are you sure you want to sign out?');
      if (confirmSignOut) {
        signOut();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]);
    }
  };

  const handleMoodSelect = (moodLabel: string) => {
    setSelectedMood(moodLabel);
    router.push('/moods');
  };

  // Get user initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Sticky Custom Header */}
      <View style={[styles.header, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.headerProfile}>
          <View style={[styles.avatar, { backgroundColor: colors.avatarBg }]}>
            <Text style={[styles.avatarText, { color: colors.avatarText }]}>
              {getInitials(user?.name)}
            </Text>
          </View>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Hello,</Text>
            <Text style={[styles.name, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
              {user?.name || 'Guest User'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: colors.border }]}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={22} color="#E53935" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Mood Tracker Widget */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>How are you feeling today?</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Log your daily mood to track your emotional well-being.
          </Text>
          <View style={styles.moodRow}>
            {moods.map((mood) => {
              const isSelected = selectedMood === mood.label;
              return (
                <TouchableOpacity
                  key={mood.value}
                  style={[
                    styles.moodItem,
                    isSelected && {
                      backgroundColor: colors.brandLight,
                      borderColor: colors.brand,
                      transform: [{ scale: 1.05 }],
                    },
                    { borderColor: colors.border },
                  ]}
                  onPress={() => handleMoodSelect(mood.label)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  <Text style={[styles.moodLabel, { color: isSelected ? colors.brand : colors.textSecondary }]}>
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Daily Quote Sanctuary Widget */}
        <View style={[styles.quoteCard, { backgroundColor: colors.quoteBg }]}>
          <View style={styles.quoteIconRow}>
            <Ionicons name="chatbox-ellipses-outline" size={24} color={colors.brand} style={{ opacity: 0.6 }} />
          </View>
          <Text style={[styles.quoteText, { color: colors.text }]}>
            &quot;You don&apos;t have to control your thoughts. You just have to stop letting them control you.&quot;
          </Text>
          <Text style={[styles.quoteAuthor, { color: colors.textSecondary }]}>— Dan Millman</Text>
        </View>

        {/* Active Care Circles Horizontal Scroll */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
            Active Care Circles
          </Text>
          <TouchableOpacity onPress={() => Alert.alert('Explore Circles', 'Redirecting to exploration tab...')} activeOpacity={0.7}>
            <Text style={[styles.sectionLink, { color: colors.brand }]}>See All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.circlesContainer}
        >
          {activeCircles.map((circle) => (
            <TouchableOpacity
              key={circle.id}
              style={[
                styles.circleCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              activeOpacity={0.8}
              onPress={() => Alert.alert('Join Circle', `Would you like to enter the "${circle.name}" circle?`)}
            >
              {/* Colored left bar for design aesthetic */}
              <View style={[styles.leftAccentBar, { backgroundColor: circle.color }]} />
              <View style={styles.circleHeader}>
                <View style={[styles.circleIconContainer, { backgroundColor: circle.color + '1A' }]}>
                  <Ionicons name={circle.icon} size={22} color={circle.color} />
                </View>
                <View style={styles.badge}>
                  <Text style={[styles.badgeText, { color: colors.textSecondary }]}>Active</Text>
                </View>
              </View>
              <Text style={[styles.circleName, { color: colors.text }]} numberOfLines={2}>
                {circle.name}
              </Text>
              <View style={styles.circleFooter}>
                <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
                  {circle.members} online
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Self-Care Resources */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
            Self-Care Tools
          </Text>
        </View>

        <View style={styles.resourcesList}>
          {quickResources.map((resource) => (
            <TouchableOpacity
              key={resource.id}
              style={[
                styles.resourceRow,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              activeOpacity={0.8}
              onPress={() => resource.type === 'Journal' ? router.push('/journals') : Alert.alert('Start Activity', `Launching "${resource.title}"...`)}
            >
              <View style={styles.resourceLeft}>
                <View style={[styles.resourceIconBg, { backgroundColor: colors.brandLight }]}>
                  <Ionicons name={resource.icon} size={22} color={colors.brand} />
                </View>
                <View style={styles.resourceDetails}>
                  <Text style={[styles.resourceType, { color: colors.textSecondary }]}>
                    {resource.type}
                  </Text>
                  <Text style={[styles.resourceTitle, { color: colors.text }]} numberOfLines={1}>
                    {resource.title}
                  </Text>
                </View>
              </View>
              <View style={styles.resourceRight}>
                <Text style={[styles.resourceDuration, { color: colors.textSecondary }]}>
                  {resource.duration}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  signOutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moodItem: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    width: (width - 80) / 5,
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  moodLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  quoteCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  quoteIconRow: {
    marginBottom: 8,
  },
  quoteText: {
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  circlesContainer: {
    paddingRight: 20,
    paddingBottom: 24,
    gap: 14,
  },
  circleCard: {
    width: 170,
    height: 140,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
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
  leftAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  circleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  circleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#28cd41',
  },
  circleName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  circleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  resourcesList: {
    gap: 12,
  },
  resourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  resourceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  resourceIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceDetails: {
    flex: 1,
  },
  resourceType: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  resourceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resourceDuration: {
    fontSize: 12,
    fontWeight: '500',
  },
});
