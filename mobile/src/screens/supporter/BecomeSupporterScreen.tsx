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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/store/AuthContext';
import { API_URL } from '@/services/api';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function BecomeSupporterScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';

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
    inputBg: isDark ? '#1A1A1A' : '#F0F2F5',
    brand: '#245B8B',
    brandLight: isDark ? '#1E3A5F' : '#E8F1F9',
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
            Application Form
          </Text>
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
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.3,
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
