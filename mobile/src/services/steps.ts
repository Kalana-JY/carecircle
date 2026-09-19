import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { stepApi } from './api';

export const DEFAULT_STEP_GOAL = 8000;

export type StepSource = 'web-manual' | 'native-pedometer' | 'stored-fallback';

export type StepSnapshot = {
  steps: number;
  dailyTarget: number;
  source: StepSource;
  live: boolean;
  permission: string;
  allowsManualEntry: boolean;
};

export function isNativeMobile() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

const toSnapshot = (
  data: { steps?: number; dailyTarget?: number; permission?: string },
  source: StepSource,
  live = false
): StepSnapshot => ({
  steps: data.steps || 0,
  dailyTarget: data.dailyTarget || DEFAULT_STEP_GOAL,
  source,
  live,
  permission: data.permission || 'undetermined',
  allowsManualEntry: source !== 'native-pedometer',
});

async function storedToday(source: StepSource = Platform.OS === 'web' ? 'web-manual' : 'stored-fallback'): Promise<StepSnapshot> {
  const { data } = await stepApi.today();
  return toSnapshot(data, source, false);
}

export async function saveManualSteps(steps: number): Promise<StepSnapshot> {
  const amount = Math.max(0, Math.round(Number(steps) || 0));
  const synced = await stepApi.sync(amount, 'manual');
  const today = await storedToday(Platform.OS === 'web' ? 'web-manual' : 'stored-fallback');
  return { ...today, steps: synced.data.steps };
}

async function readNativeSteps(): Promise<StepSnapshot> {
  try {
    const available = await Pedometer.isAvailableAsync();
    if (!available) {
      await stepApi.setPermission('denied').catch(() => undefined);
      return { ...(await storedToday()), permission: 'unavailable' };
    }

    const current = await Pedometer.getPermissionsAsync();
    const alreadyGranted = current.granted === true || current.status === 'granted';
    const permission = alreadyGranted ? current : await Pedometer.requestPermissionsAsync();
    const granted = permission.granted === true || permission.status === 'granted';
    await stepApi.setPermission(granted ? 'granted' : 'denied').catch(() => undefined);
    if (!granted) return storedToday();

    let steps: number | null = null;
    if (typeof Pedometer.getStepCountAsync === 'function') {
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const result = await Pedometer.getStepCountAsync(start, new Date());
        if (typeof result?.steps === 'number') steps = result.steps;
      } catch {
        steps = null;
      }
    }

    if (steps == null) {
      const stored = await storedToday();
      return { ...stored, source: 'native-pedometer', live: true, allowsManualEntry: false, permission: 'granted' };
    }

    await stepApi.sync(steps, 'sensor');
    const after = await storedToday();
    return { ...after, steps, source: 'native-pedometer', live: true, allowsManualEntry: false, permission: 'granted' };
  } catch {
    return storedToday();
  }
}

export async function loadTodaySteps(): Promise<StepSnapshot> {
  if (Platform.OS === 'web') return storedToday('web-manual');
  if (!isNativeMobile()) return storedToday();
  return readNativeSteps();
}

export const syncDeviceSteps = loadTodaySteps;

export function watchNativeSteps(onChange: (snapshot: StepSnapshot) => void): () => void {
  if (Platform.OS === 'web' || !isNativeMobile()) return () => {};

  let cancelled = false;
  let subscription: { remove: () => void } | null = null;
  let syncTimer: ReturnType<typeof setTimeout> | null = null;

  const start = async () => {
    const initial = await readNativeSteps();
    if (cancelled) return;
    onChange(initial);
    if (initial.source !== 'native-pedometer') return;

    const baseline = initial.steps;
    subscription = Pedometer.watchStepCount((result) => {
      if (cancelled) return;
      const nextSteps = baseline + (result?.steps || 0);
      const next = { ...initial, steps: nextSteps, live: true };
      onChange(next);
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        stepApi.sync(nextSteps, 'sensor').catch(() => undefined);
      }, 4000);
    });
  };

  start().catch(() => undefined);

  return () => {
    cancelled = true;
    subscription?.remove();
    if (syncTimer) clearTimeout(syncTimer);
  };
}
