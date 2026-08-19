import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { API_URL } from '@/services/api';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';
  const [appStatus, setAppStatus] = useState<string>('none');
  const [loading, setLoading] = useState<boolean>(true);

  // Dynamic Theme Colors
  const colors = {
    background: isDark ? '#121212' : '#F5F7FA',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#687076',
    border: isDark ? '#2E2E2E' : '#E6E8EB',
    brand: '#245B8B',
    brandLight: isDark ? '#1E3A5F' : '#E8F1F9',
    accentOrange: '#FF9500',
    accentGreen: '#34C759',
    accentRed: '#FF3B30',
  };

  const fetchApplicationStatus = useCallback(async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/peer-supporters/status`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.status) {
        setAppStatus(data.status);
      }
    } catch (error) {
      console.error('[Profile] Failed to fetch application status:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Refresh status whenever the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchApplicationStatus();
    }, [fetchApplicationStatus])
  );

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={[styles.pageTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
            My Profile
          </Text>
        </View>

        {/* User Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.brandLight }]}>
            <Text style={[styles.avatarText, { color: colors.brand }]}>
              {getInitials(user?.name)}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{user?.name || 'Guest User'}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email || 'No email associated'}</Text>
          <Text style={[styles.phone, { color: colors.textSecondary }]}>{user?.phoneNumber || 'No phone number'}</Text>
        </View>

        {/* Peer Supporter Block */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Peer Supporter Status</Text>

          {loading ? (
            <ActivityIndicator size="small" color={colors.brand} style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.statusContent}>
              {appStatus === 'none' && (
                <View>
                  <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                    Apply to become a peer supporter to share your experiences and host counseling or support sessions.
                  </Text>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.brand }]}
                    onPress={() => navigation.navigate('BecomeSupporter')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnText}>Become a Peer Supporter</Text>
                  </TouchableOpacity>
                </View>
              )}

              {appStatus === 'pending' && (
                <View style={[styles.statusBox, { backgroundColor: colors.brandLight + '30', borderColor: colors.accentOrange }]}>
                  <Ionicons name="time-outline" size={24} color={colors.accentOrange} />
                  <View style={styles.statusTextContainer}>
                    <Text style={[styles.statusTitle, { color: colors.text }]}>Application Pending</Text>
                    <Text style={[styles.statusDescription, { color: colors.textSecondary }]}>
                      Your application is currently under review by our admin team.
                    </Text>
                  </View>
                </View>
              )}

              {appStatus === 'approved' && (
                <View style={[styles.statusBox, { backgroundColor: colors.accentGreen + '1A', borderColor: colors.accentGreen }]}>
                  <Ionicons name="checkmark-circle-outline" size={24} color={colors.accentGreen} />
                  <View style={styles.statusTextContainer}>
                    <Text style={[styles.statusTitle, { color: colors.text }]}>Approved Supporter</Text>
                    <Text style={[styles.statusDescription, { color: colors.textSecondary }]}>
                      Congratulations! You are certified to host support sessions.
                    </Text>
                  </View>
                </View>
              )}

              {appStatus === 'rejected' && (
                <View>
                  <View style={[styles.statusBox, { backgroundColor: colors.accentRed + '10', borderColor: colors.accentRed }]}>
                    <Ionicons name="close-circle-outline" size={24} color={colors.accentRed} />
                    <View style={styles.statusTextContainer}>
                      <Text style={[styles.statusTitle, { color: colors.text }]}>Application Rejected</Text>
                      <Text style={[styles.statusDescription, { color: colors.textSecondary }]}>
                        Your application was not approved by administration at this time.
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.brand, marginTop: 12 }]}
                    onPress={() => navigation.navigate('BecomeSupporter')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnText}>Apply Again</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.accentRed }]}
          onPress={signOut}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.accentRed} />
          <Text style={[styles.logoutText, { color: colors.accentRed }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 20,
    marginTop: Platform.OS === 'android' ? 10 : 0,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  profileCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  statusContent: {
    marginTop: 4,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
