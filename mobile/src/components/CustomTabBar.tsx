import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BAR = '#1C2128';
const MUTED = '#9AA3AD';
const LABEL = '#C5CED6';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  Community: 'people-outline',
  Mood: 'happy-outline',
  Goals: 'locate-outline',
  Resources: 'library-outline',
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        if (route.name === 'Profile') return null;
        const { options } = descriptors[route.key];
        const label = (options.title ?? route.name).toUpperCase();
        const isFocused = state.index === index;
        const icon = ICONS[route.name] || 'ellipse-outline';

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={styles.item} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={label}>
            <Ionicons name={isFocused && route.name === 'Resources' ? 'library' : icon} size={22} color={isFocused ? '#FFFFFF' : MUTED} />
            <Text style={[styles.label, isFocused && styles.labelOn]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: BAR,
    paddingTop: 12,
    paddingHorizontal: 8,
    borderTopWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: { elevation: 16 },
      web: { boxShadow: '0 -8px 24px rgba(0,0,0,0.18)' } as object,
    }),
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    minHeight: 58,
  },
  label: {
    color: LABEL,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  labelOn: {
    color: '#FFFFFF',
  },
});
