import React from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Fonts, Colors } from '@/constants/theme';
import ccLogo from '../../assets/images/cc_logo.png';

interface LogoProps {
  size?: 'small' | 'large';
  layout?: 'horizontal' | 'vertical';
}

export const Logo: React.FC<LogoProps> = ({ size = 'small', layout = 'horizontal' }) => {
  const colorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  
  const brandColor = Colors[colorScheme].primary;
  const textColor = Colors[colorScheme].text;

  const isLarge = size === 'large';
  const isVertical = layout === 'vertical';

  return (
    <View style={[styles.container, isVertical ? styles.vertical : styles.horizontal]}>
      {/* Brand Icon Image */}
      <Image
        source={ccLogo}
        style={[
          isLarge ? styles.logoLarge : styles.logoSmall,
          { tintColor: brandColor }
        ]}
        resizeMode="contain"
      />

      {/* Brand Text */}
      <Text
        style={[
          styles.text,
          { color: textColor, fontFamily: Fonts.rounded || 'System' },
          isLarge ? styles.textLarge : styles.textSmall,
        ]}
      >
        CareCircle
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontal: {
    flexDirection: 'row',
    gap: 8,
  },
  vertical: {
    flexDirection: 'column',
    gap: 12,
  },
  logoSmall: {
    width: 44,
    height: 44,
  },
  logoLarge: {
    width: 76,
    height: 76,
  },
  text: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  textSmall: {
    fontSize: 22,
  },
  textLarge: {
    fontSize: 28,
  },
});
