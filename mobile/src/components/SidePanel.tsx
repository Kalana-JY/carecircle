import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
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
    navigation.navigate(screenName);
  };

  return (
    <Modal
      transparent={true}
      visible={isOpen}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        {/* Panel Content */}
        <View style={[styles.panel, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: isDark ? '#245B8B' : '#E8F1F9' }]}>
              <Text style={[styles.avatarText, { color: isDark ? '#FFFFFF' : '#245B8B' }]}>
                {getInitials(user?.name)}
              </Text>
            </View>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {user?.name || 'Guest User'}
            </Text>
            <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>
              {user?.email || ''}
            </Text>
          </View>

          {/* Nav Items */}
          <ScrollView style={styles.menuItems}>
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => handleNavigation('BookSession')}
            >
              <Ionicons name="calendar" size={20} color={colors.primary || colors.tint} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Sessions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => handleNavigation('BecomeSupporter')}
            >
              <Ionicons name="shield-checkmark" size={20} color={colors.primary || colors.tint} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Become a Peer Supporter</Text>
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
            <Ionicons name="log-out" size={20} color="#E53935" />
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  panel: {
    width: 280,
    height: '100%',
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 16,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: 8,
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
    paddingVertical: 12,
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
