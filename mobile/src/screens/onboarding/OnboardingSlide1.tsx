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
import homeChatCommunity from '../../../assets/images/home_chat_community.png';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * OnboardingSlide1:
 * Focus: Peer Support Chat & Community Forum, and Session Scheduling
 */
export const OnboardingSlide1: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const statusBarHeight = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  );

  const handleNext = () => {
    navigation.navigate('OnboardingSlide2');
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
              <View style={styles.mockHeaderAvatar}>
                <Ionicons name="people" size={14} color="#285F8E" />
              </View>
              <Text style={styles.mockHeaderTitle}>Community & Sessions</Text>
              <Ionicons name="search" size={14} color="#727780" />
            </View>


            {/* Feature 1: Peer Support Chat & Community Forum Preview */}
            <View style={styles.mockChatCard}>
              <View style={styles.mockChatHeader}>
                <View style={styles.mockDotActive} />
                <Text style={styles.mockChatTitle}>Anxiety & Healing Circle</Text>
                <Text style={styles.mockChatTime}>Active</Text>
              </View>
              <View style={styles.mockChatBubble}>
                <Text style={styles.mockChatText}>
                  "You are never alone. Join our moderated community forum."
                </Text>
              </View>
            </View>

            {/* Feature 2: Session Scheduling Preview */}
            <View style={styles.mockSessionCard}>
              <Image source={homeChatCommunity} style={styles.mockSessionImage} resizeMode="contain" />
              <View style={styles.mockSessionInfo}>
                <Text style={styles.mockSessionTag}>📅 Session Scheduling</Text>
                <Text style={styles.mockSessionPeer}>With Sarah M. (Peer Guide)</Text>
                <Text style={styles.mockSessionTime}>Today • 4:30 PM (Confirmed)</Text>
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
          <Text style={styles.categoryPillText}>Connect & Share</Text>
        </View>

        <Text style={[styles.title, { fontFamily: Fonts.rounded || 'System' }]}>
          Peer Support Chat & Community Forum
        </Text>

        <Text style={styles.subtitle}>
          Find your safe space to speak and listen. Engage in moderated community forums and easily schedule 1-on-1 sessions with empathetic peers.
        </Text>

        <View style={styles.featureChipsRow}>
          <View style={styles.featureChip}>
            <Ionicons name="chatbubbles" size={14} color="#285F8E" style={{ marginRight: 6 }} />
            <Text style={styles.featureChipText}>Peer Support Chat & Community Forum</Text>
          </View>
          <View style={styles.featureChip}>
            <Ionicons name="calendar" size={14} color="#285F8E" style={{ marginRight: 6 }} />
            <Text style={styles.featureChipText}>Session Scheduling</Text>
          </View>
        </View>

        {/* Pagination Dots (Dot 1 Active) */}
        <View style={styles.paginationRow}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotInactive]} />
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

export default OnboardingSlide1;

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
