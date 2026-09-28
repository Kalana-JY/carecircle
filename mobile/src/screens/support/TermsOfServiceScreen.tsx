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

export default function TermsOfServiceScreen() {
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';

  const colors = {
    background: isDark ? '#121212' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#5A6472',
    border: isDark ? '#2E2E2E' : '#E8EEF4',
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
          Terms of Service
        </Text>

        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={true}
      >
        <Text style={[styles.effectiveDate, { color: colors.text }]}>
          Effective Date: December 20, 2024
        </Text>

        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of the CareCircle mobile application (the &quot;App&quot;). By downloading, creating an account, or using the App, you agree to be bound by these Terms.
        </Text>

        {/* Section 1 */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          1. Who Can Use the App:
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          You must be at least 13 years old (or the applicable age of digital consent in your jurisdiction) to use the App.
        </Text>

        {/* Section 2 */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          2. Acceptable Use:
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          You agree to use the App only for lawful purposes and in accordance with these Terms. You will not:
        </Text>
        <View style={styles.bulletList}>
          <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
            • Violate any applicable local, state, national, or international laws.
          </Text>
          <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
            • Infringe on the rights, dignity, or intellectual property of other members.
          </Text>
          <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
            • Transmit any harmful, abusive, harassing, or sexually explicit content.
          </Text>
          <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
            • Disrupt, overburden, or compromise the technical security of the App.
          </Text>
          <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
            • Impersonate any person, peer supporter, or clinical entity.
          </Text>
        </View>

        {/* Section 3 */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          3. User Content:
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          You are responsible for any content you post in community forums or chat rooms (&quot;User Content&quot;). You retain ownership of your content, but grant CareCircle a non-exclusive license to display it within the App according to your privacy preferences.
        </Text>

        {/* Section 4 */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          4. Peer Support & Medical Disclaimer:
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          CareCircle provides peer-to-peer connection and wellness self-tracking tools. Peer supporters are volunteers, not licensed psychologists or doctors. CareCircle is NOT a replacement for professional clinical psychiatric medical advice or emergency suicide prevention helplines. In an acute emergency, please contact local emergency services immediately.
        </Text>

        {/* Section 5 */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          5. Termination:
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          We reserve the right to suspend or terminate accounts that breach our Community Guidelines or engage in harassment. You may delete your account at any time.
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
