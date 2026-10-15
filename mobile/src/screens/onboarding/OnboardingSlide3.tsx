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
 * OnboardingSlide3:
 * Focus: Resource Library & Crisis Support Directory, and Final "Let's Get Started"
 */
export const OnboardingSlide3: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const statusBarHeight = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  );

  const handleFinish = async () => {
    try {
      await tokenStorage.setItem('has_seen_onboarding', 'true');
    } catch (e) {
      console.warn(e);
    }
    // Navigate to Login or Signup
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
              <Ionicons name="library" size={14} color="#285F8E" />
              <Text style={styles.mockHeaderTitle}>Resources & Crisis SOS</Text>
              <Ionicons name="bookmark-outline" size={14} color="#727780" />
            </View>


            {/* Feature 1: Crisis Support Directory Preview */}
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

            {/* Feature 2: Resource Library Preview */}
            <View style={styles.mockResourceCard}>
              <View style={styles.mockResourceIconWrap}>
                <Ionicons name="leaf" size={16} color="#3E6658" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mockResourceTag}>RESOURCE LIBRARY • 5 MIN</Text>
                <Text style={styles.mockResourceTitle}>5 Grounding Techniques for Panic</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#727780" />
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
          <Text style={styles.categoryPillText}>Safety & Knowledge</Text>
        </View>

        <Text style={[styles.title, { fontFamily: Fonts.rounded || 'System' }]}>
          Resource Library & Crisis Support Directory
        </Text>

        <Text style={styles.subtitle}>
          Explore evidence-based mental health articles, breathing exercises, and access 24/7 immediate help through our verified Crisis Support Directory.
        </Text>

        <View style={styles.featureChipsRow}>
          <View style={styles.featureChip}>
            <Ionicons name="book" size={14} color="#285F8E" style={{ marginRight: 6 }} />
            <Text style={styles.featureChipText}>Resource Library</Text>
          </View>
          <View style={styles.featureChip}>
            <Ionicons name="shield-checkmark" size={14} color="#285F8E" style={{ marginRight: 6 }} />
            <Text style={styles.featureChipText}>Crisis Support Directory</Text>
          </View>
        </View>

        {/* Pagination Dots (Dot 3 Active) */}
        <View style={styles.paginationRow}>
          <View style={[styles.dot, styles.dotInactive]} />
          <View style={[styles.dot, styles.dotInactive]} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>

        {/* Full-width Final "Let's Get Started" Action */}
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={handleFinish}
          activeOpacity={0.85}
        >
          <Text style={styles.getStartedButtonText}>Let's Get Started</Text>
          <Ionicons name="arrow-forward-circle" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </View>

  );
};

export default OnboardingSlide3;

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
