import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Easing,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ccLogo from '../../../assets/images/cc_logo.png';
import { Fonts } from '../../constants/theme';

interface LoadingScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

/**
 * LoadingScreen
 * Matches the reference image loading screen (Screen 1):
 * - Primary brand background (#285F8E from DESIGN.md)
 * - Centered CareCircle logo emblem with subtle breathing glow
 * - Crisp brand name "CareCircle"
 * - Subtitle / calming slogan
 * - Smooth rotating circular loading ring at the bottom
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  onFinish,
  minDurationMs = 2000,
}) => {
  const insets = useSafeAreaInsets();
  const statusBarHeight = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20
  );

  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in content
    Animated.timing(opacityValue, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Infinite spinner animation
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();

    // Gentle logo breathing pulse
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.05,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Optional duration timer if caller wants auto-dismiss
    let timer: any;
    if (onFinish) {
      timer = setTimeout(() => {
        onFinish();
      }, minDurationMs);
    }

    return () => {
      spinAnimation.stop();
      pulseAnimation.stop();
      if (timer) clearTimeout(timer);
    };
  }, [spinValue, pulseValue, opacityValue, onFinish, minDurationMs]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: statusBarHeight + 16,
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#285F8E"
        translucent={Platform.OS === 'android'}
      />

      {/* Background Decorative Ambient Circles */}
      <View style={styles.ambientCircleLarge} pointerEvents="none" />
      <View style={styles.ambientCircleSmall} pointerEvents="none" />

      {/* Main Centered Content */}
      <Animated.View style={[styles.centerContent, { opacity: opacityValue }]}>
        <Animated.View
          style={[
            styles.logoContainer,
            { transform: [{ scale: pulseValue }] },
          ]}
        >
          <View style={styles.logoBackdrop}>
            <Image
              source={ccLogo}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        <Text style={[styles.brandTitle, { fontFamily: Fonts.rounded || 'System' }]}>
          CareCircle
        </Text>
        <Text style={styles.brandSubtitle}>
          Your Digital Sanctuary for Empathy & Healing
        </Text>
      </Animated.View>

      {/* Bottom Loading Spinner */}
      <View style={styles.bottomArea}>
        <Animated.View
          style={[
            styles.spinnerArc,
            { transform: [{ rotate: spin }] },
          ]}
        />
        <Text style={styles.loadingText}>Loading sanctuary...</Text>
      </View>
    </View>
  );
};


export default LoadingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#285F8E', // Primary brand color from DESIGN.md
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  ambientCircleLarge: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  ambientCircleSmall: {
    position: 'absolute',
    bottom: 120,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBackdrop: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoImage: {
    width: 82,
    height: 82,
    tintColor: '#FFFFFF', // Clean pure white emblem
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#CFE5FF', // primary-fixed soft blue
    textAlign: 'center',
    letterSpacing: 0.2,
    maxWidth: 280,
    lineHeight: 20,
  },
  bottomArea: {
    paddingBottom: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  spinnerArc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderTopColor: '#FFFFFF', // High-contrast rotating arc
    borderRightColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});
