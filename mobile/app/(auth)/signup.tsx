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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Logo } from '../../components/Logo';
import { Fonts, Colors } from '../../constants/theme';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const colorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[colorScheme];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'name' | 'email' | 'password' | null>(null);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields');
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

    try {
      await signUp(name.trim(), email.trim(), password);
      // AuthProvider triggers routing change automatically
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
            <TouchableOpacity onPress={() => router.push('/login')} activeOpacity={0.7}>
              <Text style={[styles.footerLink, { color: colors.primary, fontFamily: Fonts.rounded || 'System' }]}>Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 20, // container-padding-mobile
    paddingVertical: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32, // spacing section gap
  },
  card: {
    borderRadius: 16, // rounded.lg
    padding: 24, // gutter
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04, // Opacity: 4%
        shadowRadius: 20, // Blur: 20px
      },
      android: {
        elevation: 2,
      },
      web: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04, // Opacity: 4%
        shadowRadius: 20, // Blur: 20px
      },
    }),
  },
  title: {
    fontSize: 26, // headline-lg-mobile
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
    letterSpacing: -0.26,
  },
  subtitle: {
    fontSize: 16, // body-md
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 26,
    paddingHorizontal: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFDAD6', // error-container
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#BA1A1A', // error text color
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20, // spacing
  },
  label: {
    fontSize: 14, // label-md
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 20,
    letterSpacing: 0.14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8, // rounded DEFAULT
    height: 48,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16, // body-md (prevents auto-zoom on iOS inputs)
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
    borderRadius: 4, // rounded.sm (4px)
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
    borderRadius: 8, // rounded DEFAULT (8px) instead of fully rounded pill
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 0,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16, // body-md
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
});
