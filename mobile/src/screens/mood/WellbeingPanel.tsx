import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  wellbeingApi,
  wellnessActivityApi,
  type MotivationalMessage,
  type RecommendedActivity,
  type WellbeingRecommendation,
  type WellbeingTone,
  type DailyWellbeingTip,
} from '@/services/api';
import { BRAND, todayStamp } from '@/constants/moods';
import { panelStyles as s } from './panelStyles';

const TONE_LABEL: Record<WellbeingTone, string> = {
  starting: 'Just getting started',
  low: 'A harder stretch',
  declining: 'Trending down',
  steady: 'Holding steady',
  improving: 'Trending up',
  positive: 'A stronger stretch',
};

const PRIORITY_COLOR: Record<WellbeingRecommendation['priority'], string> = {
  high: '#C4453C',
  medium: BRAND,
  low: '#6B8F71',
};

/** US-34 to US-37 - recommendations, daily tip, motivation, and suggested activities. */
export function WellbeingPanel({ onActivityAdded }: { onActivityAdded?: () => void }) {
  const [tip, setTip] = useState<DailyWellbeingTip | null>(null);
  const [message, setMessage] = useState<MotivationalMessage | null>(null);
  const [tone, setTone] = useState<WellbeingTone>('starting');
  const [context, setContext] = useState('');
  const [recommendations, setRecommendations] = useState<WellbeingRecommendation[]>([]);
  const [activities, setActivities] = useState<RecommendedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [savedKeys, setSavedKeys] = useState<string[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const [tipResult, motivation, recommendationResult, activityResult] = await Promise.all([
          wellbeingApi.tip(),
          wellbeingApi.motivation(),
          wellbeingApi.recommendations(),
          wellbeingApi.activities(),
        ]);
        if (!active) return;
        setTip(tipResult.tip);
        setMessage(motivation.message);
        setTone(motivation.tone);
        setContext(recommendationResult.context || motivation.context);
        setRecommendations(recommendationResult.items);
        setActivities(activityResult.items);
        setError(null);
      } catch (loadError: any) {
        if (active) setError(loadError.message || 'Unable to load your wellbeing suggestions.');
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [reloadToken]);

  const addActivity = async (activity: RecommendedActivity) => {
    try {
      setSavingKey(activity.key);
      await wellnessActivityApi.create({
        title: activity.title,
        category: activity.category === 'From your history' ? 'Wellbeing' : activity.category,
        date: todayStamp(),
        duration: activity.durationMinutes || 10,
        notes: activity.description,
        targetPerWeek: 3,
      });
      setSavedKeys((current) => [...current, activity.key]);
      onActivityAdded?.();
    } catch (saveError: any) {
      setError(saveError.message || 'Unable to add that activity.');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <ActivityIndicator style={styles.loader} color={BRAND} />;

  return (
    <View style={s.section}>
      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.flex1}>
            <Text style={s.cardTitle}>Today for you</Text>
            <Text style={s.cardSubtitle}>{TONE_LABEL[tone]}</Text>
          </View>
          <TouchableOpacity onPress={() => { setLoading(true); setReloadToken((value) => value + 1); }} hitSlop={8} accessibilityLabel="Refresh suggestions">
            <Ionicons name="refresh" size={19} color={BRAND} />
          </TouchableOpacity>
        </View>
        {context ? <Text style={styles.context}>{context}</Text> : null}

        {message ? (
          <View style={styles.highlight}>
            <Text style={styles.kicker}>Motivational message</Text>
            <Text style={s.listTitle}>{message.title}</Text>
            <Text style={styles.body}>{message.body}</Text>
          </View>
        ) : null}

        {tip ? (
          <View style={styles.highlight}>
            <Text style={styles.kicker}>Daily tip · {tip.category}</Text>
            <Text style={s.listTitle}>{tip.title}</Text>
            <Text style={styles.body}>{tip.body}</Text>
          </View>
        ) : null}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Personalized recommendations</Text>
        <Text style={s.cardSubtitle}>Based on your recent mood history</Text>
        {recommendations.map((item) => (
          <View key={item.id} style={styles.item}>
            <View style={s.rowBetween}>
              <Text style={[s.listTitle, s.flex1]}>{item.title}</Text>
              <Text style={[styles.priority, { color: PRIORITY_COLOR[item.priority] }]}>{item.priority}</Text>
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={s.listMeta}>{item.reason}</Text>
          </View>
        ))}
        {recommendations.length === 0 ? <Text style={s.empty}>Log a few moods to unlock personal suggestions.</Text> : null}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Recommended activities</Text>
        <Text style={s.cardSubtitle}>Choose something that fits how you have been feeling</Text>
        {activities.map((activity) => (
          <View key={activity.key} style={styles.item}>
            <View style={s.rowBetween}>
              <Text style={[s.listTitle, s.flex1]}>{activity.title}</Text>
              <Text style={s.listMeta}>{activity.durationMinutes ? `${activity.durationMinutes} min` : activity.category}</Text>
            </View>
            <Text style={styles.category}>{activity.category}</Text>
            <Text style={styles.body}>{activity.description}</Text>
            <Text style={s.listMeta}>{activity.reason}</Text>
            {savedKeys.includes(activity.key) || (activity.alreadyPracticing && activity.source === 'catalog') ? (
              <Text style={styles.practicing}>{savedKeys.includes(activity.key) ? 'Added to your routine' : 'Already part of your routine'}</Text>
            ) : (
              <TouchableOpacity
                onPress={() => addActivity(activity)}
                disabled={savingKey === activity.key}
                style={styles.addButton}
                accessibilityLabel={`Add ${activity.title}`}
              >
                <Text style={styles.addButtonText}>{savingKey === activity.key ? 'Adding...' : 'Add to my routine'}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {activities.length === 0 ? <Text style={s.empty}>Activity suggestions will appear here.</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  context: { color: '#5E6770', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  highlight: {
    backgroundColor: '#F4F8FB',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    color: BRAND,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  body: { color: '#5E6770', fontSize: 13, lineHeight: 18, marginTop: 4 },
  item: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EDF1F5',
    marginTop: 10,
  },
  priority: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  category: { color: BRAND, fontSize: 11, fontWeight: '800', marginTop: 4, textTransform: 'uppercase' },
  practicing: { color: '#6B8F71', fontSize: 11, fontWeight: '700', marginTop: 6 },
  addButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: BRAND,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
