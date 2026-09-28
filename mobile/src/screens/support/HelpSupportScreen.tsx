import React, { useState } from 'react';
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
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HelpSupportScreen() {
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';

  const colors = {
    background: isDark ? '#121212' : '#F7F9FB',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#687076',
    border: isDark ? '#2E2E2E' : '#E8EEF4',
    brand: '#245B8B',
    brandLight: isDark ? '#1E3A5F' : '#E8F1F9',
    accentGreen: '#73A977',
  };

  // Modal States
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [infoModalTitle, setInfoModalTitle] = useState<string | null>(null);
  const [infoModalContent, setInfoModalContent] = useState<string | null>(null);

  const handleOpenInfoModal = (title: string, content: string) => {
    setInfoModalTitle(title);
    setInfoModalContent(content);
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim()) {
      Alert.alert('Feedback', 'Please enter your feedback message.');
      return;
    }
    setFeedbackVisible(false);
    setFeedbackText('');
    Alert.alert('Thank You!', 'Your feedback has been received. We appreciate your support!');
  };

  const handleRateUs = () => {
    Alert.alert(
      'Rate CareCircle',
      'Enjoying CareCircle? Please consider rating us on the app store!',
      [
        { text: 'Later', style: 'cancel' },
        {
          text: '5 Stars ★★★★★',
          onPress: () => Alert.alert('Thank You!', 'Thank you for your 5-star rating!'),
        },
      ]
    );
  };

  const handleVisitWebsite = () => {
    Linking.openURL('https://carecircle.org').catch(() => {
      Alert.alert('Website', 'Visit us online at https://carecircle.org');
    });
  };

  const menuItems = [
    {
      title: 'FAQ',
      onPress: () => navigation.navigate('FAQ'),
    },
    {
      title: 'Contact Support',
      onPress: () => navigation.navigate('ContactSupport'),
    },
    {
      title: 'Privacy Policy',
      onPress: () => navigation.navigate('PrivacyPolicy'),
    },
    {
      title: 'Terms of Service',
      onPress: () => navigation.navigate('TermsOfService'),
    },
    {
      title: 'Partner',
      onPress: () =>
        handleOpenInfoModal(
          'Partner With Us',
          'We collaborate with mental health institutions, universities, and healthcare providers to deliver accessible peer support.\n\nTo become an official CareCircle partner or integrate with your organization, reach out to partners@carecircle.org.'
        ),
    },
    {
      title: 'Job Vacancy',
      onPress: () =>
        handleOpenInfoModal(
          'Careers at CareCircle',
          'Join our passionate team of developers, clinical advisors, and community coordinators dedicated to improving mental health.\n\nCheck out open positions at carecircle.org/careers or send your resume to careers@carecircle.org.'
        ),
    },
    {
      title: 'Accessibility',
      onPress: () =>
        handleOpenInfoModal(
          'Accessibility Support',
          'CareCircle is designed with inclusive accessibility in mind, supporting high-contrast dark mode, screen readers, dynamic font scaling, and voice accessibility.\n\nIf you have accessibility suggestions or need assistance, contact access@carecircle.org.'
        ),
    },
    {
      title: 'Feedback',
      onPress: () => setFeedbackVisible(true),
    },
    {
      title: 'About us',
      onPress: () =>
        handleOpenInfoModal(
          'About CareCircle',
          'CareCircle is a modern peer-support and wellness platform created to foster community healing, habit building, and mental health resources.\n\nOur mission is to provide safe, stigma-free peer connections and self-care tools for everyone.'
        ),
    },
    {
      title: 'Rate us',
      onPress: handleRateUs,
    },
    {
      title: 'Visit Our Website',
      onPress: handleVisitWebsite,
    },
    {
      title: 'Follow us on Social Media',
      onPress: () => navigation.navigate('ContactSupport'),
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
          Help & Support
        </Text>

        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {menuItems.map((item, index) => (
            <React.Fragment key={item.title}>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              {index < menuItems.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>

      {/* Feedback Modal */}
      <Modal
        visible={feedbackVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFeedbackVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Send Feedback</Text>
              <TouchableOpacity onPress={() => setFeedbackVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Let us know how we can make CareCircle better for you.
            </Text>
            <TextInput
              style={[styles.feedbackInput, { backgroundColor: isDark ? '#141414' : '#F7F9FB', color: colors.text, borderColor: colors.border }]}
              multiline
              numberOfLines={4}
              placeholder="Write your feedback or bug report here..."
              placeholderTextColor={colors.textSecondary}
              value={feedbackText}
              onChangeText={setFeedbackText}
            />
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.brand }]}
              onPress={handleSendFeedback}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>Submit Feedback</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Info Modal */}
      <Modal
        visible={!!infoModalTitle}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setInfoModalTitle(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{infoModalTitle}</Text>
              <TouchableOpacity onPress={() => setInfoModalTitle(null)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 260, marginVertical: 12 }}>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {infoModalContent}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.brand }]}
              onPress={() => setInfoModalTitle(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  feedbackInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
