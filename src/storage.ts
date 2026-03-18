import AsyncStorage from "@react-native-async-storage/async-storage";
import { Template, UserProgress, CompletionRecord } from "./types";

const KEYS = {
  TEMPLATES: "elarin:templates",
  PROGRESS: "elarin:progress",
  ONBOARDED: "elarin:onboarded",
};

// ─── Templates ───

export async function getTemplates(): Promise<Template[]> {
  const raw = await AsyncStorage.getItem(KEYS.TEMPLATES);
  return raw ? JSON.parse(raw) : [];
}

export async function saveTemplates(templates: Template[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.TEMPLATES, JSON.stringify(templates));
}

export async function addTemplate(template: Template): Promise<void> {
  const list = await getTemplates();
  list.push(template);
  await saveTemplates(list);
}

export async function updateTemplate(template: Template): Promise<void> {
  const list = await getTemplates();
  const idx = list.findIndex((t) => t.id === template.id);
  if (idx >= 0) list[idx] = template;
  await saveTemplates(list);
}

export async function deleteTemplate(id: string): Promise<void> {
  const list = await getTemplates();
  await saveTemplates(list.filter((t) => t.id !== id));
}

// ─── Progress ───

const DEFAULT_PROGRESS: UserProgress = {
  totalXp: 0,
  level: 1,
  momentum: 0,
  lastActivityAt: 0,
  completions: [],
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
  progress.totalXp += record.xpEarned;
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
