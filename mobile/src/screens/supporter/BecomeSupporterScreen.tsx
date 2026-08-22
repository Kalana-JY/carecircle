import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { API_URL } from '@/services/api';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function BecomeSupporterScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';

  // Toggle View
  const [showForm, setShowForm] = useState<boolean>(false);

  // Form Fields
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [occupation, setOccupation] = useState<string>('');
  const [experiences, setExperiences] = useState<string>('');
  const [evidence, setEvidence] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Prepopulate name from user profile
  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user]);

  // Dynamic Theme Colors
  const colors = {
    background: isDark ? '#121212' : '#F5F7FA',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#687076',
    border: isDark ? '#2E2E2E' : '#E6E8EB',
    inputBg: isDark ? '#1A1A1A' : '#EDF2F7',
    brand: '#245B8B',
    brandLight: isDark ? '#1E3A5F' : '#E8F1F9',
    accentGreen: '#34C759',
    accentRed: '#FF3B30',
  };

  const handleSubmit = async () => {
    setErrorMsg(null);

    // Validate fields
    if (!name.trim() || !age.trim() || !address.trim() || !occupation.trim() || !experiences.trim() || !evidence.trim()) {
      setErrorMsg('Please fill in all form fields.');
      return;
    }

    const ageNum = parseInt(age.trim());
    if (isNaN(ageNum) || ageNum < 18) {
      setErrorMsg('You must be at least 18 years old to apply.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/peer-supporters/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          age: ageNum,
          address: address.trim(),
          occupation: occupation.trim(),
          experiences: experiences.trim(),
          evidence: evidence.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit application');
      }

      if (Platform.OS === 'web') {
        window.alert('Application submitted successfully! Your request is pending review.');
        navigation.goBack();
      } else {
        Alert.alert(
          'Success',
          'Application submitted successfully! Your request is pending review.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (err: any) {
      console.error('[Apply] Submission Error:', err);
      setErrorMsg(err.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    // Learn More View
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
              Become a Peer Supporter
            </Text>
          </View>
          
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            Share your experiences, host counseling sessions, and make a meaningful difference. Outlined below are our volunteer guidelines, expectations, and benefits.
          </Text>

          {/* Requirements Section */}
          <View style={[styles.learnCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkbox-outline" size={22} color={colors.brand} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Requirements</Text>
            </View>
            <View style={styles.bullets}>
              <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
                • Must be at least <Text style={{ fontWeight: '700', color: colors.text }}>18 years of age</Text>.
              </Text>
              <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
                • Demonstrates active, compassionate, and non-judgmental listening skills.
              </Text>
              <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
                • Background verification, educational certificates, or professional references in counseling/support.
              </Text>
            </View>
          </View>

          {/* Expectations Section */}
          <View style={[styles.learnCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={22} color={colors.brand} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Expectations</Text>
            </View>
            <View style={styles.bullets}>
              <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
                • Commit to hosting at least <Text style={{ fontWeight: '700', color: colors.text }}>2 hours of support sessions</Text> per week.
              </Text>
              <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
                • Absolute client confidentiality and data privacy protection.
              </Text>
              <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
                • strictly follow CareCircle&apos;s volunteer code of conduct.
              </Text>
            </View>
          </View>

          {/* Benefits Section */}
          <View style={[styles.learnCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="gift-outline" size={22} color={colors.brand} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Benefits</Text>
            </View>
            <View style={styles.bullets}>
              <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
                • Gain practical, real-world peer counseling experience.
              </Text>
              <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
                • Earn certified volunteer hours and letters of recommendation.
              </Text>
              <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
                • Access exclusive training workshops and professional mentoring resources.
              </Text>
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: colors.brand }]}
            onPress={() => setShowForm(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.applyBtnText}>Apply Now</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Application Form View
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setShowForm(false)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
              Application Form
            </Text>
          </View>
          
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Please fill in your correct credentials to apply for peer supporter certification.
          </Text>

          {errorMsg && (
            <View style={[styles.errorBox, { backgroundColor: colors.accentRed + '15', borderColor: colors.accentRed }]}>
              <Text style={[styles.errorText, { color: colors.accentRed }]}>{errorMsg}</Text>
            </View>
          )}

          {/* Inputs */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Age</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={age}
              onChangeText={setAge}
              placeholder="e.g. 25"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Residential Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter your full address"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Occupation</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={occupation}
              onChangeText={setOccupation}
              placeholder="e.g. Student, Therapist, Engineer"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Experiences</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
              ]}
              value={experiences}
              onChangeText={setExperiences}
              placeholder="Describe your history in mental health support or peer volunteering"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Evidence / References</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
              ]}
              value={evidence}
              onChangeText={setEvidence}
              placeholder="Certificates, references, links, or documents supporting your counseling background"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.brand }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Application</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  backBtn: {
    padding: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  introText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  learnCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  bullets: {
    gap: 8,
  },
  bulletPoint: {
    fontSize: 13,
    lineHeight: 18,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 10,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    height: Platform.OS === 'web' ? 'auto' : 90,
    textAlignVertical: 'top',
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
