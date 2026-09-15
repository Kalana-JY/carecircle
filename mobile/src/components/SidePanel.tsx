import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/store/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const TAB_SCREENS = new Set(['Home', 'Community', 'Mood', 'Goals', 'Profile']);

export function SidePanel({ isOpen, onClose }: SidePanelProps) {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleNavigation = (screenName: string) => {
    onClose();
    if (TAB_SCREENS.has(screenName)) {
      navigation.navigate('MainTabs', { screen: screenName });
    } else {
      navigation.navigate(screenName);
    }
  };

  return (
    <Modal
      transparent={true}
      visible={isOpen}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Semi-transparent Backdrop */}
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close menu backdrop"
        />

        {/* Slide-out Panel Content */}
        <View
          style={[styles.panel, { backgroundColor: colors.card }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel="Close menu"
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.avatar, { backgroundColor: isDark ? '#245B8B' : '#E8F1F9' }]}
              onPress={() => handleNavigation('Profile')}
              activeOpacity={0.8}
            >
              <Text style={[styles.avatarText, { color: isDark ? '#FFFFFF' : '#245B8B' }]}>
                {getInitials(user?.name)}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {user?.name || 'Guest User'}
            </Text>
            <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>
              {user?.email || ''}
            </Text>
          </View>

          {/* Nav Items */}
          <ScrollView style={styles.menuItems} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => handleNavigation('Home')}
            >
              <Ionicons name="home-outline" size={20} color={colors.primary || colors.tint} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => handleNavigation('Mood')}
            >
              <Ionicons name="happy-outline" size={20} color={colors.primary || colors.tint} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Mood & Journal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => handleNavigation('Goals')}
            >
              <Ionicons name="disc-outline" size={20} color={colors.primary || colors.tint} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Goals & Habits</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => handleNavigation('Community')}
            >
              <Ionicons name="chatbubbles-outline" size={20} color={colors.primary || colors.tint} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Community Forum</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => handleNavigation('Resources')}
            >
              <Ionicons name="document-text-outline" size={20} color={colors.primary || colors.tint} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Resources</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => handleNavigation('BookSession')}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.primary || colors.tint} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Book a Session</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => handleNavigation('BecomeSupporter')}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary || colors.tint} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Become a Peer Supporter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => handleNavigation('Profile')}
            >
              <Ionicons name="person-outline" size={20} color={colors.primary || colors.tint} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>My Profile</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer (Sign Out) */}
          <TouchableOpacity
            style={[styles.footer, { borderTopColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => {
              onClose();
              signOut();
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#E53935" />
            <Text style={styles.footerText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 1,
  },
  panel: {
    width: 290,
    height: '100%',
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 10,
  },
  header: {
    position: 'relative',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 14,
    padding: 6,
    zIndex: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    width: '100%',
    textAlign: 'center',
  },
  email: {
    fontSize: 12,
    width: '100%',
    textAlign: 'center',
  },
  menuItems: {
    flex: 1,
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 14,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E53935',
  },
});
