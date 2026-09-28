import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Image,
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '@/store/AuthContext';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiFetch } from '@/services/api';

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say'];

export default function PersonalInfoScreen() {
  const { user, updateUser } = useAuth();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';

  const colors = {
    background: isDark ? '#121212' : '#EDF4F9',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#5A6472',
    border: isDark ? '#2E2E2E' : '#E2E8F0',
    inputBg: isDark ? '#1E1E1E' : '#FFFFFF',
    brand: '#245B8B',
    brandLight: isDark ? '#1E3A5F' : '#E8F1F9',
  };

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [gender, setGender] = useState(user?.gender || 'Male');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '12-25-1998');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl || null);
  const [appStatus, setAppStatus] = useState<string>('none');

  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchApplicationStatus = useCallback(async () => {
    if (!user?.token) return;
    try {
      const data = await apiFetch('/api/peer-supporters/status');
      if (data && data.status) {
        setAppStatus(data.status);
      }
    } catch (error) {
      console.error('[PersonalInfo] Failed to fetch application status:', error);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchApplicationStatus();
    }, [fetchApplicationStatus])
  );

  const getBadgeStyle = () => {
    if (user?.isAdmin) {
      return {
        label: 'Admin',
        bg: isDark ? '#2C1E40' : '#F3E8FF',
        text: isDark ? '#C084FC' : '#7E22CE',
      };
    }
    if (appStatus === 'approved') {
      return {
        label: 'Peer Supporter',
        bg: isDark ? '#143825' : '#DBFFE0',
        text: '#0AC600',
      };
    }
    if (appStatus === 'pending') {
      return {
        label: 'Pending',
        bg: isDark ? '#3D2E14' : '#FFF3CD',
        text: isDark ? '#FFC107' : '#856404',
      };
    }
    return {
      label: 'Member',
      bg: isDark ? '#1E254A' : '#E8ECFD',
      text: isDark ? '#7E95FD' : '#4C60E6',
    };
  };

  // Pick avatar image from library
  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permissions are needed to change profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('[PersonalInfo] Error picking image:', err);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const year = selectedDate.getFullYear();
      setDateOfBirth(`${month}-${day}-${year}`);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateUser({
        name,
        email,
        phoneNumber,
        gender,
        dateOfBirth,
        avatarUrl: avatarUri || undefined,
      });
      if (Platform.OS === 'web') {
        window.alert('Profile updated successfully!');
      } else {
        Alert.alert('Success', 'Personal info updated successfully!');
      }
      navigation.goBack();
    } catch (err) {
      console.error('[PersonalInfo] Save error:', err);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  // Helper for initials
  const getInitials = (n?: string) => {
    if (!n) return 'U';
    return n
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

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
          Personal Info
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar with Edit Badge */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.brandLight }]}>
                <Text style={[styles.avatarFallbackText, { color: colors.brand }]}>
                  {getInitials(name)}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.editBadge, { backgroundColor: colors.brand }]}
              onPress={handlePickAvatar}
              activeOpacity={0.8}
              accessibilityLabel="Change profile picture"
            >
              <Ionicons name="pencil" size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Role Pill Badge */}
          {(() => {
            const badge = getBadgeStyle();
            return (
              <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.roleBadgeText, { color: badge.text }]}>
                  {badge.label}
                </Text>
              </View>
            );
          })()}
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <View style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Enter full name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <View style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email address"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Phone Number */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
            <View style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="+94 71 8562 369"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Gender */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Gender</Text>
            <TouchableOpacity
              style={[styles.inputBox, styles.pickerBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={() => setGenderModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.inputText, { color: colors.text }]}>{gender}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Date of Birth */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Date of Birth</Text>
            <TouchableOpacity
              style={[styles.inputBox, styles.pickerBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.inputText, { color: colors.text }]}>{dateOfBirth}</Text>
              <Ionicons name="calendar-outline" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.brand }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker Modal for Android / iOS */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date(dateOfBirth ? Date.parse(dateOfBirth) || Date.now() : Date.now())}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* Gender Selection Modal */}
      <Modal
        visible={genderModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setGenderModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setGenderModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Gender</Text>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.genderOption,
                  gender === option && { backgroundColor: colors.brandLight },
                ]}
                onPress={() => {
                  setGender(option);
                  setGenderModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.genderOptionText,
                    { color: gender === option ? colors.brand : colors.text },
                    gender === option && { fontWeight: '700' },
                  ]}
                >
                  {option}
                </Text>
                {gender === option && <Ionicons name="checkmark" size={18} color={colors.brand} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontSize: 32,
    fontWeight: '700',
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputBox: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  pickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  input: {
    fontSize: 15,
    padding: 0,
    margin: 0,
  },
  inputText: {
    fontSize: 15,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
    textAlign: 'center',
  },
  genderOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  genderOptionText: {
    fontSize: 15,
  },
});
