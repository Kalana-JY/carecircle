import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Logo } from '@/components/Logo';
import { Fonts, Colors } from '@/constants/theme';

const COUNTRY_CODES = [
  { code: 'LK', dialCode: '+94', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'US', dialCode: '+1', name: 'United States', flag: '🇺🇸' },
  { code: 'CA', dialCode: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: 'GB', dialCode: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AU', dialCode: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: 'IN', dialCode: '+91', name: 'India', flag: '🇮🇳' },
  { code: 'NZ', dialCode: '+64', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'SG', dialCode: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: 'ZA', dialCode: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: 'DE', dialCode: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', dialCode: '+33', name: 'France', flag: '🇫🇷' },
  { code: 'JP', dialCode: '+81', name: 'Japan', flag: '🇯🇵' },
];

export default function SignupScreen() {
  const navigation = useNavigation<any>();
  const { signUp } = useAuth();
  const colorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[colorScheme];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]); // Default Sri Lanka (+94)
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'name' | 'email' | 'phone' | 'password' | null>(null);

  const filteredCountries = COUNTRY_CODES.filter(
    (country) =>
      country.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
      country.dialCode.includes(countrySearchQuery)
  );

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !phoneNumber.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (!cleanPhone) {
      setError('Phone number is required');
      return;
    }

    if (cleanPhone.length < 7 || cleanPhone.length > 15) {
      setError('Please enter a valid phone number (7-15 digits)');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!agreed) {
      setError('You must agree to the Community Guidelines to register');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const fullPhoneNumber = `${selectedCountry.dialCode}${cleanPhone}`;

    try {
      await signUp(name.trim(), email.trim(), fullPhoneNumber, password);
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Branding */}
          <View style={styles.headerContainer}>
            <Logo size="large" layout="vertical" />
            <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
              Join the community
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: Fonts.rounded || 'System' }]}>
              Connect with peers, track your mood, and find support in a safe space.
            </Text>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: colors.primary,
              },
            ]}
          >
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#BA1A1A" style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>Full Name</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: focusedInput === 'name' ? colors.primary : colors.border,
                    borderWidth: focusedInput === 'name' ? 2 : 1,
                  },
                ]}
              >
                <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                  autoCorrect={false}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocusedInput('name')}
                  onBlur={() => setFocusedInput(null)}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>Email Address</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: focusedInput === 'email' ? colors.primary : colors.border,
                    borderWidth: focusedInput === 'email' ? 2 : 1,
                  },
                ]}
              >
                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Phone Number Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>Phone Number</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: focusedInput === 'phone' ? colors.primary : colors.border,
                    borderWidth: focusedInput === 'phone' ? 2 : 1,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.countrySelector}
                  onPress={() => setIsCountryModalOpen(true)}
                  activeOpacity={0.7}
                  disabled={isSubmitting}
                >
                  <Text style={styles.flagText}>{selectedCountry.flag}</Text>
                  <Text style={[styles.dialCodeText, { color: colors.text }]}>{selectedCountry.dialCode}</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="77 123 4567"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={phoneNumber}
                  onChangeText={(text) => {
                    setPhoneNumber(text);
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocusedInput('phone')}
                  onBlur={() => setFocusedInput(null)}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: focusedInput === 'password' ? colors.primary : colors.border,
                    borderWidth: focusedInput === 'password' ? 2 : 1,
                  },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Create a strong password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Terms Checkbox */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => {
                setAgreed(!agreed);
                if (error) setError(null);
              }}
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              <View
                style={[
                  styles.checkbox,
                  { borderColor: colors.border },
                  agreed && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                {agreed && <Ionicons name="checkmark" size={14} color={colors.onPrimary} />}
              </View>
              <Text style={[styles.checkboxLabel, { color: colors.textSecondary }]}>
                By signing up, you agree to our{' '}
                <Text style={{ color: colors.primary, fontWeight: '600' }} onPress={() => alert('Community Guidelines link clicked.')}>
                  Community Guidelines
                </Text>
                . We prioritize a safe, respectful environment for all members.
              </Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={handleSignup}
              disabled={isSubmitting}
              activeOpacity={0.9}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.onPrimary, fontFamily: Fonts.rounded || 'System' }]}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Navigation Footer */}
          <View style={styles.footerContainer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
              <Text style={[styles.footerLink, { color: colors.primary, fontFamily: Fonts.rounded || 'System' }]}>Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Code Picker Modal */}
      <Modal
        visible={isCountryModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCountryModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
                Select Country
              </Text>
              <TouchableOpacity onPress={() => setIsCountryModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={[styles.modalSearchWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                placeholder="Search country or code..."
                placeholderTextColor={colors.textSecondary}
                value={countrySearchQuery}
                onChangeText={setCountrySearchQuery}
                autoCorrect={false}
              />
              {countrySearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCountrySearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Country List */}
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    { borderBottomColor: colors.border },
                    selectedCountry.code === item.code && { backgroundColor: colors.inputBg }
                  ]}
                  onPress={() => {
                    setSelectedCountry(item);
                    setIsCountryModalOpen(false);
                    setCountrySearchQuery('');
                  }}
                >
                  <Text style={styles.modalFlag}>{item.flag}</Text>
                  <Text style={[styles.modalCountryName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.modalDialCode, { color: colors.textSecondary }]}>{item.dialCode}</Text>
                  {selectedCountry.code === item.code && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 20,
      },
      android: {
        elevation: 2,
      },
      web: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 20,
      },
    }),
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
    letterSpacing: -0.26,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 26,
    paddingHorizontal: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFDAD6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#BA1A1A',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 20,
    letterSpacing: 0.14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    gap: 4,
    height: '100%',
  },
  flagText: {
    fontSize: 20,
  },
  dialCodeText: {
    fontSize: 16,
    fontWeight: '500',
    marginHorizontal: 2,
  },
  divider: {
    width: 1,
    height: '60%',
    marginRight: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    marginTop: 8,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 0,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    height: '60%',
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  modalSearchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  modalFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  modalCountryName: {
    fontSize: 16,
    flex: 1,
  },
  modalDialCode: {
    fontSize: 16,
    marginRight: 8,
  },
});
