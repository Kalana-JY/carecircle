import React from 'react';
import {
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { Fonts } from '@/constants/theme';
import { useAuth } from '@/store/AuthContext';
import { getInitials } from './MoodHubChrome';
import {
  GOAL_BRAND,
  GOAL_TABS,
  type GoalHubTab,
} from '@/constants/goals';

import goalsHeader from '../../assets/images/goals-header.png';

type Props = {
  activeTab: GoalHubTab;
  onTabChange: (tab: GoalHubTab) => void;
  onAvatarPress: () => void;
};

export function GoalsChrome({
  activeTab,
  onTabChange,
  onAvatarPress,
}: Props) {
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  const wide = width >= 900;

  return (
    <View style={[styles.wrap, wide && styles.wrapWide]}>

      {/* HEADER IMAGE */}
      <ImageBackground
        source={goalsHeader}
        style={[
          styles.hero,
          wide && styles.heroWide,
        ]}
        imageStyle={styles.heroImage}
      >
        {/* Slight overlay so the text is easy to read */}
        <View style={styles.scrim} />

        {/* CARECIRCLE + PROFILE */}
        <View style={styles.topRow}>
          <Text style={styles.brand}>
            CareCircle
          </Text>

          <TouchableOpacity
            onPress={onAvatarPress}
            style={styles.avatar}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>
              {getInitials(user?.name)}
            </Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>

      {/* GOAL NAVIGATION TABS */}
      <View style={styles.tabs}>
        {GOAL_TABS.map((tab) => {
          const selected =
            activeTab === tab.key;

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() =>
                onTabChange(tab.key)
              }
              style={styles.tab}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.tabLabel,
                  selected &&
                    styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>

              <View
                style={[
                  styles.underline,
                  selected &&
                    styles.underlineActive,
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: '#FFFFFF',
  },

  wrapWide: {
    maxWidth: 980,
    width: '100%',
    alignSelf: 'center',
  },

  /* ---------------- HEADER IMAGE ---------------- */

  hero: {
    height: 198,
    width: '100%',
    justifyContent: 'flex-start',
  },

  heroWide: {
    height: 190,
  },

  heroImage: {
    resizeMode: 'cover',
  },

  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 30, 40, 0.10)',
  },

  /* ---------------- TOP ROW ---------------- */

  topRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    paddingHorizontal: 20,
    paddingTop: 18,
  },

  brand: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',

    fontFamily:
      Fonts.serif || 'System',

    textShadowColor:
      'rgba(0, 0, 0, 0.30)',

    textShadowOffset: {
      width: 0,
      height: 1,
    },

    textShadowRadius: 4,
  },

  /* ---------------- PROFILE ---------------- */

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,

    backgroundColor: '#F4E6D8',

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  avatarText: {
    color: GOAL_BRAND,
    fontWeight: '800',
    fontSize: 13,
  },

  /* ---------------- TABS ---------------- */

  tabs: {
    width: '100%',

    flexDirection: 'row',
    alignItems: 'flex-end',

    paddingHorizontal: 4,

    backgroundColor: '#FFFFFF',

    borderBottomWidth:
      StyleSheet.hairlineWidth,

    borderBottomColor: '#E2E6EA',
  },

  tab: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingTop: 12,
  },

  tabLabel: {
    fontSize: 12,
    fontWeight: '600',

    color: '#7A828C',

    paddingBottom: 9,
  },

  tabLabelActive: {
    color: '#1C242C',
    fontWeight: '800',
  },

  underline: {
    width: '65%',
    height: 3,

    borderRadius: 3,

    backgroundColor:
      'transparent',
  },

  underlineActive: {
    backgroundColor: GOAL_BRAND,
  },
});