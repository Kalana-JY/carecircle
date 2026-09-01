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
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Fonts, Colors } from '@/constants/theme';
import { apiFetch } from '@/services/api';
import { FORUM_CATEGORIES, ForumPostItem } from '@/constants/forum';

export default function CreatePostScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editingPost = route.params?.post as ForumPostItem | undefined;
  const colorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[colorScheme];

  const [selectedCategory, setSelectedCategory] = useState<string | null>(editingPost?.category ?? null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [title, setTitle] = useState(editingPost?.title ?? '');
  const [content, setContent] = useState(editingPost?.content ?? '');
  const [isAnonymous, setIsAnonymous] = useState(editingPost?.isAnonymous ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'title' | 'content' | null>(null);

  const handleSubmit = async () => {
    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a post title');
      return;
    }
    if (!content.trim()) {
      setError('Please write some content');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (editingPost) {
        await apiFetch(`/api/forum/${editingPost._id}`, {
          method: 'PUT',
          body: {
            category: selectedCategory,
            title: title.trim(),
            content: content.trim(),
            isAnonymous,
          },
        });
        navigation.goBack();
      } else {
        const created = await apiFetch('/api/forum', {
          method: 'POST',
          body: {
            category: selectedCategory,
            title: title.trim(),
            content: content.trim(),
            isAnonymous,
          },
        });
        navigation.replace('ForumDetail', { id: created._id });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save post. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <View style={[styles.header, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          disabled={isSubmitting}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
          {editingPost ? 'Edit Post' : 'New Post'}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#BA1A1A" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Category Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
              Category
            </Text>
            <TouchableOpacity
              style={[
                styles.dropdown,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: selectedCategory ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setIsCategoryModalOpen(true)}
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              <Ionicons name="pricetag-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <Text style={[styles.dropdownText, { color: selectedCategory ? colors.text : colors.textSecondary }]}>
                {selectedCategory || 'Select a category'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Post Title */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
              Post Title
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: focusedInput === 'title' ? colors.primary : colors.border,
                  borderWidth: focusedInput === 'title' ? 2 : 1,
                },
              ]}
            >
              <Ionicons name="text-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="What would you like to share?"
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (error) setError(null);
                }}
                onFocus={() => setFocusedInput('title')}
                onBlur={() => setFocusedInput(null)}
                editable={!isSubmitting}
                maxLength={120}
              />
            </View>
          </View>

          {/* Post Content */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
              Post Content
            </Text>
            <View
              style={[
                styles.contentWrapper,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: focusedInput === 'content' ? colors.primary : colors.border,
                  borderWidth: focusedInput === 'content' ? 2 : 1,
                },
              ]}
            >
              <TextInput
                style={[styles.contentInput, { color: colors.text }]}
                placeholder="Share your thoughts, experiences, or ask for support..."
                placeholderTextColor={colors.textSecondary}
                multiline
                value={content}
                onChangeText={(text) => {
                  setContent(text);
                  if (error) setError(null);
                }}
                onFocus={() => setFocusedInput('content')}
                onBlur={() => setFocusedInput(null)}
                editable={!isSubmitting}
                textAlignVertical="top"
                maxLength={2000}
              />
            </View>
            <Text style={[styles.charCount, { color: colors.textSecondary }]}>
              {content.length}/2000
            </Text>
          </View>

          {/* Post Mode (Anonymity Toggle) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
              Post Mode
            </Text>
            <View
              style={[
                styles.modeSelector,
                { backgroundColor: colors.inputBg, borderColor: colors.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  { backgroundColor: !isAnonymous ? colors.primary : 'transparent' },
                ]}
                onPress={() => setIsAnonymous(false)}
                activeOpacity={0.8}
                disabled={isSubmitting}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={!isAnonymous ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modeText,
                    { color: !isAnonymous ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  Public
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  { backgroundColor: isAnonymous ? colors.primary : 'transparent' },
                ]}
                onPress={() => setIsAnonymous(true)}
                activeOpacity={0.8}
                disabled={isSubmitting}
              >
                <Ionicons
                  name="eye-off-outline"
                  size={18}
                  color={isAnonymous ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modeText,
                    { color: isAnonymous ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  Anonymous
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              {isAnonymous
                ? 'Your username and profile will be hidden from other members.'
                : 'Your username and profile will be visible to other members.'}
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.primary },
              isSubmitting && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.onPrimary, fontFamily: Fonts.rounded || 'System' }]}>
                {editingPost ? 'Save Changes' : 'Post to Community'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Picker Modal */}
      <Modal
        visible={isCategoryModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCategoryModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
                Select Category
              </Text>
              <TouchableOpacity onPress={() => setIsCategoryModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={FORUM_CATEGORIES}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    { borderBottomColor: colors.border },
                    selectedCategory === item.name && { backgroundColor: colors.inputBg },
                  ]}
                  onPress={() => {
                    setSelectedCategory(item.name);
                    setIsCategoryModalOpen(false);
                    if (error) setError(null);
                  }}
                >
                  <View style={styles.categoryTextWrap}>
                    <Text style={[styles.categoryName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.categoryDescription, { color: colors.textSecondary }]}>
                      {item.description}
                    </Text>
                  </View>
                  {selectedCategory === item.name && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFDAD6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#BA1A1A',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 20,
    letterSpacing: 0.14,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
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
  contentWrapper: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  contentInput: {
    minHeight: 140,
    fontSize: 16,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
    marginTop: 6,
  },
  modeSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    gap: 4,
  },
  modeOption: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    height: 40,
    borderRadius: 6,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  hintText: {
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
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
    maxHeight: '60%',
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
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  categoryTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryDescription: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
});
