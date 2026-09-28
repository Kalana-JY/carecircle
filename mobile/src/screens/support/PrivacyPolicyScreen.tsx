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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';

  const colors = {
    background: isDark ? '#121212' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#5A6472',
    border: isDark ? '#2E2E2E' : '#E8EEF4',
    accentGreen: '#73A977',
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
          Privacy Policy
        </Text>

        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={true}
      >
        <Text style={[styles.effectiveDate, { color: colors.text }]}>
          Effective Date: December 19, 2024
        </Text>

        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          CareCircle (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting the privacy of our users (&quot;you&quot; or &quot;your&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application, CareCircle (the &quot;App&quot;).
        </Text>

        {/* Section 1 */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          1. Information We Collect:
        </Text>
        <View style={styles.bulletList}>
          <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
            • <Text style={{ fontWeight: '600', color: colors.text }}>Account Information:</Text> When you create an account, we collect your name, email address, phone number, and a secure password hash.
          </Text>
          <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
            • <Text style={{ fontWeight: '600', color: colors.text }}>Usage Data:</Text> We collect data about your interactions in the App, such as mood logs, journaling frequency, goal milestones, and forum participation (without accessing private encrypted contents).
          </Text>
          <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
            • <Text style={{ fontWeight: '600', color: colors.text }}>Optional Information:</Text> You may choose to provide additional information such as a profile picture, gender, date of birth, or peer supporter credential documents.
          </Text>
        </View>

        {/* Section 2 */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          2. How We Use Your Information:
        </Text>
        <View style={styles.bulletList}>
          <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
            • Provide, operate, and improve the App and its self-care wellness algorithms.
          </Text>
          <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
            • Personalize your experience by offering customized mood insights and relevant resources.
          </Text>
          <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
            • Facilitate secure peer support matching and scheduled support sessions.
          </Text>
          <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
            • Maintain safety, prevent fraud, and enforce our Community Guidelines.
          </Text>
        </View>

        {/* Section 3 */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          3. Data Protection and Security:
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          We implement technical and organizational security measures to protect your personal data from unauthorized access, loss, or alteration. All network communications are encrypted via HTTPS/TLS.
        </Text>

        {/* Section 4 */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          4. Your Rights and Choices:
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          You have the right to access, update, export, or delete your account information at any time from your Account and Personal Info settings. For inquiries or data deletion requests, contact privacy@carecircle.org.
        </Text>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  effectiveDate: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
  },
  bulletList: {
    gap: 8,
    marginBottom: 16,
  },
  bulletItem: {
    fontSize: 14,
    lineHeight: 21,
  },
});
