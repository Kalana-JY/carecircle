import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { tokenStorage } from '@/services/storage';
import { Fonts } from '@/constants/theme';
import ccLogo from '../../../assets/images/cc_logo.png';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * OnboardingSlide2:
 * Focus: Mood & Wellbeing Tracker, and Goal Setting & Progress Tracker Tracking
 */
export const OnboardingSlide2: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const statusBarHeight = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  );

  const handleNext = () => {
    navigation.navigate('OnboardingSlide3');
  };

  const handleSkip = async () => {
    try {
      await tokenStorage.setItem('has_seen_onboarding', 'true');
    } catch (e) {
      console.warn(e);
    }
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#285F8E"
        translucent={Platform.OS === 'android'}
      />

      {/* Top Visual Area */}
      <View
        style={[
          styles.topSection,
          {
            paddingTop: statusBarHeight + 10,
            height: Math.max(SCREEN_HEIGHT * 0.52, 330 + statusBarHeight),
          },
        ]}
      >
        <View style={styles.slideBrandHeader}>
          <Image source={ccLogo} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerBrandText}>CareCircle</Text>
        </View>

        {/* Mock Preview Phone */}
        <View style={styles.mockupContainer}>
          <View style={styles.mockupPhone}>
            <View style={styles.phoneDynamicIsland} />

            <View style={styles.mockHeaderRow}>
              <Ionicons name="sparkles" size={14} color="#285F8E" />
              <Text style={styles.mockHeaderTitle}>Daily Check-In & Goals</Text>
              <Ionicons name="notifications-outline" size={14} color="#727780" />
            </View>


            {/* Feature 1: Mood & Wellbeing Tracker Preview */}
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

            {/* Feature 2: Goal Setting & Progress Tracker Preview */}
            <View style={styles.mockGoalCard}>
              <View style={styles.mockGoalHeader}>
                <View style={styles.mockStreakBadge}>
                  <Text style={styles.mockStreakText}>🔥 5-Day Streak</Text>
                </View>
                <Text style={styles.mockGoalPercent}>80% Done</Text>
              </View>
              <Text style={styles.mockGoalTask}>Goal Setting & Progress Tracker</Text>
              <View style={styles.mockProgressBar}>
                <View style={styles.mockProgressFill} />
              </View>
            </View>
          </View>
        </View>

        {/* Curved Wave Scallop Transition */}
        <View style={styles.curvedWaveWrapper} pointerEvents="none">
          <View style={styles.waveArc} />
        </View>
      </View>

      {/* Bottom Content Area */}
      <View
        style={[
          styles.bottomSection,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        <View style={styles.categoryPill}>
          <Text style={styles.categoryPillText}>Awareness & Growth</Text>
        </View>

        <Text style={[styles.title, { fontFamily: Fonts.rounded || 'System' }]}>
          Mood & Wellbeing Tracker
        </Text>

        <Text style={styles.subtitle}>
          Log your emotional check-ins daily to uncover wellbeing patterns, and build lasting resilience with Goal Setting & Progress Tracking.
        </Text>

        <View style={styles.featureChipsRow}>
          <View style={styles.featureChip}>
            <Ionicons name="heart" size={14} color="#285F8E" style={{ marginRight: 6 }} />
            <Text style={styles.featureChipText}>Mood & Wellbeing Tracker</Text>
          </View>
          <View style={styles.featureChip}>
            <Ionicons name="trending-up" size={14} color="#285F8E" style={{ marginRight: 6 }} />
            <Text style={styles.featureChipText}>Goal Setting & Progress Tracker</Text>
          </View>
        </View>

        {/* Pagination Dots (Dot 2 Active) */}
        <View style={styles.paginationRow}>
          <View style={[styles.dot, styles.dotInactive]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotInactive]} />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.7}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.continueButton} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </View>
    </View>

  );
};

export default OnboardingSlide2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#285F8E',
  },
  topSection: {
    height: SCREEN_HEIGHT * 0.52,
    backgroundColor: '#285F8E',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    overflow: 'hidden',
    position: 'relative',
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
  },
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
    borderColor: '#4478A8',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    justifyContent: 'space-between',
    elevation: 8,
  },
  phoneDynamicIsland: {
    width: 48,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#181C1F',
    alignSelf: 'center',
    marginBottom: 8,
  },
  mockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEEF2',
  },
  mockHeaderTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#181C1F',
  },
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
    backgroundColor: '#3E6658',
  },
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
    backgroundColor: '#FFFFFF',
  },
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
    backgroundColor: '#285F8E',
  },
  dotInactive: {
    width: 7,
    backgroundColor: '#D7DADE',
  },
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
});
