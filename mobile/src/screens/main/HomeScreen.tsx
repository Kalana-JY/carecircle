import React, { useEffect, useState, useMemo } from 'react';
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
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainStackNavigationProp, MainTabParamList } from '../../navigation/MainNavigator';
import { useAuth } from '@/store/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Fonts } from '@/constants/theme';
import { dateOnly, journalApi, JournalEntry, moodApi, MoodEntry } from '@/services/api';
import { SidePanel } from '../../components/SidePanel';

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

// 5 Expressive Vector Mood Faces matching the mockup design
function ExpressiveMoodFace({
  type,
  size = 46,
  isSelected,
}: {
  type: 'terrible' | 'bad' | 'neutral' | 'good' | 'great';
  size?: number;
  isSelected?: boolean;
}) {
  const configs = {
    terrible: {
      bgColor: '#EB4D4B',
      eyebrows: true,
      mouthType: 'frown_angled',
    },
    bad: {
      bgColor: '#FA8231',
      eyebrows: false,
      mouthType: 'frown',
    },
    neutral: {
      bgColor: '#778CA3',
      eyebrows: false,
      mouthType: 'neutral',
    },
    good: {
      bgColor: '#20BF6B',
      eyebrows: false,
      mouthType: 'smile',
    },
    great: {
      bgColor: '#26DE81',
      eyebrows: false,
      mouthType: 'wide_smile',
    },
  };

  const cfg = configs[type];
  const radius = size / 2;

  return (
    <View
      style={[
        styles.moodFaceCircle,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: cfg.bgColor,
          transform: isSelected ? [{ scale: 1.12 }] : [{ scale: 1 }],
          borderWidth: isSelected ? 3 : 0,
          borderColor: '#FFFFFF',
          shadowColor: cfg.bgColor,
          shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
          shadowOpacity: isSelected ? 0.45 : 0.25,
          shadowRadius: isSelected ? 6 : 3,
          elevation: isSelected ? 5 : 2,
        },
      ]}
    >
      {/* Eyes & Eyebrows */}
      <View style={{ width: size * 0.54, flexDirection: 'row', justifyContent: 'space-between', marginTop: -2 }}>
        {/* Left Eye */}
        <View style={{ alignItems: 'center' }}>
          {cfg.eyebrows && (
            <View
              style={{
                width: 7,
                height: 2.5,
                backgroundColor: '#FFFFFF',
                borderRadius: 1,
                transform: [{ rotate: '25deg' }],
                marginBottom: 2,
              }}
            />
          )}
          <View style={{ width: 5.5, height: 5.5, borderRadius: 3, backgroundColor: '#FFFFFF' }} />
        </View>

        {/* Right Eye */}
        <View style={{ alignItems: 'center' }}>
          {cfg.eyebrows && (
            <View
              style={{
                width: 7,
                height: 2.5,
                backgroundColor: '#FFFFFF',
                borderRadius: 1,
                transform: [{ rotate: '-25deg' }],
                marginBottom: 2,
              }}
            />
          )}
          <View style={{ width: 5.5, height: 5.5, borderRadius: 3, backgroundColor: '#FFFFFF' }} />
        </View>
      </View>

      {/* Mouth */}
      {cfg.mouthType === 'frown_angled' && (
        <View
          style={{
            width: 14,
            height: 7,
            borderTopWidth: 3,
            borderColor: '#FFFFFF',
            borderTopLeftRadius: 7,
            borderTopRightRadius: 7,
            marginTop: 4,
          }}
        />
      )}
      {cfg.mouthType === 'frown' && (
        <View
          style={{
            width: 14,
            height: 7,
            borderTopWidth: 3,
            borderColor: '#FFFFFF',
            borderTopLeftRadius: 7,
            borderTopRightRadius: 7,
            marginTop: 5,
          }}
        />
      )}
      {cfg.mouthType === 'neutral' && (
        <View
          style={{
            width: 14,
            height: 3,
            backgroundColor: '#FFFFFF',
            borderRadius: 1.5,
            marginTop: 6,
          }}
        />
      )}
      {cfg.mouthType === 'smile' && (
        <View
          style={{
            width: 14,
            height: 7,
            borderBottomWidth: 3,
            borderColor: '#FFFFFF',
            borderBottomLeftRadius: 7,
            borderBottomRightRadius: 7,
            marginTop: 4,
          }}
        />
      )}
      {cfg.mouthType === 'wide_smile' && (
        <View
          style={{
            width: 16,
            height: 8,
            backgroundColor: '#FFFFFF',
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            marginTop: 4,
          }}
        />
      )}
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<CompositeNavigationProp<BottomTabNavigationProp<MainTabParamList, 'Home'>, MainStackNavigationProp>>();
  const isDark = useColorScheme() === 'dark';
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  
  // Custom Side Panel State

  // Dynamic Theme Colors
  const colors = {
    background: isDark ? '#121212' : '#F5F7FA',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#687076',
    border: isDark ? '#2E2E2E' : '#E6E8EB',
    brand: '#245B8B',
    brandLight: isDark ? '#1E3A5F' : '#E8F1F9',
    heroBlue: isDark ? '#3B6FB6' : '#5586EE',
    actionBlue: isDark ? '#4672BE' : '#6892E8',
    supporterBlue: isDark ? '#4672BE' : '#6892E8',
    accentGreen: '#34C759',
    accentPurple: '#AF52DE',
    accentOrange: '#FF9500',
    quoteBg: isDark ? '#1E293B' : '#EDF2F7',
  };

  const moodOptions: { id: string; label: string; type: 'terrible' | 'bad' | 'neutral' | 'good' | 'great'; value: string }[] = [
    { id: '1', label: 'Awful', type: 'terrible', value: 'terrible' },
    { id: '2', label: 'Bad', type: 'bad', value: 'bad' },
    { id: '3', label: 'Okay', type: 'neutral', value: 'neutral' },
    { id: '4', label: 'Good', type: 'good', value: 'good' },
    { id: '5', label: 'Great', type: 'great', value: 'great' },
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

  useEffect(() => {
    Promise.all([moodApi.list(1), journalApi.list(1)])
      .then(([moodsResponse, journalsResponse]) => {
        setMoodHistory(moodsResponse.items.slice(0, 7));
        setJournalEntries(journalsResponse.items.slice(0, 2));
      })
      .catch(() => {
        setMoodHistory([]);
        setJournalEntries([]);
      });
  }, []);

  const handleMoodSelect = (moodItem: typeof moodOptions[0]) => {
    setSelectedMood(moodItem.id);
    navigation.navigate('Mood', { selectedMood: moodItem.label, hubTab: 'moods' });
  };

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning!';
    if (hour < 17) return 'Good Afternoon!';
    return 'Good Evening!';
  }, []);

  // Formatted date string (e.g. Thursday, October 1)
  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Top Header matching mockup */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          onPress={() => setIsSidePanelOpen(true)}
          style={styles.headerBtn}
          hitSlop={12}
          accessibilityLabel="Open side menu"
        >
          <Ionicons name="menu-outline" size={28} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
          Home
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          style={styles.headerBtn}
          hitSlop={12}
          accessibilityLabel="View notifications"
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================================= */}
        {/* 1. HERO GREETING BANNER CARD                                              */}
        {/* ========================================================================= */}
        <View style={[styles.heroCard, { backgroundColor: colors.heroBlue }]}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroGreeting}>{greeting}</Text>
            <Text style={styles.heroUserName} numberOfLines={1}>
              {user?.name || 'Jason Smith'}
            </Text>
            <Text style={styles.heroDate}>{formattedDate}</Text>
          </View>
          <View style={styles.heroImageContainer}>
            <Image
              source={require('../../../assets/images/home_hero_thoughts.png')}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* ========================================================================= */}
        {/* 2. TWO ACTION CARDS ROW (Chat with Community & Take a Session)            */}
        {/* ========================================================================= */}
        <View style={styles.actionRow}>
          {/* Card 1: Chat with Community */}
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.actionBlue }]}
            onPress={() => navigation.navigate('Community')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionCardTitle}>Chat with{'\n'}Community</Text>
            <Image
              source={require('../../../assets/images/home_chat_community.png')}
              style={styles.actionCardImage}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Card 2: Take a Session with Peer */}
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.actionBlue }]}
            onPress={() => navigation.navigate('BookSession')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionCardTitle}>Take a Session{'\n'}with Peer</Text>
            <Image
              source={require('../../../assets/images/home_take_session.png')}
              style={styles.actionCardImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* ========================================================================= */}
        {/* 3. MOOD CHECK-IN CARD ("How do you feel today?")                           */}
        {/* ========================================================================= */}
        <View style={[styles.moodCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.moodCardTitle, { color: colors.text }]}>
            How do you feel today?
          </Text>
          <View style={styles.moodFacesRow}>
            {moodOptions.map((mood) => {
              const isSelected = selectedMood === mood.id;
              return (
                <TouchableOpacity
                  key={mood.id}
                  onPress={() => handleMoodSelect(mood)}
                  activeOpacity={0.75}
                  style={styles.moodFaceBtn}
                  accessibilityLabel={`Select ${mood.label} mood`}
                >
                  <ExpressiveMoodFace
                    type={mood.type}
                    size={48}
                    isSelected={isSelected}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ========================================================================= */}
        {/* 4. BECOME A PEER SUPPORTER BANNER                                         */}
        {/* ========================================================================= */}
        <TouchableOpacity
          style={[styles.supporterBanner, { backgroundColor: colors.supporterBlue }]}
          onPress={() => navigation.navigate('BecomeSupporter')}
          activeOpacity={0.82}
        >
          <View style={styles.supporterLeft}>
            <Text style={styles.supporterBannerText}>
              Would you like to{'\n'}Become a Peer Supporter
            </Text>
          </View>
          <View style={styles.supporterImageContainer}>
            <Image
              source={require('../../../assets/images/home_become_supporter.png')}
              style={styles.supporterBannerImage}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>

        {/* ========================================================================= */}
        {/* 5. DAILY QUOTE SANCTUARY WIDGET                                           */}
        {/* ========================================================================= */}
        <View style={[styles.quoteCard, { backgroundColor: colors.quoteBg }]}>
          <View style={styles.quoteIconRow}>
            <Ionicons name="chatbox-ellipses-outline" size={24} color={colors.brand} style={{ opacity: 0.6 }} />
          </View>
          <Text style={[styles.quoteText, { color: colors.text }]}>
            &quot;You don&apos;t have to control your thoughts. You just have to stop letting them control you.&quot;
          </Text>
          <Text style={[styles.quoteAuthor, { color: colors.textSecondary }]}>— Dan Millman</Text>
        </View>

        {/* ========================================================================= */}
        {/* 6. ACTIVE CARE CIRCLES HORIZONTAL SCROLL                                  */}
        {/* ========================================================================= */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
            Active Care Circles
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Community')} activeOpacity={0.7}>
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

        {/* ========================================================================= */}
        {/* 7. SELF-CARE TOOLS                                                        */}
        {/* ========================================================================= */}
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
              onPress={() => resource.type === 'Journal' ? navigation.navigate('Mood', { hubTab: 'journal' }) : navigation.navigate('Resources')}
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

        <View style={{ height: 20 }} />
      </ScrollView>

      <SidePanel isOpen={isSidePanelOpen} onClose={() => setIsSidePanelOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  headerBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  // 1. Hero Greeting Card
  heroCard: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    minHeight: 128,
    ...Platform.select({
      ios: {
        shadowColor: '#245B8B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  heroLeft: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  heroGreeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  heroUserName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  heroDate: {
    fontSize: 13,
    fontWeight: '500',
    color: '#DCE7FA',
  },
  heroImageContainer: {
    width: 110,
    height: 105,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: 105,
    height: 100,
  },
  // 2. Action Cards Row
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    height: 106,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#245B8B',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 19,
    flex: 1,
    paddingRight: 4,
  },
  actionCardImage: {
    width: 62,
    height: 68,
  },
  // 3. Mood Card
  moodCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  moodCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  moodFacesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 6,
  },
  moodFaceBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  moodFaceCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 4. Become a Supporter Banner
  supporterBanner: {
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    minHeight: 88,
    ...Platform.select({
      ios: {
        shadowColor: '#245B8B',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  supporterLeft: {
    flex: 1,
    paddingRight: 8,
  },
  supporterBannerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 21,
  },
  supporterImageContainer: {
    width: 80,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supporterBannerImage: {
    width: 78,
    height: 68,
  },
  // Other Sections (Quote, Circles, Resources)
  quoteCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  quoteIconRow: {
    marginBottom: 6,
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 6,
  },
  quoteAuthor: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  circlesContainer: {
    paddingRight: 16,
    paddingBottom: 20,
    gap: 12,
  },
  circleCard: {
    width: 165,
    height: 135,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
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
    width: 34,
    height: 34,
    borderRadius: 17,
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
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  circleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  resourcesList: {
    gap: 10,
  },
  resourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  resourceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  resourceIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    fontSize: 13,
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
