import { TRUST_LEVELS, MILESTONES } from "./constants";
import { UserProgress, CompletionRecord, TrustLevelInfo } from "./types";
import {
  getProgress,
  saveProgress,
  addCompletion as storageAddCompletion,
  updateDailyGoalState,
} from "./storage";

/** Get trust level info for a given level number */
export function getTrustLevel(level: number): TrustLevelInfo {
  return (
    TRUST_LEVELS[Math.min(level, TRUST_LEVELS.length) - 1] ?? TRUST_LEVELS[0]
  );
}

/** Count consecutive days with at least one completion */
export function getConsecutiveDays(completions: CompletionRecord[]): number {
  if (completions.length === 0) return 0;

  const daySet = new Set<string>();
  for (const c of completions) {
    if (c.action === "do_it" || c.action === "step_down") {
      const d = new Date(c.timestamp);
      daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
  }

  const today = new Date();
  let count = 0;
  const check = new Date(today);

  while (true) {
    const key = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`;
    if (daySet.has(key)) {
      count++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }

  return count;
}

/** Calculate self-trust meter (0-100) based on recent consistency */
function calculateSelfTrustMeter(completions: CompletionRecord[]): number {
  // Look at last 30 days of activity
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = completions.filter(
    (c) =>
      c.timestamp > thirtyDaysAgo &&
      (c.action === "do_it" || c.action === "step_down"),
  );

  const daySet = new Set<string>();
  for (const c of recent) {
    const d = new Date(c.timestamp);
    daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }

  // Percentage of last 30 days with activity, scaled to 0-100
  return Math.min(100, Math.round((daySet.size / 30) * 100));
}

/** Calculate trust level (1-10) based on consecutive days */
function calculateTrustLevel(consecutiveDays: number): number {
  if (consecutiveDays >= 100) return 10;
  if (consecutiveDays >= 80) return 9;
  if (consecutiveDays >= 60) return 8;
  if (consecutiveDays >= 45) return 7;
  if (consecutiveDays >= 30) return 6;
  if (consecutiveDays >= 20) return 5;
  if (consecutiveDays >= 10) return 4;
  if (consecutiveDays >= 5) return 3;
  if (consecutiveDays >= 2) return 2;
  return 1;
}

/** Check if a new milestone was reached, return the milestone number or null */
export function checkMilestone(
  consecutiveDays: number,
  celebrated: number[],
): number | null {
  for (const m of MILESTONES) {
    if (consecutiveDays >= m && !celebrated.includes(m)) {
      return m;
    }
  }
  return null;
}

/** Record a "Do It" action */
export async function recordDoIt(
  goalId: string,
  tier: "primary" | "easier" | "easiest",
): Promise<UserProgress> {
  const record: CompletionRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    goalId,
    tier,
    action: "do_it",
    timestamp: Date.now(),
  };

  const progress = await storageAddCompletion(record);
  await updateDailyGoalState(goalId, "done", tier);

  // Recalculate progression
  const consecutive = getConsecutiveDays(progress.completions);
  progress.selfTrustMeter = calculateSelfTrustMeter(progress.completions);
  progress.trustLevel = calculateTrustLevel(consecutive);

  // Check milestones
  const milestone = checkMilestone(consecutive, progress.celebratedMilestones);
  if (milestone) {
    progress.celebratedMilestones.push(milestone);
  }

  await saveProgress(progress);
  return progress;
}

/** Record a "Step Down" action */
export async function recordStepDown(
  goalId: string,
  tier: "easier" | "easiest",
): Promise<UserProgress> {
  const record: CompletionRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    goalId,
    tier,
    action: "step_down",
    timestamp: Date.now(),
  };

  const progress = await storageAddCompletion(record);
  await updateDailyGoalState(goalId, "stepped_down", tier);

  const consecutive = getConsecutiveDays(progress.completions);
  progress.selfTrustMeter = calculateSelfTrustMeter(progress.completions);
  progress.trustLevel = calculateTrustLevel(consecutive);

  const milestone = checkMilestone(consecutive, progress.celebratedMilestones);
  if (milestone) {
    progress.celebratedMilestones.push(milestone);
  }

  await saveProgress(progress);
  return progress;
}

/** Record a snooze (no XP, no trust change) */
export async function recordSnooze(goalId: string): Promise<void> {
  await updateDailyGoalState(goalId, "snoozed");
}

/** Get current progress */
export async function getLiveProgress(): Promise<UserProgress> {
  const progress = await getProgress();
  progress.selfTrustMeter = calculateSelfTrustMeter(progress.completions);
  const consecutive = getConsecutiveDays(progress.completions);
  progress.trustLevel = calculateTrustLevel(consecutive);
  return progress;
}
