import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Goal,
  UserProgress,
  CompletionRecord,
  DailyGoalState,
  UserProfile,
} from "./types";

const KEYS = {
  GOALS: "elarin:goals",
  PROGRESS: "elarin:progress",
  ONBOARDED: "elarin:onboarded",
  PROFILE: "elarin:profile",
  DAILY_STATE: "elarin:daily_state",
  SWIPE_TUTORIAL_SHOWN: "elarin:swipe_tutorial_shown",
  ACCOUNT_ID: "elarin:account_id",
};

// ─── Goals ───

export async function getGoals(): Promise<Goal[]> {
  const raw = await AsyncStorage.getItem(KEYS.GOALS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveGoals(goals: Goal[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.GOALS, JSON.stringify(goals));
}

export async function addGoal(goal: Goal): Promise<void> {
  const list = await getGoals();
  list.push(goal);
  await saveGoals(list);
}

export async function updateGoal(goal: Goal): Promise<void> {
  const list = await getGoals();
  const idx = list.findIndex((g) => g.id === goal.id);
  if (idx >= 0) list[idx] = goal;
  await saveGoals(list);
}

export async function deleteGoal(id: string): Promise<void> {
  const list = await getGoals();
  await saveGoals(list.filter((g) => g.id !== id));
}

// ─── Progress ───

const DEFAULT_PROGRESS: UserProgress = {
  trustLevel: 1,
  selfTrustMeter: 0,
  lastActivityAt: 0,
  completions: [],
  celebratedMilestones: [],
};

export async function getProgress(): Promise<UserProgress> {
  const raw = await AsyncStorage.getItem(KEYS.PROGRESS);
  return raw ? JSON.parse(raw) : { ...DEFAULT_PROGRESS };
}

export async function saveProgress(progress: UserProgress): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROGRESS, JSON.stringify(progress));
}

export async function addCompletion(
  record: CompletionRecord,
): Promise<UserProgress> {
  const progress = await getProgress();
  progress.completions.push(record);
  progress.lastActivityAt = record.timestamp;
  await saveProgress(progress);
  return progress;
}

// ─── Onboarding ───

export async function getOnboarded(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.ONBOARDED);
  return val === "true";
}

export async function setOnboarded(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDED, value ? "true" : "false");
}

// ─── User Profile ───

export async function getProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.PROFILE);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Record<string, string>;
  // Backward compat: migrate { name } → { username }
  if (parsed.name && !parsed.username) {
    parsed.username = parsed.name;
    delete parsed.name;
    await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(parsed));
  }
  return parsed as unknown as UserProfile;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

// ─── Daily Goal State ───

function getDailyKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getDailyStates(): Promise<DailyGoalState[]> {
  const key = `${KEYS.DAILY_STATE}:${getDailyKey()}`;
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

export async function saveDailyStates(states: DailyGoalState[]): Promise<void> {
  const key = `${KEYS.DAILY_STATE}:${getDailyKey()}`;
  await AsyncStorage.setItem(key, JSON.stringify(states));
}

export async function updateDailyGoalState(
  goalId: string,
  status: DailyGoalState["status"],
  completedTier?: DailyGoalState["completedTier"],
): Promise<void> {
  const states = await getDailyStates();
  const idx = states.findIndex((s) => s.goalId === goalId);
  const newState: DailyGoalState = { goalId, status, completedTier };
  if (idx >= 0) {
    states[idx] = newState;
  } else {
    states.push(newState);
  }
  await saveDailyStates(states);
}

// ─── Swipe Tutorial ───

export async function hasShownSwipeTutorial(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.SWIPE_TUTORIAL_SHOWN);
  return val === "true";
}

export async function setSwipeTutorialShown(): Promise<void> {
  await AsyncStorage.setItem(KEYS.SWIPE_TUTORIAL_SHOWN, "true");
}

// ─── Heatmap ───

export async function ensureHeatmapStartDate(): Promise<void> {
  const existing = await AsyncStorage.getItem("elarin:heatmap_start");
  if (!existing) {
    await AsyncStorage.setItem("elarin:heatmap_start", getDailyKey());
  }
}

export async function getCompletionHistory(
  days: number,
): Promise<
  { date: string; ratio: number; completed: number; total: number }[]
> {
  const goals = await getGoals();
  const totalGoals = goals.length;
  if (totalGoals === 0) return [];

  const today = new Date();
  const keys: string[] = [];
  const dates: string[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dates.push(dateStr);
    keys.push(`${KEYS.DAILY_STATE}:${dateStr}`);
  }

  const pairs = await AsyncStorage.multiGet(keys);

  return pairs.map(([, raw], idx) => {
    const states: DailyGoalState[] = raw ? JSON.parse(raw) : [];
    const completed = states.filter(
      (s) => s.status === "done" || s.status === "stepped_down",
    ).length;
    return {
      date: dates[idx],
      ratio: totalGoals > 0 ? completed / totalGoals : 0,
      completed,
      total: totalGoals,
    };
  });
}

// ─── Account ───

export async function getAccountId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.ACCOUNT_ID);
}

export async function setAccountId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.ACCOUNT_ID, id);
}

export async function clearAccountId(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.ACCOUNT_ID);
}

/** Remove ALL elarin local data (goals, progress, profile, daily states, etc.) */
export async function clearAllLocalData(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const elarinKeys = allKeys.filter((k) => k.startsWith("elarin:"));
  if (elarinKeys.length > 0) {
    await AsyncStorage.multiRemove(elarinKeys);
  }
}
