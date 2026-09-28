import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  StatusBar,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORIES = ['General', 'Account', 'Services', 'Mental Health', 'Sessions'];

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    category: 'General',
    question: 'What is CareCircle?',
    answer:
      'CareCircle is a mental health app designed to help you improve your well-being through personalized plans, meditation exercises, mood tracking, peer support, and more.',
  },
  {
    id: '2',
    category: 'General',
    question: 'How does CareCircle work?',
    answer:
      'CareCircle connects you with approved peer supporters and empowers your daily wellness with evidence-based mood journaling, goal setting, community forums, and 1-on-1 support sessions.',
  },
  {
    id: '3',
    category: 'General',
    question: 'Is CareCircle free to use?',
    answer:
      'Yes! CareCircle is completely free for standard members. You can access community discussions, mood trackers, mindfulness resources, and schedule peer support sessions without any charge.',
  },
  {
    id: '4',
    category: 'General',
    question: 'Can I use CareCircle offline?',
    answer:
      'You can write journal entries and view saved mental health resources offline. Once you reconnect to the internet, your logs and activities will automatically synchronize.',
  },
  {
    id: '5',
    category: 'Account',
    question: 'Is my data secure with CareCircle?',
    answer:
      'Yes, privacy and confidentiality are our highest priorities. All user data, private chats, and journal entries are encrypted and securely stored in compliance with modern privacy standards.',
  },
  {
    id: '6',
    category: 'Account',
    question: 'Can I export my CareCircle data?',
    answer:
      'Yes. You can generate and export comprehensive wellness summaries and mood reports directly from the Reports section in the app.',
  },
  {
    id: '7',
    category: 'Sessions',
    question: 'How do peer support sessions work?',
    answer:
      'You can browse available session slots hosted by certified peer supporters under the Sessions tab, pick a convenient time, and join online via secure video or attend in-person.',
  },
  {
    id: '8',
    category: 'Services',
    question: 'How do I become a certified Peer Supporter?',
    answer:
      'Navigate to the side menu and select "Become a Peer Supporter". Fill out the verification form with your background and credentials for our admin team to review.',
  },
];

export default function FAQScreen() {
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';

  const colors = {
    background: isDark ? '#121212' : '#F7F9FB',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#ECEDEE' : '#1C2024',
    textSecondary: isDark ? '#9BA1A6' : '#687076',
    border: isDark ? '#2E2E2E' : '#E8EEF4',
    brandPill: '#73A977',
    inputBg: isDark ? '#1E1E1E' : '#FFFFFF',
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [expandedId, setExpandedId] = useState<string | null>('1');

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredFAQs = FAQ_DATA.filter((item) => {
    const matchesCategory =
      selectedCategory === 'General' ? true : item.category === selectedCategory;
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
          FAQ
        </Text>

        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Input */}
        <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContainer}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.pill,
                  isSelected
                    ? { backgroundColor: colors.brandPill }
                    : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* FAQ Accordion List */}
        <View style={styles.faqList}>
          {filteredFAQs.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="help-circle-outline" size={40} color={colors.textSecondary} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No matching questions found.</Text>
            </View>
          ) : (
            filteredFAQs.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <View
                  key={item.id}
                  style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <TouchableOpacity
                    style={styles.faqHeader}
                    onPress={() => toggleExpand(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.faqQuestion, { color: colors.text }]}>{item.question}</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.faqBody}>
                      <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
                        {item.answer}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderWidth: 1,
    gap: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    margin: 0,
  },
  pillsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 16,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  faqList: {
    gap: 12,
  },
  faqCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  faqBody: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    paddingTop: 4,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 14,
  },
});
