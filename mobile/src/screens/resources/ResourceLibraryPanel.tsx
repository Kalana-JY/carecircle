import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '../../components/ResourcesChrome';
import { useAuth } from '@/store/AuthContext';
import {
  MentalHealthResource,
  ResourceFilters,
  ResourceReview,
  resourceApi,
  resourceTypeLabel,
} from '../../services/resources';

type Props = {
  mode?: 'browse' | 'bookmarks';
  refreshKey?: number;
};

const TYPES = ['', 'article', 'video', 'self-help-guide'];

export function ResourceLibraryPanel({ mode = 'browse', refreshKey = 0 }: Props) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [topic, setTopic] = useState('');
  const [filters, setFilters] = useState<ResourceFilters>({ types: [], categories: [], topics: [] });
  const [items, setItems] = useState<MentalHealthResource[]>([]);
  const [recommended, setRecommended] = useState<MentalHealthResource[]>([]);
  const [selected, setSelected] = useState<MentalHealthResource | null>(null);
  const [reviews, setReviews] = useState<ResourceReview[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'bookmarks') {
        const saved = await resourceApi.bookmarks();
        setItems(saved.items || []);
        setRecommended([]);
        return;
      }

      const [list, filterOptions, suggestions] = await Promise.all([
        resourceApi.list({ q: appliedQuery.trim(), category, topic, type }),
        resourceApi.filters().catch(() => ({ types: [], categories: [], topics: [] })),
        resourceApi.recommendations().catch(() => ({ items: [] })),
      ]);
      setItems(list.items || []);
      setFilters(filterOptions);
      setRecommended(suggestions.items || []);
    } catch (loadError: any) {
      setItems([]);
      setError(loadError.message || 'Unable to load resources.');
    } finally {
      setLoading(false);
    }
  }, [mode, appliedQuery, category, topic, type]);

  useEffect(() => {
    const timer = setTimeout(() => setAppliedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const openResource = async (resource: MentalHealthResource) => {
    try {
      const detail = await resourceApi.get(resource._id);
      const reviewList = await resourceApi.reviews(resource._id).catch(() => ({ items: [] as ResourceReview[] }));
      setSelected(detail);
      setReviews(reviewList.items || detail.reviews || []);
      setError('');
    } catch (openError: any) {
      setError(openError.message || 'Unable to open that resource.');
    }
  };

  const toggleBookmark = async (resource: MentalHealthResource) => {
    try {
      const result = await resourceApi.toggleBookmark(resource._id);
      setItems((current) => {
        if (mode === 'bookmarks' && !result.bookmarked) return current.filter((item) => item._id !== resource._id);
        return current.map((item) => (item._id === resource._id ? { ...item, bookmarked: result.bookmarked } : item));
      });
      setRecommended((current) => current.map((item) => (
        item._id === resource._id ? { ...item, bookmarked: result.bookmarked } : item
      )));
      setSelected((current) => (current && current._id === resource._id ? { ...current, bookmarked: result.bookmarked } : current));
    } catch (saveError: any) {
      setError(saveError.message || 'Sign in to bookmark resources.');
    }
  };

  const submitReview = async () => {
    if (!selected) return;
    try {
      const result = await resourceApi.addReview(selected._id, rating, comment.trim());
      setReviews(result.reviews || []);
      setSelected({ ...selected, averageRating: result.averageRating, ratingsCount: result.ratingsCount });
      setComment('');
      setError('');
    } catch (reviewError: any) {
      setError(reviewError.message || 'Unable to save your review.');
    }
  };

  const shareResource = async (method: 'link' | 'email' | 'sms') => {
    if (!selected) return;
    try {
      const result = await resourceApi.share(selected._id, method);
      const payload = result.share;
      if (method === 'email') {
        await Linking.openURL(`mailto:?subject=${encodeURIComponent(payload.title)}&body=${encodeURIComponent(payload.text)}`);
        return;
      }
      if (method === 'sms') {
        await Linking.openURL(`sms:?body=${encodeURIComponent(payload.text)}`);
        return;
      }
      await Share.share({ message: payload.text });
    } catch (shareError: any) {
      setError(shareError.message || 'Unable to share this resource.');
    }
  };

  if (selected) {
    return (
      <View style={styles.wrap}>
        <TouchableOpacity onPress={() => setSelected(null)} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={BRAND} />
          <Text style={styles.backText}>All resources</Text>
        </TouchableOpacity>
        <Text style={styles.kicker}>{resourceTypeLabel(selected.type)}</Text>
        <Text style={styles.title}>{selected.title}</Text>
        {selected.author || selected.source ? (
          <Text style={styles.meta}>{[selected.author, selected.source].filter(Boolean).join(' · ')}</Text>
        ) : null}
        <Text style={styles.meta}>
          {selected.averageRating ? `${selected.averageRating} / 5` : 'No ratings yet'}
          {selected.ratingsCount ? ` · ${selected.ratingsCount} review${selected.ratingsCount === 1 ? '' : 's'}` : ''}
          {selected.durationMinutes ? ` · ${selected.durationMinutes} min` : ''}
        </Text>
        {selected.description ? <Text style={styles.body}>{selected.description}</Text> : null}
        {selected.content ? <Text style={styles.body}>{selected.content}</Text> : null}
        {(selected.steps || []).map((step, index) => (
          <View key={`${step.title}-${index}`} style={styles.step}>
            <Text style={styles.stepTitle}>{index + 1}. {step.title}</Text>
            {step.body ? <Text style={styles.body}>{step.body}</Text> : null}
          </View>
        ))}
        {selected.url ? (
          <TouchableOpacity style={styles.primary} onPress={() => Linking.openURL(selected.url as string)}>
            <Text style={styles.primaryText}>{selected.type === 'video' ? 'Watch video' : 'Open link'}</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.row}>
          <TouchableOpacity style={styles.secondary} onPress={() => toggleBookmark(selected)}>
            <Text style={styles.secondaryText}>{selected.bookmarked ? 'Remove bookmark' : 'Bookmark'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.section}>Share</Text>
        <View style={styles.row}>
          {(['link', 'email', 'sms'] as const).map((method) => (
            <TouchableOpacity key={method} style={styles.chip} onPress={() => shareResource(method)}>
              <Text style={styles.chipText}>{method}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.section}>Rate and review</Text>
        <View style={styles.row}>
          {[1, 2, 3, 4, 5].map((value) => (
            <TouchableOpacity key={value} onPress={() => setRating(value)} style={[styles.star, rating === value && styles.starOn]}>
              <Text style={[styles.starText, rating === value && styles.starTextOn]}>{value}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="What was useful?"
          placeholderTextColor="#8B949E"
          style={styles.input}
          multiline
        />
        <TouchableOpacity style={styles.primary} onPress={submitReview}>
          <Text style={styles.primaryText}>Save review</Text>
        </TouchableOpacity>
        {reviews.map((review, index) => (
          <View key={review._id || `${index}`} style={styles.review}>
            <Text style={styles.stepTitle}>
              {typeof review.user === 'object' ? review.user?.name || 'Member' : 'Member'} · {review.rating}/5
            </Text>
            {review.comment ? <Text style={styles.body}>{review.comment}</Text> : null}
          </View>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const hero = recommended[0];
  const categoryChips = ['', ...filters.categories];

  return (
    <View style={styles.wrap}>
      {mode === 'browse' ? (
        <>
          <Text style={styles.title}>{greeting}, {firstName}.</Text>
          <Text style={styles.subtitle}>Here is a gentle space for you today.</Text>
          <View style={styles.search}>
            <Ionicons name="search-outline" size={18} color="#7A828C" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search resources"
              placeholderTextColor="#8B949E"
              style={styles.searchInput}
            />
          </View>
          <View style={styles.row}>
            {categoryChips.map((value) => (
              <TouchableOpacity key={value || 'all'} onPress={() => setCategory(value)} style={[styles.chip, category === value && styles.chipOn]}>
                <Text style={[styles.chipText, category === value && styles.chipTextOn]}>{value || 'All'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.row}>
            {TYPES.map((value) => (
              <TouchableOpacity key={value || 'all-types'} onPress={() => setType(value)} style={[styles.chip, type === value && styles.chipOn]}>
                <Text style={[styles.chipText, type === value && styles.chipTextOn]}>{value ? resourceTypeLabel(value) : 'All types'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {hero ? (
            <TouchableOpacity style={styles.hero} onPress={() => openResource(hero)} activeOpacity={0.9}>
              <Text style={styles.section}>Recommended for you</Text>
              <Text style={styles.kicker}>{resourceTypeLabel(hero.type)}{hero.category ? ` · ${hero.category}` : ''}</Text>
              <Text style={styles.heroTitle}>{hero.title}</Text>
              {hero.description ? <Text style={styles.body} numberOfLines={3}>{hero.description}</Text> : null}
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.primaryInline}
                  onPress={() => (hero.url ? Linking.openURL(hero.url) : openResource(hero))}
                >
                  <Text style={styles.primaryText}>{hero.type === 'video' ? 'Watch now' : 'Open'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.savePill} onPress={() => toggleBookmark(hero)}>
                  <Text style={styles.savePillText}>{hero.bookmarked ? 'Saved' : 'Save resource'}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.section}>All resources</Text>
        </>
      ) : (
        <>
          <Text style={styles.title}>Saved resources</Text>
          <Text style={styles.subtitle}>Guides you kept for later, plus a place to leave a review.</Text>
        </>
      )}
      {loading ? <Text style={styles.meta}>Loading resources...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && items.length === 0 ? (
        <Text style={styles.meta}>
          {mode === 'bookmarks' ? 'You have not bookmarked any resources yet.' : 'No published resources match this search.'}
        </Text>
      ) : null}
      {items.map((item) => (
        <ResourceCard key={item._id} item={item} onOpen={openResource} onBookmark={toggleBookmark} />
      ))}
      {mode === 'bookmarks' && items[0] ? (
        <View style={styles.reviewCard}>
          <Text style={styles.section}>Rate & review</Text>
          <Text style={styles.meta}>Share feedback on {items[0].title}</Text>
          <View style={styles.row}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity key={value} onPress={() => setRating(value)}>
                <Ionicons name={value <= rating ? 'star' : 'star-outline'} size={22} color={BRAND} />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Share your thoughts..."
            placeholderTextColor="#8B949E"
            style={styles.input}
            multiline
          />
          <TouchableOpacity
            style={styles.primary}
            onPress={async () => {
              try {
                await resourceApi.addReview(items[0]._id, rating, comment.trim());
                setComment('');
                setError('');
              } catch (reviewError: any) {
                setError(reviewError.message || 'Unable to save your review.');
              }
            }}
          >
            <Text style={styles.primaryText}>Submit review</Text>
          </TouchableOpacity>
          <Text style={styles.whyTitle}>Why this is recommended</Text>
          <Text style={styles.meta}>Based on your saved resources, interests, and wellbeing activities.</Text>
        </View>
      ) : null}
    </View>
  );
}

function ResourceCard({
  item,
  onOpen,
  onBookmark,
}: {
  item: MentalHealthResource;
  onOpen: (item: MentalHealthResource) => void;
  onBookmark: (item: MentalHealthResource) => void;
}) {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardMain} onPress={() => onOpen(item)} activeOpacity={0.85}>
        <View style={styles.icon}>
          <Ionicons name={item.type === 'video' ? 'play-circle-outline' : 'document-text-outline'} size={20} color={BRAND} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{resourceTypeLabel(item.type)}{item.category ? ` · ${item.category}` : ''}</Text>
          <Text style={styles.cardTitle}>{item.title}</Text>
          {item.description ? <Text style={styles.meta} numberOfLines={2}>{item.description}</Text> : null}
          <Text style={styles.meta}>{item.averageRating ? `${item.averageRating} / 5` : 'Unrated'}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.savePill, item.bookmarked && styles.savePillOn]} onPress={() => onBookmark(item)} accessibilityLabel={item.bookmarked ? 'Remove bookmark' : 'Save resource'}>
        <Text style={[styles.savePillText, item.bookmarked && styles.savePillTextOn]}>{item.bookmarked ? 'Saved' : 'Save'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#1C242C' },
  subtitle: { color: '#6B7380', marginTop: 4, marginBottom: 14, lineHeight: 20 },
  section: { fontSize: 18, fontWeight: '800', color: '#1C242C', marginTop: 8, marginBottom: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E7ECF1', paddingHorizontal: 12, marginBottom: 12 },
  searchInput: { flex: 1, paddingVertical: 12, color: '#1C242C' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderRadius: 16, borderWidth: 1, borderColor: '#D7E2EA', paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#FFFFFF' },
  chipOn: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { color: '#3E4A56', fontWeight: '700', fontSize: 12, textTransform: 'capitalize' },
  chipTextOn: { color: '#FFFFFF' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E7ECF1' },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E7F1F8', alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 11, fontWeight: '800', color: '#8B949E', textTransform: 'uppercase', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1C242C' },
  meta: { color: '#6B7380', marginTop: 4, fontSize: 13, lineHeight: 18 },
  body: { color: '#3E4A56', marginTop: 8, fontSize: 15, lineHeight: 22 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  backText: { color: BRAND, fontWeight: '800' },
  step: { marginTop: 8 },
  stepTitle: { fontWeight: '800', color: '#1C242C' },
  primary: { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#FFFFFF', fontWeight: '800' },
  secondary: { borderWidth: 1, borderColor: BRAND, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  secondaryText: { color: BRAND, fontWeight: '800' },
  star: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#D7E2EA', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  starOn: { backgroundColor: BRAND, borderColor: BRAND },
  starText: { color: '#3E4A56', fontWeight: '800' },
  starTextOn: { color: '#FFFFFF' },
  input: { borderWidth: 1, borderColor: '#E7ECF1', borderRadius: 12, padding: 12, minHeight: 72, color: '#1C242C', backgroundColor: '#FFFFFF', textAlignVertical: 'top' },
  review: { marginTop: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E7ECF1' },
  error: { color: '#BA1A1A', marginTop: 8 },
  hero: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E7ECF1', marginBottom: 16 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#1C242C', marginTop: 4 },
  primaryInline: { backgroundColor: BRAND, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 16 },
  savePill: { borderRadius: 22, borderWidth: 1, borderColor: '#D7E2EA', paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#FFFFFF' },
  savePillOn: { backgroundColor: '#E7F1F8', borderColor: BRAND },
  savePillText: { color: BRAND, fontWeight: '800', fontSize: 13 },
  savePillTextOn: { color: BRAND },
  reviewCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E7ECF1', marginTop: 8 },
  whyTitle: { marginTop: 16, fontWeight: '800', color: '#1C242C' },
});
