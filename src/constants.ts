import { TrustLevelInfo, Goal } from "./types";

// ─── Trust Levels ───
export const TRUST_LEVELS: TrustLevelInfo[] = [
  { level: 1, name: "Starting Out" },
  { level: 2, name: "Showing Up" },
  { level: 3, name: "Building Ground" },
  { level: 4, name: "Steady" },
  { level: 5, name: "Consistent" },
  { level: 6, name: "Reliable" },
  { level: 7, name: "Committed" },
  { level: 8, name: "Resilient" },
  { level: 9, name: "Unshakable" },
  { level: 10, name: "Self-Made" },
];

// ─── Milestones ───
export const MILESTONES = [5, 10, 20, 30, 50, 100] as const;

export const MILESTONE_MESSAGES: Record<number, string> = {
  5: "5 days. 5 promises kept.",
  10: "10 days straight.",
  20: "20 days. This is who you are now.",
  30: "30 days. A month of following through.",
  50: "50 days. Unstoppable.",
  100: "100 days. Self-made.",
};

// ─── Microcopy ───
export const MICROCOPY = {
  DO_IT: "Promise kept.",
  STEP_DOWN: "Stepped down. Still in.",
  SNOOZE: "Coming back soon.",
  FIRST_DAY: "Day 1. You said you would. And you did.",
} as const;

// ─── Pre-Built Goals ───
export const PRE_BUILT_GOALS: Omit<Goal, "id" | "createdAt">[] = [
  {
    name: "Daily Walk",
    emoji: "",
    tiers: {
      primary: "15 min walk outside",
      easier: "1 min walk outside",
      easiest: "1 min walk in your room",
    },
    reminder: {
      type: "exact",
      startTime: "17:00",
      remindersPerDay: 1,
      activeDays: [],
      frequency: "daily",
    },
  },
  {
    name: "Air Squats",
    emoji: "",
    tiers: {
      primary: "20 air squats",
      easier: "10 air squats",
      easiest: "5 air squats",
    },
    reminder: {
      type: "exact",
      startTime: "08:00",
      remindersPerDay: 1,
      activeDays: [],
      frequency: "daily",
    },
  },
  {
    name: "Read a Book",
    emoji: "",
    tiers: {
      primary: "Read for 30 minutes",
      easier: "Read for 10 minutes",
      easiest: "Read 1 page",
    },
    reminder: {
      type: "exact",
      startTime: "21:00",
      remindersPerDay: 1,
      activeDays: [],
      frequency: "daily",
    },
  },
];

// ─── Notifications ───
export const NOTIFICATION_CHANNEL_ID = "elarin-steps";
export const SNOOZE_DURATION_MINUTES = 15;
