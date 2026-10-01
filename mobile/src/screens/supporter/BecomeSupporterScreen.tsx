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
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '@/store/AuthContext';
import { API_URL } from '@/services/api';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ConfirmationBottomSheet } from '@/components/ConfirmationBottomSheet';

export default function BecomeSupporterScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';

  // Alert Sheet State
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    onConfirm?: () => void;
  } | null>(null);

  // Toggle View
  const [showForm, setShowForm] = useState<boolean>(false);
  const [acknowledged, setAcknowledged] = useState<boolean>(false);

  // Form Fields
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [occupation, setOccupation] = useState<string>('');
  const [experiences, setExperiences] = useState<string>('');
  const [evidenceFile, setEvidenceFile] = useState<{
    name: string;
    type: string;
    size?: number;
    uri: string;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Helper helper to convert file URI to base64
  const getFileBase64 = async (uri: string): Promise<string> => {
    try {
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const commaIdx = result.indexOf(',');
            resolve(commaIdx !== -1 ? result.substring(commaIdx + 1) : result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        return await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        });
      }
    } catch (err) {
      console.error('Error converting file to base64:', err);
      throw err;
    }
  };

  const handleDocumentPick = async () => {
    try {
      setErrorMsg(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setLoading(true);
        const base64Content = await getFileBase64(asset.uri);
        const mimeType = asset.mimeType || 'application/octet-stream';
        setEvidenceFile({
          name: asset.name,
          type: mimeType,
          size: asset.size,
          uri: `data:${mimeType};base64,${base64Content}`,
        });
      }
    } catch (err: any) {
      console.error('[DocumentPicker] Error:', err);
      setErrorMsg('Failed to select file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCameraCapture = async () => {
    try {
      setErrorMsg(null);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setAlertConfig({
          title: 'Permission Denied',
          message: 'We need camera permission to take a photo of your evidence document.',
          type: 'warning',
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const mimeType = asset.mimeType || 'image/jpeg';
        const fileName = asset.fileName || `photo_${Date.now()}.jpg`;
        let base64Content = asset.base64;
        if (!base64Content) {
          setLoading(true);
          base64Content = await getFileBase64(asset.uri);
        }
        setEvidenceFile({
          name: fileName,
          type: mimeType,
          size: asset.fileSize,
          uri: `data:${mimeType};base64,${base64Content}`,
        });
      }
    } catch (err: any) {
      console.error('[CameraPicker] Error:', err);
      setErrorMsg('Failed to capture photo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLibraryPick = async () => {
    try {
      setErrorMsg(null);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setAlertConfig({
          title: 'Permission Denied',
          message: 'We need gallery permission to select a document photo.',
          type: 'warning',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const mimeType = asset.mimeType || 'image/jpeg';
        const fileName = asset.fileName || `image_${Date.now()}.jpg`;
        let base64Content = asset.base64;
        if (!base64Content) {
          setLoading(true);
          base64Content = await getFileBase64(asset.uri);
        }
        setEvidenceFile({
          name: fileName,
          type: mimeType,
          size: asset.fileSize,
          uri: `data:${mimeType};base64,${base64Content}`,
        });
      }
    } catch (err: any) {
      console.error('[LibraryPicker] Error:', err);
      setErrorMsg('Failed to pick photo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
    if (!name.trim() || !age.trim() || !address.trim() || !occupation.trim() || !experiences.trim() || !evidenceFile) {
      setErrorMsg('Please fill in all form fields and upload your evidence.');
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
          evidence: JSON.stringify(evidenceFile),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit application');
      }

      setAlertConfig({
        title: 'Application Submitted',
        message: 'Your peer supporter application has been submitted successfully! Our team will review your credentials shortly.',
        type: 'success',
        onConfirm: () => navigation.goBack(),
      });
    } catch (err: any) {
      console.error('[Apply] Submission Error:', err);
      setErrorMsg(err.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    // Learn More View matching mockup
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={26} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
              Become a Peer Supporter
            </Text>
          </View>

          {/* Combined Policy & Terms Card Container */}
          <View style={[styles.policyContainerCard, { backgroundColor: isDark ? '#1E1E1E' : '#F7F8FA' }]}>
            {/* Privacy and Policy */}
            <Text style={[styles.policySectionTitle, { color: colors.text }]}>
              Privacy and Policy
            </Text>
            <Text style={[styles.policyParagraph, { color: colors.textSecondary }]}>
              CareCircle is dedicated to protecting user privacy and maintaining the highest standard of confidentiality. As a Peer Supporter, all shared user stories, conversations, personal details, and session notes are strictly confidential and must never be recorded, shared, or disclosed outside the secure platform environment.
            </Text>
            <Text style={[styles.policyParagraph, { color: colors.textSecondary }]}>
              Any personal data collected during onboarding and verification is processed solely to assess qualification, verify identity, and maintain safety across our peer network. By joining, you agree not to solicit or collect personally identifiable contact information from community members.
            </Text>
            <Text style={[styles.policyParagraph, { color: colors.textSecondary }]}>
              In situations involving immediate self-harm, medical emergencies, or harm to others, you agree to immediately escalate the situation through official CareCircle crisis protocols rather than handling severe clinical crises independently.
            </Text>

            {/* Terms and Conditions */}
            <Text style={[styles.policySectionTitle, { color: colors.text, marginTop: 24 }]}>
              Terms and Conditions
            </Text>
            <Text style={[styles.policyParagraph, { color: colors.textSecondary }]}>
              Peer Supporters act as compassionate, non-judgmental listeners providing emotional solidarity. Supporters are volunteers and do not act as licensed medical clinicians, psychologists, or psychiatrists, nor should they prescribe medical treatments or offer formal diagnostic advice.
            </Text>
            <Text style={[styles.policyParagraph, { color: colors.textSecondary }]}>
              You agree to uphold a safe, respectful, empathetic, and inclusive space free from discrimination, harassment, proselytization, or hate speech. Any misconduct or breach of trust will result in immediate revocation of supporter privileges and account suspension.
            </Text>
            <Text style={[styles.policyParagraph, { color: colors.textSecondary }]}>
              You commit to honoring all scheduled 1-on-1 and group support sessions. If you cannot attend a scheduled session, you agree to cancel or reschedule at least 24 hours in advance to respect participant time and maintain community reliability.
            </Text>
            <Text style={[styles.policyParagraph, { color: colors.textSecondary }]}>
              CareCircle reserves the right to periodically review supporter feedback, manage certification status, and update community safety guidelines to best protect all peer members.
            </Text>
          </View>

          {/* Acknowledgment Checkbox Row */}
          <TouchableOpacity
            style={styles.acknowledgmentRow}
            onPress={() => setAcknowledged(!acknowledged)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkboxBase,
                acknowledged
                  ? { backgroundColor: '#2563EB', borderColor: '#2563EB' }
                  : { backgroundColor: 'transparent', borderColor: isDark ? '#4B5563' : '#CBD5E1' },
              ]}
            >
              {acknowledged && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <Text style={[styles.acknowledgmentCaption, { color: colors.textSecondary }]}>
              <Text style={{ fontWeight: '700', color: colors.text }}>Acknowledgment: </Text>
              By applying, you confirm that you have read, understood, and agree to adhere to the Privacy Policy and Volunteer Terms & Conditions.
            </Text>
          </TouchableOpacity>

          {/* Centered Pill Action Button */}
          <TouchableOpacity
            style={[
              styles.pillApplyButton,
              !acknowledged && styles.pillApplyButtonDisabled,
            ]}
            onPress={() => {
              if (acknowledged) {
                setShowForm(true);
              }
            }}
            disabled={!acknowledged}
            activeOpacity={0.85}
          >
            <Text style={[styles.pillApplyBtnText, !acknowledged && { opacity: 0.8 }]}>Apply Now</Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color="#FFFFFF"
              style={{ opacity: acknowledged ? 1 : 0.8 }}
            />
          </TouchableOpacity>
        </ScrollView>

        <ConfirmationBottomSheet
          visible={!!alertConfig}
          title={alertConfig?.title || ''}
          message={alertConfig?.message || ''}
          type={alertConfig?.type || 'info'}
          singleButton={true}
          confirmText="OK"
          onConfirm={() => {
            const cb = alertConfig?.onConfirm;
            setAlertConfig(null);
            if (cb) cb();
          }}
          onCancel={() => {
            const cb = alertConfig?.onConfirm;
            setAlertConfig(null);
            if (cb) cb();
          }}
        />
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
          <View style={styles.centeredHeaderRow}>
            <TouchableOpacity onPress={() => setShowForm(false)} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.centeredHeaderTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
              Application Form
            </Text>
            <View style={{ width: 28 }} />
          </View>
          
          <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
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
            <Text style={[styles.label, { color: colors.text }]}>Evidence of Credentials</Text>
            <Text style={[styles.inputHint, { color: colors.textSecondary, marginBottom: 10 }]}>
              Please upload a document (PDF, PNG, JPG) or take a photo of your certificate/reference in real-time.
            </Text>

            {!evidenceFile ? (
              <View style={styles.pickerOptionsContainer}>
                <TouchableOpacity
                  style={[styles.pickerOptionBtn, { backgroundColor: colors.brandLight, borderColor: colors.border }]}
                  onPress={handleDocumentPick}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-attach-outline" size={24} color={colors.brand} />
                  <Text style={[styles.pickerOptionText, { color: colors.text }]}>Upload File</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pickerOptionBtn, { backgroundColor: colors.brandLight, borderColor: colors.border }]}
                  onPress={handleCameraCapture}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera-outline" size={24} color={colors.brand} />
                  <Text style={[styles.pickerOptionText, { color: colors.text }]}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pickerOptionBtn, { backgroundColor: colors.brandLight, borderColor: colors.border }]}
                  onPress={handleLibraryPick}
                  activeOpacity={0.7}
                >
                  <Ionicons name="images-outline" size={24} color={colors.brand} />
                  <Text style={[styles.pickerOptionText, { color: colors.text }]}>Gallery</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.evidencePreviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {evidenceFile.type.startsWith('image/') ? (
                  <Image source={{ uri: evidenceFile.uri }} style={styles.evidenceImageThumbnail} />
                ) : (
                  <View style={[styles.documentIconContainer, { backgroundColor: colors.brandLight }]}>
                    <Ionicons name="document-text-outline" size={32} color={colors.brand} />
                  </View>
                )}
                
                <View style={styles.evidenceDetails}>
                  <Text style={[styles.evidenceFileName, { color: colors.text }]} numberOfLines={1}>
                    {evidenceFile.name}
                  </Text>
                  <Text style={[styles.evidenceFileSize, { color: colors.textSecondary }]}>
                    {evidenceFile.type.split('/')[1]?.toUpperCase() || 'FILE'}
                    {evidenceFile.size ? ` • ${(evidenceFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.removeEvidenceBtn}
                  onPress={() => setEvidenceFile(null)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.accentRed} />
                </TouchableOpacity>
              </View>
            )}
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

      <ConfirmationBottomSheet
        visible={!!alertConfig}
        title={alertConfig?.title || ''}
        message={alertConfig?.message || ''}
        type={alertConfig?.type || 'info'}
        singleButton={true}
        confirmText="OK"
        onConfirm={() => {
          const cb = alertConfig?.onConfirm;
          setAlertConfig(null);
          if (cb) cb();
        }}
        onCancel={() => {
          const cb = alertConfig?.onConfirm;
          setAlertConfig(null);
          if (cb) cb();
        }}
      />
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
  centeredHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtn: {
    padding: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  centeredHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
    flex: 1,
  },
  policyContainerCard: {
    borderRadius: 20,
    padding: 20,
    paddingBottom: 24,
    marginBottom: 18,
  },
  policySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  policyParagraph: {
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 10,
  },
  acknowledgmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 4,
    gap: 12,
  },
  checkboxBase: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  acknowledgmentCaption: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  pillApplyButton: {
    alignSelf: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 28,
    paddingVertical: 13,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  pillApplyButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  pillApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
  inputHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  pickerOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  pickerOptionBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  pickerOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  evidencePreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 12,
  },
  evidenceImageThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  documentIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  evidenceFileName: {
    fontSize: 14,
    fontWeight: '600',
  },
  evidenceFileSize: {
    fontSize: 11,
    marginTop: 2,
  },
  removeEvidenceBtn: {
    padding: 6,
  },
});
