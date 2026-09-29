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
import { Colors, Fonts } from '@/constants/theme';

interface AdminSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoute?: string;
}

export function AdminSidePanel({ isOpen, onClose, currentRoute = 'AdminDashboard' }: AdminSidePanelProps) {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const handleNavigation = (screenName: string) => {
    onClose();
    navigation.navigate(screenName);
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
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close menu backdrop"
        />

        <View
          style={[styles.panel, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel="Close menu"
            >
              <Ionicons
                name="close"
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            <View style={[styles.avatar, { backgroundColor: '#2563EB' }]}>
              <Ionicons name="shield" size={28} color="#FFFFFF" />
            </View>

            <Text
              style={[styles.name, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}
              numberOfLines={1}
            >
              {user?.name || 'Administrator'}
            </Text>

            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Admin Portal</Text>
            </View>

            <Text
              style={[styles.email, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {user?.email || 'admin@carecircle.com'}
            </Text>
          </View>

          {/* Menu Items */}
          <ScrollView
            style={styles.menuItems}
            showsVerticalScrollIndicator={false}
          >
            {/* Dashboard */}
            <TouchableOpacity
              style={[
                styles.menuItem,
                currentRoute === 'AdminDashboard' && {
                  backgroundColor: isDark ? '#334155' : '#EFF6FF',
                  borderRadius: 12,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => handleNavigation('AdminDashboard')}
            >
              <Ionicons
                name={currentRoute === 'AdminDashboard' ? 'grid' : 'grid-outline'}
                size={22}
                color={currentRoute === 'AdminDashboard' ? '#2563EB' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.menuItemText,
                  {
                    color: currentRoute === 'AdminDashboard' ? '#2563EB' : colors.text,
                    fontWeight: currentRoute === 'AdminDashboard' ? '700' : '600',
                  },
                ]}
              >
                Dashboard & Stats
              </Text>
            </TouchableOpacity>

            {/* User Management */}
            <TouchableOpacity
              style={[
                styles.menuItem,
                currentRoute === 'UserManagement' && {
                  backgroundColor: isDark ? '#334155' : '#EFF6FF',
                  borderRadius: 12,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => handleNavigation('UserManagement')}
            >
              <Ionicons
                name={currentRoute === 'UserManagement' ? 'people' : 'people-outline'}
                size={22}
                color={currentRoute === 'UserManagement' ? '#2563EB' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.menuItemText,
                  {
                    color: currentRoute === 'UserManagement' ? '#2563EB' : colors.text,
                    fontWeight: currentRoute === 'UserManagement' ? '700' : '600',
                  },
                ]}
              >
                User Management
              </Text>
            </TouchableOpacity>

            {/* Session Management */}
            <TouchableOpacity
              style={[
                styles.menuItem,
                currentRoute === 'SessionManagement' && {
                  backgroundColor: isDark ? '#334155' : '#EFF6FF',
                  borderRadius: 12,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => handleNavigation('SessionManagement')}
            >
              <Ionicons
                name={currentRoute === 'SessionManagement' ? 'calendar' : 'calendar-outline'}
                size={22}
                color={currentRoute === 'SessionManagement' ? '#2563EB' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.menuItemText,
                  {
                    color: currentRoute === 'SessionManagement' ? '#2563EB' : colors.text,
                    fontWeight: currentRoute === 'SessionManagement' ? '700' : '600',
                  },
                ]}
              >
                Session Management
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer Sign Out */}
          <TouchableOpacity
            style={[
              styles.footer,
              { borderTopColor: isDark ? '#334155' : '#E2E8F0' },
            ]}
            activeOpacity={0.7}
            onPress={() => {
              onClose();
              signOut();
            }}
          >
            <Ionicons
              name="log-out-outline"
              size={22}
              color="#DC2626"
            />
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
    gap: 6,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 14,
    padding: 6,
    zIndex: 2,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    width: '100%',
    textAlign: 'center',
  },
  roleBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
  },
  email: {
    fontSize: 12,
    width: '100%',
    textAlign: 'center',
    marginTop: 2,
  },
  menuItems: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 14,
    marginBottom: 4,
  },
  menuItemText: {
    fontSize: 15,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 22,
    gap: 14,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
});
