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
  return raw ? JSON.parse(raw) : null;
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
