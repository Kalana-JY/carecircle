import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import type { MainStackParamList } from '../../navigation/MainNavigator';
import { goalApi, type GoalRecord } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

const GIRL_IMAGE = require('../../../assets/images/girl2.png');
const LOGO_IMAGE = require('../../../assets/images/cc_logo.png');

type GoalMode = 'create' | 'edit';

const CATEGORIES = ['Health', 'Mindfulness', 'Wellness', 'Productivity', 'Learning'];

export default function AddGoalScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<any>();
  const { user } = useAuth();

  const isEdit = route.params?.mode === 'edit';
  const existingGoal: GoalRecord | undefined = route.params?.goal;

  const [title, setTitle] = useState(existingGoal?.title || '');
  const [category, setCategory] = useState(existingGoal?.category || 'Health');
  const [target, setTarget] = useState(existingGoal?.target || '');
  const [deadline, setDeadline] = useState(existingGoal?.deadline ? existingGoal.deadline.slice(0, 10) : '');
  const [notes, setNotes] = useState(existingGoal?.notes || '');
  const [reminder, setReminder] = useState(Boolean(existingGoal?.reminder));
  const [reminderTime, setReminderTime] = useState(existingGoal?.reminderTime || '09:00');
  const [loading, setLoading] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  useEffect(() => {
    if (existingGoal) {
      setTitle(existingGoal.title || '');
      setCategory(existingGoal.category || 'Health');
      setTarget(existingGoal.target || '');
      setDeadline(existingGoal.deadline ? existingGoal.deadline.slice(0, 10) : '');
      setNotes(existingGoal.notes || '');
      setReminder(Boolean(existingGoal.reminder));
      setReminderTime(existingGoal.reminderTime || '09:00');
    }
  }, [existingGoal]);

  const validate = () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please add a goal title.');
      return false;
    }

    if (!deadline) {
      Alert.alert('Missing deadline', 'Please select a deadline.');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const payload = {
        title: title.trim(),
        category,
        target: target.trim() || 'Daily goal',
        deadline: new Date(deadline).toISOString(),
        notes: notes.trim(),
        reminder,
        reminderTime: reminder ? reminderTime : null,
      };

      if (isEdit && existingGoal) {
        await goalApi.update(existingGoal._id, payload);
      } else {
        await goalApi.create(payload);
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('[AddGoalScreen] Save failed', error);
      Alert.alert('Error', error?.message || 'Could not save goal.');
    } finally {
      setLoading(false);
    }
  };

  const renderHeaderTab = (title: string, route: 'Goals' | 'AddGoal' | 'Achievements' | 'Reports') => {
    const selected = title === 'Add goals';

    return (
      <Pressable
        key={title}
        onPress={() => navigation.navigate(route as any)}
        style={[styles.headerTab, selected && styles.headerTabSelected]}
      >
        <Text style={[styles.headerTabText, selected && styles.headerTabTextSelected]}>
          {title}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        {/* ============================================
            HEADER
        ============================================ */}

        <View style={styles.hero}>
          {/* Girl image */}
          <Image source={GIRL_IMAGE} style={styles.girlImage} resizeMode="cover" />

          {/* TOP BAR */}
          <View style={styles.topBar}>
            <View style={styles.logoContainer}>
              <Image source={LOGO_IMAGE} style={styles.logoImage} />

              <Text style={styles.logoText}>CareCircle</Text>
            </View>

            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
            >
              <View style={styles.profileInitials}>
                <Text style={styles.profileInitialsText}>
                  {user?.name
                    ? user.name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()
                    : '?'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* HEADER TABS */}
          <View style={styles.headerTabs}>
            {renderHeaderTab('My goals', 'Goals')}
            {renderHeaderTab('Add goals', 'AddGoal')}
            {renderHeaderTab('Achievements', 'Achievements')}
            {renderHeaderTab('Reports', 'Reports')}
          </View>
        </View>

        {/* ============================================
            CONTENT
        ============================================ */}

        <View style={styles.contentWrapper}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* TITLE */}
            <Text style={styles.screenTitle}>My wellness goals</Text>

            {/* SECTION LABEL */}
            <Text style={styles.sectionLabel}>NEW GOAL</Text>

            {/* FORM FIELDS */}

            {/* Goal Title */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Goal title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Walk 20 minutes daily"
                placeholderTextColor="#A0AEC0"
              />
            </View>

            {/* Category */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Category</Text>
              <Pressable
                style={styles.input}
                onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
              >
                <Text style={category ? styles.inputText : styles.placeholderText}>
                  {category || 'Select category'}
                </Text>
                <Ionicons name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#4B79B8" />
              </Pressable>

              {showCategoryDropdown && (
                <View style={styles.dropdown}>
                  {CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setCategory(cat);
                        setShowCategoryDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{cat}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Target */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Target</Text>
              <TextInput
                style={styles.input}
                value={target}
                onChangeText={setTarget}
                placeholder="e.g. 5 days/week"
                placeholderTextColor="#A0AEC0"
              />
            </View>

            {/* Deadline */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Deadline</Text>
              <TextInput
                style={styles.input}
                value={deadline}
                onChangeText={setDeadline}
                placeholder="mm/dd/yyyy"
                placeholderTextColor="#A0AEC0"
              />
            </View>

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any details that help you stay on track"
                placeholderTextColor="#A0AEC0"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Daily Reminder */}
            <View style={styles.reminderRow}>
              <View>
                <Text style={styles.label}>Daily reminder</Text>
                <Text style={styles.reminderHint}>You'll get a gentle nudge at 8:00 PM on days this goal is due</Text>
              </View>
              <Switch
                value={reminder}
                onValueChange={setReminder}
                trackColor={{ false: '#E0E0E0', true: '#1765C0' }}
                thumbColor={reminder ? '#FFFFFF' : '#F0F0F0'}
              />
            </View>

            {reminder && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Reminder time</Text>
                <TextInput
                  style={styles.input}
                  value={reminderTime}
                  onChangeText={setReminderTime}
                  placeholder="09:00"
                  placeholderTextColor="#A0AEC0"
                />
              </View>
            )}

            {/* Buttons */}
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save goal'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  screen: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  // --------------------------------------------------
  // HERO
  // --------------------------------------------------

  hero: {
    height: 280,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#E8D7C3',
  },

  girlImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },

  topBar: {
    position: 'absolute',
    top: 14,
    left: 18,
    right: 18,

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    zIndex: 20,
  },

  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: 'rgba(255, 255, 255, 0.15)',

    borderRadius: 20,

    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  logoImage: {
    width: 28,
    height: 28,

    marginRight: 7,
  },

  logoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },

  profileButton: {
    width: 39,
    height: 39,
    borderRadius: 20,

    borderWidth: 2,
    borderColor: '#FFFFFF',

    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  profileInitials: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1765C0',
    borderRadius: 19,
  },

  profileInitialsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // --------------------------------------------------
  // HEADER TABS
  // --------------------------------------------------

  headerTabs: {
    position: 'absolute',

    left: 0,
    right: 0,
    bottom: 0,

    height: 50,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 17,

    backgroundColor: 'rgba(0, 0, 0, 0.35)',

    zIndex: 20,
  },

  headerTab: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  headerTabSelected: {
    borderBottomColor: '#FFFFFF',
  },

  headerTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },

  headerTabTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // --------------------------------------------------
  // CONTENT
  // --------------------------------------------------

  contentWrapper: {
    flex: 1,

    marginTop: -1,

    backgroundColor: '#F7F8FA',

    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,

    overflow: 'hidden',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 17,
    paddingTop: 19,
    paddingBottom: 25,
  },

  screenTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1b2837',
    marginBottom: 20,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: '#687482',
    marginBottom: 15,
    textTransform: 'uppercase',
  },

  fieldGroup: {
    marginBottom: 18,
  },

  label: {
    fontSize: 15,
    color: '#243347',
    marginBottom: 8,
    fontWeight: '600',
  },

  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#dfe8f3',
    fontSize: 16,
    color: '#1a2430',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as any,

  inputText: {
    fontSize: 16,
    color: '#1a2430',
  },

  placeholderText: {
    fontSize: 16,
    color: '#A0AEC0',
  },

  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },

  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dfe8f3',
    marginTop: -8,
    overflow: 'hidden',
    zIndex: 100,
  },

  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  dropdownItemText: {
    fontSize: 16,
    color: '#1a2430',
  },

  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dfe8f3',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  reminderHint: {
    fontSize: 12,
    color: '#657384',
    marginTop: 4,
  },

  saveButton: {
    marginTop: 10,
    backgroundColor: '#1765C0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },

  cancelButtonText: {
    color: '#1765C0',
    fontSize: 16,
    fontWeight: '600',
  },
});
