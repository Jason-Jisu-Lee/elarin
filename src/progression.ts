import { getLevelForXp, MOMENTUM } from "./constants";
import { UserProgress, CompletionRecord } from "./types";
import {
  getProgress,
  saveProgress,
  addCompletion as storageAddCompletion,
} from "./storage";
import { xpForStep, XP } from "./constants";

/** Compute decayed momentum based on time since last activity */
export function calculateMomentum(progress: UserProgress): number {
  if (progress.lastActivityAt === 0) return 0;
  const hoursElapsed =
    (Date.now() - progress.lastActivityAt) / (1000 * 60 * 60);
  const decayed =
    progress.momentum - hoursElapsed * MOMENTUM.DECAY_RATE_PER_HOUR;
  return Math.max(MOMENTUM.MIN, Math.min(MOMENTUM.MAX, decayed));
}

/** Record a step completion and return updated progress */
export async function recordCompletion(
  templateId: string,
  stepIndex: number,
  totalSteps: number,
): Promise<UserProgress> {
  const xpEarned = xpForStep(stepIndex, totalSteps);
  const record: CompletionRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    templateId,
    stepIndex,
    timestamp: Date.now(),
    xpEarned,
    type: "completion",
  };

  const progress = await storageAddCompletion(record);

  // Update momentum
  progress.momentum = Math.min(
    MOMENTUM.MAX,
    calculateMomentum(progress) + MOMENTUM.GAIN_PER_ACTION,
  );

  // Update level
  progress.level = getLevelForXp(progress.totalXp).level;

  await saveProgress(progress);
  return progress;
}

/** Record a snooze engagement (still earns XP) */
export async function recordSnooze(templateId: string): Promise<UserProgress> {
  const record: CompletionRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    templateId,
    stepIndex: -1,
    timestamp: Date.now(),
    xpEarned: XP.SNOOZE,
    type: "snooze",
  };

  const progress = await storageAddCompletion(record);

  progress.momentum = Math.min(
    MOMENTUM.MAX,
    calculateMomentum(progress) + MOMENTUM.GAIN_PER_ACTION * 0.3,
  );

  progress.level = getLevelForXp(progress.totalXp).level;

  await saveProgress(progress);
  return progress;
}

/** Get current progress with live momentum */
export async function getLiveProgress(): Promise<UserProgress> {
  const progress = await getProgress();
  progress.momentum = calculateMomentum(progress);
  return progress;
}
