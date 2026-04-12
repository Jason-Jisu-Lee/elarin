// ─── Core Data Types ───

/** A goal with 3 tiers: primary + easier + easiest */
export interface Goal {
  id: string;
  name: string;
  emoji: string;
  tiers: {
    primary: string; // "15 min walk outside"
    easier: string; // "1 min walk outside"
    easiest: string; // "1 min walk in your room"
  };
  reminder: ReminderConfig;
  createdAt: number;
}

export interface ReminderConfig {
  /** Either a window {start, end} or exact time — both in "HH:mm" */
  type: "window" | "exact";
  /** Start of window or exact time, "HH:mm" */
  startTime: string;
  /** End of window (only used if type === "window"), "HH:mm" */
  endTime?: string;
  /** How many reminders per day (default 2) */
  remindersPerDay: number;
  /** Days of week (0=Sun, 6=Sat). Empty = every day. */
  activeDays: number[];
  /** Whether notifications are enabled for this goal */
  notificationsEnabled: boolean;
  /** Goal frequency */
  frequency:
    | "daily"
    | "every_other_day"
    | "every_3_days"
    | "every_4_days"
    | "every_5_days"
    | "every_6_days"
    | "weekly"
    | "every_2_weeks"
    | "monthly";
}

export type GoalAction = "do_it" | "step_down" | "snooze";

export interface CompletionRecord {
  id: string;
  goalId: string;
  tier: "primary" | "easier" | "easiest";
  action: GoalAction;
  timestamp: number;
}

// ─── Progression ───

export interface UserProgress {
  trustLevel: number; // 1-10
  selfTrustMeter: number; // 0-100
  lastActivityAt: number;
  completions: CompletionRecord[];
  /** Milestone days already celebrated, e.g. [5, 10, 20] */
  celebratedMilestones: number[];
}

export interface TrustLevelInfo {
  level: number;
  name: string;
}

// ─── Daily State ───

export interface DailyGoalState {
  goalId: string;
  status: "pending" | "done" | "stepped_down" | "snoozed";
  /** Which tier was completed (if done/stepped_down) */
  completedTier?: "primary" | "easier" | "easiest";
}

// ─── User Profile ───

export interface UserProfile {
  username: string;
  birthday?: string;
}
