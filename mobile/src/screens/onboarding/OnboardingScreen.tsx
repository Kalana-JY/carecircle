import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  Animated,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { tokenStorage } from '@/services/storage';
import { Fonts } from '@/constants/theme';
import ccLogo from '../../../assets/images/cc_logo.png';
import homeChatCommunity from '../../../assets/images/home_chat_community.png';
import homeTakeSession from '../../../assets/images/home_take_session.png';
import homeBecomeSupporter from '../../../assets/images/home_become_supporter.png';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingSlideData {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  featureTags: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string }>;
  image: any;
  mockType: 'community' | 'mood_goals' | 'resources_crisis';
}

const SLIDES: OnboardingSlideData[] = [
  {
    id: '1',
    badge: 'Connect & Share',
    title: 'Peer Support Chat & Community Forum',
    subtitle:
      'Find your safe space to speak and listen. Engage in moderated community forums and seamlessly schedule private 1-on-1 sessions with empathetic listeners.',
    featureTags: [
      { icon: 'chatbubbles', label: 'Peer Support Chat & Community Forum' },
      { icon: 'calendar', label: 'Session Scheduling' },
    ],
    image: homeChatCommunity,
    mockType: 'community',
  },
  {
    id: '2',
    badge: 'Awareness & Growth',
    title: 'Mood & Wellbeing Tracker',
    subtitle:
      'Log your daily emotions to visualize trends over time, and build lasting emotional habits with personalized Goal Setting & Progress Tracking.',
    featureTags: [
      { icon: 'heart', label: 'Mood & Wellbeing Tracker' },
      { icon: 'trending-up', label: 'Goal Setting & Progress Tracker' },
    ],
    image: homeBecomeSupporter,
    mockType: 'mood_goals',
  },
  {
    id: '3',
    badge: 'Safety & Knowledge',
    title: 'Resource Library & Crisis Support Directory',
    subtitle:
      'Explore evidence-based mental health articles, breathing guides, and access immediate confidential help through our 24/7 verified crisis support directory.',
    featureTags: [
      { icon: 'book', label: 'Resource Library' },
      { icon: 'shield-checkmark', label: 'Crisis Support Directory' },
    ],
    image: homeTakeSession,
    mockType: 'resources_crisis',
  },
];

interface OnboardingScreenProps {
  onComplete?: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const statusBarHeight = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const handleFinish = async () => {
    try {
      await tokenStorage.setItem('has_seen_onboarding', 'true');
    } catch (e) {
      console.warn('Failed to save onboarding flag:', e);
    }

    if (onComplete) {
      onComplete();
    } else {
      // Navigate to Login in AuthNavigator or replace
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Login');
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * SCREEN_WIDTH,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / SCREEN_WIDTH);
        if (index !== currentIndex && index >= 0 && index < SLIDES.length) {
          setCurrentIndex(index);
        }
      },
    }
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#285F8E"
        translucent={Platform.OS === 'android'}
      />

      {/* Horizontal Carousel */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
        bounces={false}
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            {/* Top Half: Brand Background with Realistic Phone Mockup Preview */}
            <View
              style={[
                styles.topSection,
                {
                  paddingTop: statusBarHeight + 10,
                  height: Math.max(SCREEN_HEIGHT * 0.52, 330 + statusBarHeight),
                },
              ]}
            >
              {/* Top ambient lights */}
              <View style={styles.topOrb1} />
              <View style={styles.topOrb2} />


              {/* Minimal Brand Header */}
              <View style={styles.slideBrandHeader}>
                <Image
                  source={ccLogo}
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
                <Text style={styles.headerBrandText}>CareCircle</Text>
              </View>

              {/* Mini App UI Mockup Frame (Matches reference mockup layout) */}
              <View style={styles.mockupContainer}>
                <View style={styles.mockupPhone}>
                  {/* Phone Speaker Notch */}
                  <View style={styles.phoneDynamicIsland} />

                  {/* Mockup Inner Content according to slide type */}
                  {slide.mockType === 'community' && (
                    <View style={styles.mockupInner}>
                      {/* Mockup Header */}
                      <View style={styles.mockHeaderRow}>
                        <View style={styles.mockHeaderAvatar}>
                          <Ionicons name="people" size={14} color="#285F8E" />
                        </View>
                        <Text style={styles.mockHeaderTitle}>Community & Sessions</Text>
                        <Ionicons name="search" size={14} color="#727780" />
                      </View>

                      {/* Chat Community Card Preview */}
                      <View style={styles.mockChatCard}>
                        <View style={styles.mockChatHeader}>
                          <View style={styles.mockDotActive} />
                          <Text style={styles.mockChatTitle}>Anxiety & Healing Circle</Text>
                          <Text style={styles.mockChatTime}>Active</Text>
                        </View>
                        <View style={styles.mockChatBubble}>
                          <Text style={styles.mockChatText}>
                            "You are never alone. We are here to support you."
                          </Text>
                        </View>
                      </View>

                      {/* Session Scheduling Preview */}
                      <View style={styles.mockSessionCard}>
                        <Image
                          source={slide.image}
                          style={styles.mockSessionImage}
                          resizeMode="contain"
                        />
                        <View style={styles.mockSessionInfo}>
                          <Text style={styles.mockSessionTag}>📅 Next Session</Text>
                          <Text style={styles.mockSessionPeer}>With Sarah M. (Peer Guide)</Text>
                          <Text style={styles.mockSessionTime}>Today • 4:30 PM (Confirmed)</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {slide.mockType === 'mood_goals' && (
                    <View style={styles.mockupInner}>
                      {/* Mockup Header */}
                      <View style={styles.mockHeaderRow}>
                        <Ionicons name="sparkles" size={14} color="#285F8E" />
                        <Text style={styles.mockHeaderTitle}>Daily Check-In & Goals</Text>
                        <Ionicons name="notifications-outline" size={14} color="#727780" />
                      </View>

                      {/* Mood Faces Row */}
                      <View style={styles.mockMoodContainer}>
                        <Text style={styles.mockMoodTitle}>How do you feel today?</Text>
                        <View style={styles.mockMoodRow}>
                          <View style={[styles.mockMoodFace, { backgroundColor: '#EB4D4B' }]}>
                            <Text style={styles.mockMoodEmoji}>😞</Text>
                          </View>
                          <View style={[styles.mockMoodFace, { backgroundColor: '#FA8231' }]}>
                            <Text style={styles.mockMoodEmoji}>🙁</Text>
                          </View>
                          <View style={[styles.mockMoodFace, { backgroundColor: '#778CA3' }]}>
                            <Text style={styles.mockMoodEmoji}>😐</Text>
                          </View>
                          <View style={[styles.mockMoodFace, { backgroundColor: '#20BF6B', transform: [{ scale: 1.15 }] }]}>
                            <Text style={styles.mockMoodEmoji}>😊</Text>
                          </View>
                          <View style={[styles.mockMoodFace, { backgroundColor: '#26DE81' }]}>
                            <Text style={styles.mockMoodEmoji}>🌟</Text>
                          </View>
                        </View>
                      </View>

                      {/* Goal Streak & Progress Tracker */}
                      <View style={styles.mockGoalCard}>
                        <View style={styles.mockGoalHeader}>
                          <View style={styles.mockStreakBadge}>
                            <Text style={styles.mockStreakText}>🔥 5-Day Streak</Text>
                          </View>
                          <Text style={styles.mockGoalPercent}>80% Done</Text>
                        </View>
                        <Text style={styles.mockGoalTask}>Mindful Breathing & Journaling</Text>
                        <View style={styles.mockProgressBar}>
                          <View style={styles.mockProgressFill} />
                        </View>
                      </View>
                    </View>
                  )}

                  {slide.mockType === 'resources_crisis' && (
                    <View style={styles.mockupInner}>
                      {/* Mockup Header */}
                      <View style={styles.mockHeaderRow}>
                        <Ionicons name="library" size={14} color="#285F8E" />
                        <Text style={styles.mockHeaderTitle}>Resources & Crisis SOS</Text>
                        <Ionicons name="bookmark-outline" size={14} color="#727780" />
                      </View>

                      {/* Crisis Support Hotline Banner */}
                      <View style={styles.mockCrisisCard}>
                        <View style={styles.mockCrisisIconWrap}>
                          <Ionicons name="call" size={16} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.mockCrisisTitle}>24/7 Crisis Support Directory</Text>
                          <Text style={styles.mockCrisisDesc}>Free, confidential mental health lifeline</Text>
                        </View>
                        <View style={styles.mockSosChip}>
                          <Text style={styles.mockSosChipText}>CALL 988</Text>
                        </View>
                      </View>

                      {/* Curated Resource Article Preview */}
                      <View style={styles.mockResourceCard}>
                        <View style={styles.mockResourceIconWrap}>
                          <Ionicons name="leaf" size={16} color="#3E6658" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.mockResourceTag}>GUIDE • 5 MIN</Text>
                          <Text style={styles.mockResourceTitle}>5 Grounding Techniques for Panic</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#727780" />
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Curved Wave Scallop Transition (Directly matches reference wave design) */}
              <View style={styles.curvedWaveWrapper} pointerEvents="none">
                <View style={styles.waveArc} />
              </View>
            </View>

            {/* Bottom Half: White Surface Card with Typography, Features & Actions */}
            <View
              style={[
                styles.bottomSection,
                { paddingBottom: Math.max(insets.bottom, 24) },
              ]}
            >
              {/* Category Pill Tag */}
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>{slide.badge}</Text>
              </View>

              {/* Main Headline */}
              <Text
                style={[
                  styles.title,
                  { fontFamily: Fonts.rounded || 'System' },
                ]}
                numberOfLines={2}
              >
                {slide.title}
              </Text>

              {/* Description Body */}
              <Text style={styles.subtitle}>{slide.subtitle}</Text>

              {/* Highlighted Feature Chips */}
              <View style={styles.featureChipsRow}>
                {slide.featureTags.map((tag, tagIdx) => (
                  <View key={tagIdx} style={styles.featureChip}>
                    <Ionicons name={tag.icon} size={14} color="#285F8E" style={{ marginRight: 6 }} />
                    <Text style={styles.featureChipText}>{tag.label}</Text>
                  </View>
                ))}
              </View>

              {/* Pagination Dots (Active pill + Inactive circles) */}
              <View style={styles.paginationRow}>
                {SLIDES.map((_, dotIdx) => {
                  const isActive = dotIdx === currentIndex;
                  return (
                    <View
                      key={dotIdx}
                      style={[
                        styles.dot,
                        isActive ? styles.dotActive : styles.dotInactive,
                      ]}
                    />
                  );
                })}
              </View>

              {/* Action Buttons Row */}
              {index < SLIDES.length - 1 ? (
                <View style={styles.buttonRow}>
                  {/* Skip Button */}
                  <TouchableOpacity
                    style={styles.skipButton}
                    onPress={handleSkip}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.skipButtonText}>Skip</Text>
                  </TouchableOpacity>

                  {/* Continue Button */}
                  <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handleNext}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.continueButtonText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              ) : (
                /* Final Screen: Full-width "Let's Get Started" Button */
                <TouchableOpacity
                  style={styles.getStartedButton}
                  onPress={handleFinish}
                  activeOpacity={0.85}
                >
                  <Text style={styles.getStartedButtonText}>Let's Get Started</Text>
                  <Ionicons name="arrow-forward-circle" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>

  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#285F8E', // Primary brand color
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: '100%',
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  // Top Half Area
  topSection: {
    height: SCREEN_HEIGHT * 0.52,
    backgroundColor: '#285F8E', // Primary Serene Blue
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    overflow: 'hidden',
  },
  topOrb1: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  topOrb2: {
    position: 'absolute',
    bottom: 80,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  slideBrandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    zIndex: 2,
  },
  headerLogo: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  headerBrandText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  // Mockup Frame
  mockupContainer: {
    width: SCREEN_WIDTH * 0.82,
    maxWidth: 320,
    height: SCREEN_HEIGHT * 0.38,
    alignItems: 'center',
    zIndex: 2,
  },
  mockupPhone: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 4,
    borderColor: '#4478A8', // Primary container blue border
    overflow: 'hidden',
    shadowColor: '#001D34',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  phoneDynamicIsland: {
    width: 48,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#181C1F',
    alignSelf: 'center',
    marginBottom: 8,
  },
  mockupInner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  mockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEEF2',
  },
  mockHeaderAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#CFE5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockHeaderTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#181C1F',
  },

  // Mock UI Elements: Slide 1
  mockChatCard: {
    backgroundColor: '#F1F4F7',
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
  },
  mockChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  mockDotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#20BF6B',
  },
  mockChatTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#285F8E',
    flex: 1,
  },
  mockChatTime: {
    fontSize: 9,
    color: '#727780',
  },
  mockChatBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#285F8E',
  },
  mockChatText: {
    fontSize: 10,
    color: '#41474F',
    fontStyle: 'italic',
  },
  mockSessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF3FB',
    borderRadius: 12,
    padding: 8,
    gap: 8,
    marginTop: 6,
  },
  mockSessionImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  mockSessionInfo: {
    flex: 1,
  },
  mockSessionTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#285F8E',
    textTransform: 'uppercase',
  },
  mockSessionPeer: {
    fontSize: 11,
    fontWeight: '600',
    color: '#181C1F',
  },
  mockSessionTime: {
    fontSize: 9,
    color: '#3E6658',
    fontWeight: '500',
  },

  // Mock UI Elements: Slide 2
  mockMoodContainer: {
    backgroundColor: '#F7FAFD',
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  mockMoodTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#181C1F',
    textAlign: 'center',
    marginBottom: 6,
  },
  mockMoodRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  mockMoodFace: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockMoodEmoji: {
    fontSize: 13,
  },
  mockGoalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#C0ECDA',
    marginTop: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mockGoalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  mockStreakBadge: {
    backgroundColor: '#FFF0E5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mockStreakText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FA8231',
  },
  mockGoalPercent: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3E6658',
  },
  mockGoalTask: {
    fontSize: 11,
    fontWeight: '600',
    color: '#181C1F',
    marginBottom: 6,
  },
  mockProgressBar: {
    height: 6,
    backgroundColor: '#EBEEF2',
    borderRadius: 3,
    overflow: 'hidden',
  },
  mockProgressFill: {
    width: '80%',
    height: '100%',
    backgroundColor: '#3E6658', // Secondary Sage Green
  },

  // Mock UI Elements: Slide 3
  mockCrisisCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFDAD6',
    borderRadius: 10,
    padding: 8,
    gap: 8,
    marginTop: 4,
  },
  mockCrisisIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#BA1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockCrisisTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#93000A',
  },
  mockCrisisDesc: {
    fontSize: 9,
    color: '#41474F',
  },
  mockSosChip: {
    backgroundColor: '#BA1A1A',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mockSosChipText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mockResourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F4F7',
    borderRadius: 10,
    padding: 8,
    gap: 8,
    marginTop: 6,
  },
  mockResourceIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#C0ECDA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockResourceTag: {
    fontSize: 8,
    fontWeight: '700',
    color: '#3E6658',
  },
  mockResourceTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#181C1F',
  },

  // Curved Wave Scallop Transition
  curvedWaveWrapper: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 38,
    overflow: 'hidden',
    alignItems: 'center',
    zIndex: 3,
  },
  waveArc: {
    position: 'absolute',
    top: 0,
    width: SCREEN_WIDTH * 1.35,
    height: 90,
    borderRadius: SCREEN_WIDTH * 0.68,
    backgroundColor: '#FFFFFF', // Smooth white scoop
  },

  // Bottom Section: White Surface Card
  bottomSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryPill: {
    alignSelf: 'center',
    backgroundColor: '#CFE5FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#001D34',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#181C1F',
    textAlign: 'center',
    lineHeight: 28,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#41474F',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
    marginBottom: 8,
  },

  // Feature Badges
  featureChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F4F7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E8EC',
  },
  featureChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#285F8E',
  },

  // Pagination Dots
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  dot: {
    height: 7,
    borderRadius: 3.5,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#285F8E', // Primary blue active pill
  },
  dotInactive: {
    width: 7,
    backgroundColor: '#D7DADE', // Slate inactive dot
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  skipButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F4F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#41474F',
  },
  continueButton: {
    flex: 1.5,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#285F8E',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#285F8E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  getStartedButton: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#285F8E',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#285F8E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  getStartedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
