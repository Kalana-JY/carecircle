<<<<<<< HEAD
import React, { useCallback, useMemo, useState, useContext } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { MainStackParamList } from '../../navigation/MainNavigator';
import { goalApi, type GoalRecord } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

const GIRL_IMAGE = require('../../../assets/images/girl.png');
const LOGO_IMAGE = require('../../../assets/images/cc_logo.png');

type GoalFilter = 'all' | 'active' | 'completed' | 'paused';

export default function GoalsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const { user } = useAuth();

  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<GoalFilter>('all');
  const [loading, setLoading] = useState(false);

  // --------------------------------------------------
  // GET GOALS
  // --------------------------------------------------

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);

      const response = await goalApi.list();

      setGoals(response.data || []);
    } catch (error) {
      console.error('[GoalsScreen] Failed to load goals', error);
      setGoals([]);
    } finally {
      setLoading(false);
=======
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
>>>>>>> origin/main
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
<<<<<<< HEAD
      fetchGoals();
    }, [fetchGoals])
  );

  // --------------------------------------------------
  // FILTER
  // --------------------------------------------------

  const filteredGoals = useMemo(() => {
    if (activeFilter === 'all') {
      return goals;
    }

    return goals.filter((goal) => {
      const status = goal.status || 'active';

      if (activeFilter === 'active') {
        return (
          status === 'active' ||
          status === 'in_progress' ||
          status === 'overdue'
        );
      }

      return status === activeFilter;
    });
  }, [activeFilter, goals]);

  // --------------------------------------------------
  // ACTIVE GOALS COUNT
  // --------------------------------------------------

  const activeGoalsCount = goals.filter((goal) => {
    const status = goal.status || 'active';

    return status !== 'completed' && status !== 'paused';
  }).length;

  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------

  const handleDeleteGoal = async (goalId: string) => {
    const confirm =
      Platform.OS === 'web'
        ? window.confirm('Are you sure you want to delete this goal?')
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Delete goal',
              'Are you sure you want to delete this goal?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => resolve(false),
                },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => resolve(true),
                },
              ]
            );
          });

    if (!confirm) return;

    try {
      await goalApi.remove(goalId);

      setGoals((current) =>
        current.filter((goal) => goal._id !== goalId)
      );
    } catch (error) {
      console.error('[GoalsScreen] Delete failed', error);

      Alert.alert(
        'Error',
        'Could not delete this goal right now.'
      );
    }
  };

  // --------------------------------------------------
  // MARK TODAY DONE
  // --------------------------------------------------

  const handleMarkTodayDone = async (goal: GoalRecord) => {
    try {
      const response = await goalApi.markTodayDone(goal._id);

      const updatedGoal = response.data;

      setGoals((current) =>
        current.map((item) =>
          item._id === goal._id ? updatedGoal : item
        )
      );
    } catch (error) {
      console.error('[GoalsScreen] Mark done failed', error);

      Alert.alert(
        'Error',
        'This goal could not be marked complete today.'
      );
    }
  };

  // --------------------------------------------------
  // EDIT / REMINDER
  // --------------------------------------------------

  const handleEditGoal = (goal: GoalRecord) => {
    navigation.navigate('AddGoal', {
      goal,
      mode: 'edit',
    });
  };

  const handleReminder = (goal: GoalRecord) => {
    navigation.navigate('AddGoal', {
      goal,
      mode: 'edit',
    });
  };

  // --------------------------------------------------
  // ICON
  // --------------------------------------------------

  const getGoalIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('meditat')) {
      return 'flower-outline';
    }

    if (
      lowerTitle.includes('walk') ||
      lowerTitle.includes('step')
    ) {
      return 'walk-outline';
    }

    if (lowerTitle.includes('sleep')) {
      return 'moon-outline';
    }

    return 'fitness-outline';
  };

  // --------------------------------------------------
  // GOAL CARD
  // --------------------------------------------------

  const renderGoalCard = (goal: GoalRecord) => {
    const completionCount =
      goal.completionDates?.length || 0;

    const progress =
      typeof goal.progress === 'number'
        ? Math.max(0, Math.min(goal.progress, 100))
        : 0;

    const status = goal.status || 'active';

    const isCompletedToday =
      Boolean(
        goal.completionDates?.some((date) => {
          const completionDate = new Date(date);
          const today = new Date();

          return (
            completionDate.toDateString() ===
            today.toDateString()
          );
        })
      );

    const icon = getGoalIcon(goal.title);

    const isCompleted =
      status === 'completed' || isCompletedToday;

    return (
      <View key={goal._id} style={styles.goalCard}>

        {/* TOP ROW */}
        <View style={styles.goalTopRow}>

          <View style={styles.goalIcon}>
            <Ionicons
              name={icon as any}
              size={20}
              color="#4B79B8"
            />
          </View>

          <View style={styles.goalInfo}>
            <Text
              style={styles.goalTitle}
              numberOfLines={1}
            >
              {goal.title}
            </Text>

            <Text style={styles.goalSubtitle}>
              {goal.target || 'Daily goal'}
            </Text>
          </View>

          {isCompleted && (
            <View style={styles.completedCircle}>
              <Ionicons
                name="checkmark"
                size={16}
                color="#FFFFFF"
              />
            </View>
          )}
        </View>

        {/* PROGRESS TEXT */}
        <Text style={styles.progressText}>
          {completionCount}/7 days completed
        </Text>

        {/* PROGRESS BAR */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
              },
            ]}
          />
        </View>

        {/* ACTIONS */}
        {isCompleted ? (
          <View style={styles.bottomRow}>

            <Text style={styles.completedText}>
              Completed today
            </Text>

          </View>
        ) : (
          <View style={styles.bottomRow}>

            <TouchableOpacity
              style={styles.markDoneButton}
              onPress={() =>
                handleMarkTodayDone(goal)
              }
              activeOpacity={0.8}
            >
              <Text style={styles.markDoneText}>
                Mark today done
              </Text>
            </TouchableOpacity>

          </View>
        )}
      </View>
    );
  };

  // --------------------------------------------------
  // HEADER TAB
  // --------------------------------------------------

  const renderHeaderTab = (
    title: string,
    route:
      | 'Goals'
      | 'AddGoal'
      | 'Achievements'
      | 'Reports'
  ) => {
    const selected = title === 'My Goals';

    return (
      <Pressable
        key={title}
        onPress={() => navigation.navigate(route as any)}
        style={[
          styles.headerTab,
          selected && styles.headerTabSelected,
        ]}
      >
        <Text
          style={[
            styles.headerTabText,
            selected && styles.headerTabTextSelected,
          ]}
        >
          {title}
        </Text>
      </Pressable>
    );
  };

  // --------------------------------------------------
  // SCREEN
  // --------------------------------------------------

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>

        {/* ============================================
            HEADER
        ============================================ */}

        <View style={styles.hero}>

          {/* Scenic background */}
          <View style={styles.heroBackground} />

          {/* Girl image */}
          <Image
            source={GIRL_IMAGE}
            style={styles.girlImage}
            resizeMode="cover"
          />

          {/* TOP BAR */}
          <View style={styles.topBar}>

            <View style={styles.logoContainer}>
              <Image
                source={LOGO_IMAGE}
                style={styles.logoImage}
              />

              <Text style={styles.logoText}>
                CareCircle
              </Text>
            </View>

            <TouchableOpacity
              style={styles.profileButton}
              onPress={() =>
                navigation.navigate('Profile')
              }
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
            {renderHeaderTab(
              'My Goals',
              'Goals'
            )}

            {renderHeaderTab(
              'Add Goal',
              'AddGoal'
            )}

            {renderHeaderTab(
              'Achievements',
              'Achievements'
            )}

            {renderHeaderTab(
              'Reports',
              'Reports'
            )}
          </View>
        </View>

        {/* ============================================
            CONTENT
        ============================================ */}

        <View style={styles.contentWrapper}>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={
              styles.scrollContent
            }
            showsVerticalScrollIndicator={false}
          >

            {/* TITLE */}
            <View style={styles.titleRow}>

              <Text style={styles.pageTitle}>
                Your goals
              </Text>

              <TouchableOpacity
                style={styles.createButton}
                onPress={() =>
                  navigation.navigate('AddGoal')
                }
                activeOpacity={0.8}
              >
                <Text style={styles.createButtonText}>
                  + Create Goal
                </Text>
              </TouchableOpacity>

            </View>

            {/* FILTERS */}
            <View style={styles.filterRow}>

              {(
                [
                  'all',
                  'active',
                  'completed',
                  'paused',
                ] as GoalFilter[]
              ).map((filter) => {

                const label =
                  filter === 'all'
                    ? 'All'
                    : filter
                        .charAt(0)
                        .toUpperCase() +
                      filter.slice(1);

                const selected =
                  activeFilter === filter;

                return (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterChip,
                      selected &&
                        styles.filterChipSelected,
                    ]}
                    onPress={() =>
                      setActiveFilter(filter)
                    }
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        selected &&
                          styles.filterTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

            </View>

            {/* STATS */}
            <View style={styles.statsRow}>

              {/* ACTIVE GOALS */}
              <View style={styles.statCard}>

                <View style={styles.statIconBlue}>
                  <Ionicons
                    name="radio-button-on"
                    size={22}
                    color="#3979C9"
                  />
                </View>

                <Text style={styles.statNumber}>
                  {activeGoalsCount}
                </Text>

                <Text style={styles.statLabel}>
                  Active goals
                </Text>

              </View>

              {/* STREAK */}
              <View style={styles.statCard}>

                <View style={styles.statIconRed}>
                  <Ionicons
                    name="flame"
                    size={22}
                    color="#E65B60"
                  />
                </View>

                <Text style={styles.statNumber}>
                  12
                </Text>

                <Text style={styles.statLabel}>
                  Day streak
                </Text>

              </View>

            </View>

            {/* SECTION TITLE */}
            <Text style={styles.sectionTitle}>
              IN PROGRESS
            </Text>

            {/* GOALS */}
            {loading ? (
              <Text style={styles.emptyText}>
                Loading goals...
              </Text>
            ) : filteredGoals.length === 0 ? (
              <Text style={styles.emptyText}>
                No goals match this filter yet.
              </Text>
            ) : (
              filteredGoals.map(renderGoalCard)
            )}

          </ScrollView>

        </View>
      </View>
=======
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
>>>>>>> origin/main
    </SafeAreaView>
  );
}

<<<<<<< HEAD
// ======================================================
// STYLES
// ======================================================

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

  heroBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },

  girlImage: {
    position: 'absolute',

    /*
     * IMPORTANT:
     * Keep the image integrated into the header.
     * Do NOT display it as a small card.
     * Fill entire hero area.
     */
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

  profileImage: {
    width: '100%',
    height: '100%',
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

  // --------------------------------------------------
  // TITLE
  // --------------------------------------------------

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    marginBottom: 15,
  },

  pageTitle: {
    fontSize: 27,
    fontWeight: '600',
    color: '#13283F',

    letterSpacing: -0.3,
  },

  createButton: {
    backgroundColor: '#1765C0',

    borderRadius: 13,

    paddingHorizontal: 15,
    paddingVertical: 10,
  },

  createButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // --------------------------------------------------
  // FILTERS
  // --------------------------------------------------

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',

    marginBottom: 17,
  },

  filterChip: {
    backgroundColor: '#E8EDF4',

    borderRadius: 18,

    paddingHorizontal: 15,
    paddingVertical: 8,

    marginRight: 8,
    marginBottom: 7,
  },

  filterChipSelected: {
    backgroundColor: '#2D72C8',
  },

  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#263B52',
  },

  filterTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // --------------------------------------------------
  // STATS
  // --------------------------------------------------

  statsRow: {
    flexDirection: 'row',

    marginBottom: 24,
  },

  statCard: {
    flex: 1,

    height: 126,

    backgroundColor: '#F0F5FA',

    borderRadius: 15,

    borderWidth: 1,
    borderColor: '#DFE7EF',

    justifyContent: 'center',
    alignItems: 'center',

    marginHorizontal: 4,
  },

  statIconBlue: {
    width: 43,
    height: 43,

    borderRadius: 22,

    backgroundColor: '#DCEAFF',

    justifyContent: 'center',
    alignItems: 'center',

    marginBottom: 6,
  },

  statIconRed: {
    width: 43,
    height: 43,

    borderRadius: 22,

    backgroundColor: '#FDE8E9',

    justifyContent: 'center',
    alignItems: 'center',

    marginBottom: 6,
  },

  statNumber: {
    fontSize: 24,
    fontWeight: '600',
    color: '#152A42',

    lineHeight: 28,
  },

  statLabel: {
    fontSize: 11,
    color: '#596A7C',

    marginTop: 1,
  },

  // --------------------------------------------------
  // SECTION
  // --------------------------------------------------

  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',

    letterSpacing: 1.1,

    color: '#687482',

    marginBottom: 10,
  },

  // --------------------------------------------------
  // GOAL CARD
  // --------------------------------------------------

  goalCard: {
    backgroundColor: '#FFFFFF',

    borderRadius: 14,

    borderWidth: 1,
    borderColor: '#DCE4EC',

    padding: 13,

    marginBottom: 11,
  },

  goalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  goalIcon: {
    width: 42,
    height: 42,

    borderRadius: 21,

    backgroundColor: '#E6F0FA',

    justifyContent: 'center',
    alignItems: 'center',

    marginRight: 10,
  },

  goalInfo: {
    flex: 1,
  },

  goalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#142A42',
  },

  goalSubtitle: {
    fontSize: 12,
    color: '#657384',

    marginTop: 2,
  },

  completedCircle: {
    width: 29,
    height: 29,

    borderRadius: 15,

    backgroundColor: '#286FC6',

    justifyContent: 'center',
    alignItems: 'center',
  },

  // --------------------------------------------------
  // PROGRESS
  // --------------------------------------------------

  progressText: {
    fontSize: 12,
    fontWeight: '500',

    color: '#455A70',

    marginTop: 10,
    marginBottom: 5,
  },

  progressTrack: {
    height: 6,

    borderRadius: 10,

    backgroundColor: '#DCE6F0',

    overflow: 'hidden',

    marginBottom: 9,
  },

  progressFill: {
    height: '100%',

    backgroundColor: '#4388D4',

    borderRadius: 10,
  },

  // --------------------------------------------------
  // ACTIONS
  // --------------------------------------------------

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  markDoneButton: {
    backgroundColor: '#286FC6',

    borderRadius: 15,

    paddingHorizontal: 13,
    paddingVertical: 7,
  },

  markDoneText: {
    color: '#FFFFFF',

    fontSize: 11,
    fontWeight: '600',
  },

  completedText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#50677D',
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  actionText: {
    fontSize: 11,
    fontWeight: '500',

    color: '#2871C8',

    marginLeft: 12,
  },

  deleteText: {
    color: '#E04F53',
  },

  emptyText: {
    textAlign: 'center',

    fontSize: 13,
    color: '#657486',

    paddingVertical: 25,
  },
});
=======
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
>>>>>>> origin/main
