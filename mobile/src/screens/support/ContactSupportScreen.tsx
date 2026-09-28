import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ContactChannel {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: () => void;
}

export default function ContactSupportScreen() {
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';

  const colors = {
    background: isDark ? '#121212' : '#F7F9FB',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#687076',
    border: isDark ? '#2E2E2E' : '#E8EEF4',
    iconGreen: '#73A977',
  };

  const handleOpenUrl = (url: string, fallback: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Contact Support', fallback);
    });
  };

  const channels: ContactChannel[] = [
    {
      id: 'customer_support',
      title: 'Customer Support',
      icon: 'headset-outline',
      action: () =>
        Alert.alert(
          'Customer Support',
          'Our support team is available 24/7.\n\nEmail: support@carecircle.org\nHotline: +1 (800) 555-CARE'
        ),
    },
    {
      id: 'website',
      title: 'Website',
      icon: 'globe-outline',
      action: () => handleOpenUrl('https://carecircle.org', 'Visit our official website at https://carecircle.org'),
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      icon: 'logo-whatsapp',
      action: () =>
        handleOpenUrl(
          'https://wa.me/18005552273',
          'Chat with CareCircle Support on WhatsApp at +1 (800) 555-CARE'
        ),
    },
    {
      id: 'facebook',
      title: 'Facebook',
      icon: 'logo-facebook',
      action: () =>
        handleOpenUrl(
          'https://facebook.com/carecircleapp',
          'Follow CareCircle on Facebook: facebook.com/carecircleapp'
        ),
    },
    {
      id: 'twitter',
      title: 'X (formerly Twitter)',
      icon: 'logo-twitter',
      action: () =>
        handleOpenUrl(
          'https://x.com/carecircleapp',
          'Follow CareCircle on X: @carecircleapp'
        ),
    },
    {
      id: 'instagram',
      title: 'Instagram',
      icon: 'logo-instagram',
      action: () =>
        handleOpenUrl(
          'https://instagram.com/carecircleapp',
          'Follow CareCircle on Instagram: @carecircleapp'
        ),
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
          Contact Support
        </Text>

        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.channelList}>
          {channels.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.channelCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={item.action}
              activeOpacity={0.75}
            >
              <View style={styles.channelLeft}>
                <Ionicons name={item.icon} size={22} color={colors.iconGreen} />
                <Text style={[styles.channelTitle, { color: colors.text }]}>{item.title}</Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  channelList: {
    gap: 12,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  channelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  channelTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
});
