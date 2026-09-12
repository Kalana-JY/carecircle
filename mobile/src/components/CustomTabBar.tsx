import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

const BRAND = '#3A7CA5';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  Community: 'people-outline',
  Mood: 'happy-outline',
  Goals: 'disc-outline',
  Resources: 'document-text-outline',
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const backgroundColor = isDark ? '#1E1E1E' : '#FFFFFF';
  const inactive = isDark ? '#8B9198' : '#9AA0A6';

  return (
    <View style={[styles.bar, { backgroundColor, paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const isFocused = state.index === index;
        const isMood = route.name === 'Mood';
        const icon = ICONS[route.name] || 'ellipse-outline';

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        if (isMood) {
          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={styles.moodSlot} activeOpacity={0.85}>
              <View style={[styles.moodButton, isFocused && styles.moodButtonActive]}>
                <Ionicons name="happy" size={26} color="#FFFFFF" />
              </View>
              <Text style={[styles.moodLabel, { color: isFocused ? BRAND : inactive }]}>{label}</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={styles.item} activeOpacity={0.8}>
            <Ionicons name={icon} size={22} color={isFocused ? BRAND : inactive} />
            <Text style={[styles.label, { color: isFocused ? BRAND : inactive }]}>{label}</Text>
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
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E6E8EB',
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 12 },
    }),
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  moodSlot: {
    flex: 1,
    alignItems: 'center',
    marginTop: -22,
  },
  moodButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  moodButtonActive: {
    transform: [{ scale: 1.04 }],
  },
  moodLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
});
