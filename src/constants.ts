import { GoalCategory, LevelInfo } from "./types";

// ─── Colors ───
export const colors = {
  bg: "#0D0D0D",
  surface: "#1A1A2E",
  surfaceLight: "#252540",
  accent: "#7C5CFC",
  accentLight: "#A78BFA",
  success: "#34D399",
  text: "#F0F0F0",
  textMuted: "#8888AA",
  neutral: "#3A3A4A", // missed days — gray, never red
  momentumGlow: "#7C5CFC",
  white: "#FFFFFF",
  black: "#000000",
};

// ─── XP Values ───
export const XP = {
  SNOOZE: 5,
  STEP_BASE: 10, // XP per step completion, scaled by position
  FULL_ACTION: 25,
  NOTIFICATION_OPEN: 3,
} as const;

/** XP multiplier based on ladder position: top of ladder = highest multiplier */
export function xpForStep(stepIndex: number, totalSteps: number): number {
  if (totalSteps <= 1) return XP.FULL_ACTION;
  if (stepIndex === 0) return XP.FULL_ACTION;
  // linear interpolation: easiest step gets STEP_BASE, hardest gets FULL_ACTION
  const ratio = 1 - stepIndex / (totalSteps - 1);
  return Math.round(XP.STEP_BASE + ratio * (XP.FULL_ACTION - XP.STEP_BASE));
}

// ─── Momentum ───
export const MOMENTUM = {
  GAIN_PER_ACTION: 15,
  DECAY_RATE_PER_HOUR: 0.5, // loses 0.5 points per hour of inactivity
  MAX: 100,
  MIN: 0,
} as const;

// ─── Levels ───
export const LEVELS: LevelInfo[] = [
  { level: 1, name: "Spark", minXp: 0 },
  { level: 2, name: "Kindling", minXp: 50 },
  { level: 3, name: "Flame", minXp: 150 },
  { level: 4, name: "Ember", minXp: 350 },
  { level: 5, name: "Blaze", minXp: 700 },
  { level: 6, name: "Torch", minXp: 1200 },
  { level: 7, name: "Beacon", minXp: 2000 },
  { level: 8, name: "Inferno", minXp: 3500 },
  { level: 9, name: "Radiance", minXp: 5500 },
  { level: 10, name: "Supernova", minXp: 8000 },
];

export function getLevelForXp(xp: number): LevelInfo {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getXpToNextLevel(
  xp: number,
): { current: number; needed: number } | null {
  const level = getLevelForXp(xp);
  const nextIdx = LEVELS.findIndex((l) => l.level === level.level + 1);
  if (nextIdx === -1) return null; // max level
  return {
    current: xp - level.minXp,
    needed: LEVELS[nextIdx].minXp - level.minXp,
  };
}

// ─── Categories ───
export const CATEGORY_LABELS: Record<GoalCategory, string> = {
  fitness: "💪 Fitness",
  mindfulness: "🧘 Mindfulness",
  creativity: "🎨 Creativity",
  learning: "📚 Learning",
  health: "❤️ Health",
  custom: "⭐ Custom",
};

export const CATEGORY_LIST: GoalCategory[] = [
  "fitness",
  "mindfulness",
  "creativity",
  "learning",
  "health",
  "custom",
];

// ─── Default Ladders ───
export const EXAMPLE_LADDERS: Record<string, string[]> = {
  Pushups: ["10 pushups", "5 pushups", "1 pushup", "Stand up from your chair"],
  Meditation: [
    "10 min meditation",
    "5 min meditation",
    "1 min deep breathing",
    "Take 3 deep breaths",
  ],
  Writing: [
    "Write 500 words",
    "Write 200 words",
    "Write 1 sentence",
    "Open your notebook",
  ],
  Reading: ["Read 20 pages", "Read 5 pages", "Read 1 page", "Open the book"],
};

// ─── Notifications ───
export const NOTIFICATION_CHANNEL_ID = "elarin-steps";
export const SNOOZE_DURATION_MINUTES = 15;
