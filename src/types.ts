// ─── Core Data Types ───

export interface StepDownLadder {
  steps: string[]; // index 0 = hardest (primary), last = easiest (minimum viable action)
}

export type GoalCategory =
  | "fitness"
  | "mindfulness"
  | "creativity"
  | "learning"
  | "health"
  | "custom";

export interface Template {
  id: string;
  name: string;
  category: GoalCategory;
  ladder: StepDownLadder;
  schedule: Schedule;
  createdAt: number;
}

export interface Schedule {
  /** Fixed times in "HH:mm" format */
  times: string[];
  /** Days of week enabled (0=Sun, 6=Sat). Empty = every day. */
  activeDays: number[];
}

export interface CompletionRecord {
  id: string;
  templateId: string;
  stepIndex: number; // which step on the ladder was completed
  timestamp: number;
  xpEarned: number;
  type: "completion" | "snooze";
}

// ─── Progression ───

export interface UserProgress {
  totalXp: number;
  level: number;
  momentum: number; // 0-100 float
  lastActivityAt: number;
  completions: CompletionRecord[];
}

export interface LevelInfo {
  level: number;
  name: string;
  minXp: number;
}
