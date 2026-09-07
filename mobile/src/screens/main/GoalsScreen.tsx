import React, { useCallback, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getInitials } from '../../components/MoodHubChrome';
import { SidePanel } from '../../components/SidePanel';
import { useAuth } from '@/store/AuthContext';
import { Fonts } from '@/constants/theme';
import { apiFetch } from '@/services/api';

const BRAND = '#3A7CA5';

type GoalItem = {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  progress?: number;
  status?: string;
  deadline?: string;
};

export default function GoalsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [panelOpen, setPanelOpen] = useState(false);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    try {
      setError(null);
      const response = await apiFetch<{ success: boolean; data: GoalItem[] }>('/api/goals');
      setGoals(response.data || []);
    } catch (loadError: any) {
      setError(loadError.message || 'Unable to load goals.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals])
  );

  const createGoal = async () => {
    if (!title.trim() || !deadline) {
      setError('Add a title and a future deadline (YYYY-MM-DD).');
      return;
    }
    try {
      await apiFetch('/api/goals', { method: 'POST', body: { title: title.trim(), deadline, category: 'mental-health' } });
      setTitle('');
      setDeadline('');
      setShowForm(false);
      await loadGoals();
    } catch (saveError: any) {
      setError(saveError.message || 'Unable to create goal.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setPanelOpen(true)} style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
        </TouchableOpacity>
        <Text style={styles.brand}>CareCircle</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadGoals(); setRefreshing(false); }} />}
      >
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.title}>Goals</Text>
            <Text style={styles.subtitle}>Small targets that keep your week grounded.</Text>
          </View>
          <TouchableOpacity onPress={() => setShowForm(true)}>
            <Text style={styles.link}>+ NEW GOAL</Text>
          </TouchableOpacity>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {goals.map((goal) => (
          <View key={goal._id} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Text style={styles.percent}>{goal.progress || 0}%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(100, goal.progress || 0)}%` }]} />
            </View>
            <Text style={styles.meta}>
              {(goal.category || 'personal').replace('-', ' ')} · {goal.status || 'active'}
            </Text>
          </View>
        ))}
        {goals.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.empty}>No goals yet. Add one to start tracking progress.</Text>
          </View>
        ) : null}
        <TouchableOpacity style={styles.moodLink} onPress={() => navigation.navigate('Mood', { hubTab: 'journal' })}>
          <Ionicons name="leaf-outline" size={18} color={BRAND} />
          <Text style={styles.link}>Open wellbeing activities</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <Text style={styles.goalTitle}>New goal</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Goal title" style={styles.input} />
            <TextInput value={deadline} onChangeText={setDeadline} placeholder="Deadline YYYY-MM-DD" style={styles.input} />
            <TouchableOpacity onPress={createGoal} style={styles.primary}>
              <Text style={styles.primaryText}>Save goal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowForm(false)} style={{ alignItems: 'center', padding: 12 }}>
              <Text style={styles.meta}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <SidePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F7FB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#D7E6F2', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: BRAND, fontWeight: '800' },
  brand: { color: BRAND, fontSize: 26, fontWeight: '700', fontFamily: Fonts.serif || 'System' },
  content: { padding: 16, paddingBottom: 40 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#1C242C' },
  subtitle: { color: '#6B7380', marginTop: 4 },
  link: { color: BRAND, fontWeight: '800', fontSize: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E7ECF1' },
  goalTitle: { fontSize: 16, fontWeight: '800', color: '#1C242C', flex: 1, marginRight: 8 },
  percent: { fontWeight: '800', color: '#1C242C' },
  track: { height: 8, backgroundColor: '#E6E9ED', borderRadius: 8, overflow: 'hidden', marginVertical: 10 },
  fill: { height: 8, backgroundColor: BRAND },
  meta: { color: '#7A828C', fontSize: 12, textTransform: 'capitalize' },
  empty: { textAlign: 'center', color: '#7A828C' },
  error: { color: '#BA1A1A', marginBottom: 8 },
  moodLink: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', padding: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#FFFFFF', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  input: { backgroundColor: '#F3F5F7', borderRadius: 10, padding: 12, marginTop: 10 },
  primary: { backgroundColor: BRAND, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#FFFFFF', fontWeight: '800' },
});
