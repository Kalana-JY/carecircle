import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Fonts, Colors } from '@/constants/theme';

export default function ExploreScreen() {
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { title: 'Meditation & Breathwork', count: '12 sessions', icon: 'leaf-outline', color: '#34C759', route: null },
    { title: 'Cognitive Exercises', count: '8 exercises', icon: 'brain-outline', color: '#AF52DE', route: null },
    { title: 'Sleep Sanctuary', count: '15 tracks', icon: 'moon-outline', color: '#FF9500', route: null },
    { title: 'Gratitude Journaling', count: '5 prompts', icon: 'journal-outline', color: '#FF2D55', route: null },
    { title: 'Peer Support Sessions', count: 'Connect live', icon: 'people-outline', color: '#245B8B', route: 'BookSession' },
    { title: 'Crisis Hotlines & Help', count: 'Directory', icon: 'call-outline', color: '#5856D6', route: null },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
          Explore Tools
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Find practices, exercises, and audio sessions to support your well-being.
        </Text>

        {/* Search Bar */}
        <View style={[styles.searchWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search exercises, articles, guides..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Categories Grid */}
        <View style={styles.grid}>
          {categories.map((category, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.8}
              onPress={() => {
                if (category.route) {
                  navigation.navigate(category.route);
                } else {
                  Alert.alert('Start Activity', `Launching "${category.title}"...`);
                }
              }}
            >
              <View style={[styles.iconBg, { backgroundColor: category.color + '1A' }]}>
                <Ionicons name={category.icon as any} size={24} color={category.color} />
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                  {category.title}
                </Text>
                <Text style={[styles.cardCount, { color: colors.textSecondary }]}>
                  {category.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  card: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    minHeight: 140,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
  },
  cardCount: {
    fontSize: 12,
    fontWeight: '500',
  },
});
