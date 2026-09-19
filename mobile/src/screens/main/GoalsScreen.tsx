import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { SidePanel } from '../../components/SidePanel';
import { GoalsChrome } from '../../components/GoalsChrome';
import { GoalsOverview } from '../goals/GoalsOverview';
import { GoalForm } from '../goals/GoalForm';
import { AchievementsPanel } from '../goals/AchievementsPanel';
import { ReportsPanel } from '../goals/ReportsPanel';
import { AchievementItem, GoalDashboard, GoalItem, WeeklyReport, achievementApi, goalApi } from '@/services/api';
import { StepSnapshot, loadTodaySteps, watchNativeSteps } from '@/services/steps';
import type { GoalHubTab } from '@/constants/goals';

export default function GoalsScreen() {
  const [tab, setTab] = useState<GoalHubTab>('overview');
  const [panelOpen, setPanelOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [dashboard, setDashboard] = useState<GoalDashboard | null>(null);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [todaySteps, setTodaySteps] = useState<StepSnapshot>({
    steps: 0,
    dailyTarget: 8000,
    source: 'web-manual',
    live: false,
    permission: 'undetermined',
    allowsManualEntry: true,
  });
  const [editing, setEditing] = useState<GoalItem | null>(null);

  const loadAll = useCallback(async () => {
    try {
      setError(null);
      const [goalRes, dashRes, achieveRes, weeklyRes, steps] = await Promise.all([
        goalApi.list(),
        goalApi.dashboard(),
        achievementApi.list(),
        goalApi.weekly(),
        loadTodaySteps().catch(() => ({
          steps: 0,
          dailyTarget: 8000,
          source: 'stored-fallback' as const,
          live: false,
          permission: 'undetermined',
          allowsManualEntry: true,
        })),
      ]);
      setGoals(goalRes.data || []);
      setDashboard(dashRes.data);
      setAchievements(achieveRes.data.catalog || []);
      setReport(weeklyRes.data);
      setTodaySteps({
        ...steps,
        steps: steps.steps || dashRes.data.todaySteps.steps || 0,
        dailyTarget: steps.dailyTarget || dashRes.data.todaySteps.dailyTarget || 8000,
      });
    } catch (loadError: any) {
      setError(loadError.message || 'Unable to load goals.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
      const stop = watchNativeSteps((snapshot) => {
        setTodaySteps(snapshot);
        if (snapshot.steps >= (snapshot.dailyTarget || 8000)) {
          loadAll();
        }
      });
      return stop;
    }, [loadAll])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const openCreate = () => {
    setEditing(null);
    setTab('form');
  };

  const openEdit = (goal: GoalItem) => {
    setEditing(goal);
    setTab('form');
  };

  const onFormSaved = async () => {
    setEditing(null);
    setTab('overview');
    await loadAll();
  };

  const onTabChange = (next: GoalHubTab) => {
    if (next === 'form' && tab !== 'form') setEditing(null);
    setTab(next);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <GoalsChrome activeTab={tab} onTabChange={onTabChange} onAvatarPress={() => setPanelOpen(true)} />
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {tab === 'overview' ? (
          <GoalsOverview
            goals={goals}
            dashboard={dashboard}
            todaySteps={todaySteps}
            error={error}
            onCreate={openCreate}
            onEdit={openEdit}
            onChanged={loadAll}
            onStepsChanged={setTodaySteps}
          />
        ) : null}
        {tab === 'form' ? (
          <GoalForm editing={editing} onCancel={() => { setEditing(null); setTab('overview'); }} onSaved={onFormSaved} />
        ) : null}
        {tab === 'achievements' ? <AchievementsPanel catalog={achievements} /> : null}
        {tab === 'reports' ? <ReportsPanel report={report} goals={goals} todaySteps={todaySteps} /> : null}
      </ScrollView>
      <SidePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F7FB' },
  body: { flex: 1, backgroundColor: '#F4F7FB' },
  content: { flexGrow: 1 },
});
