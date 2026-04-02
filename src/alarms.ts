import { NativeModules, Platform } from "react-native";
import { Goal } from "./types";

const { ElarinAlarmModule, ElarinPendingActions } = NativeModules;

/**
 * Schedule AlarmManager alarms for a goal using setAlarmClock().
 * These fire even under Doze mode and aggressive battery optimization.
 */
export async function scheduleAlarms(goal: Goal): Promise<void> {
  if (Platform.OS !== "android" || !ElarinAlarmModule) return;

  const { reminder } = goal;

  if (reminder.type === "exact") {
    const [hours, minutes] = reminder.startTime.split(":").map(Number);
    await ElarinAlarmModule.scheduleAlarm(
      goal.id,
      goal.name,
      goal.tiers.primary,
      0,
      3, // 3 tiers
      hours,
      minutes,
    );
  } else {
    // Window: schedule at the midpoint
    const [startH, startM] = reminder.startTime.split(":").map(Number);
    const [endH, endM] = (reminder.endTime || reminder.startTime)
      .split(":")
      .map(Number);
    const midMin = Math.round((startH * 60 + startM + (endH * 60 + endM)) / 2);
    const hours = Math.floor(midMin / 60) % 24;
    const minutes = midMin % 60;
    await ElarinAlarmModule.scheduleAlarm(
      goal.id,
      goal.name,
      goal.tiers.primary,
      0,
      3,
      hours,
      minutes,
    );
  }
}

/**
 * Cancel all AlarmManager alarms for a goal.
 */
export async function cancelAlarms(goal: Goal): Promise<void> {
  if (Platform.OS !== "android" || !ElarinAlarmModule) return;

  const { reminder } = goal;
  if (reminder.type === "exact") {
    const [hours, minutes] = reminder.startTime.split(":").map(Number);
    await ElarinAlarmModule.cancelAlarm(goal.id, hours, minutes);
  } else {
    const [startH, startM] = reminder.startTime.split(":").map(Number);
    const [endH, endM] = (reminder.endTime || reminder.startTime)
      .split(":")
      .map(Number);
    const midMin = Math.round((startH * 60 + startM + (endH * 60 + endM)) / 2);
    const hours = Math.floor(midMin / 60) % 24;
    const minutes = midMin % 60;
    await ElarinAlarmModule.cancelAlarm(goal.id, hours, minutes);
  }
}

/**
 * Process pending actions that were recorded by native receivers
 * while the app was fully closed. Call this on app foreground.
 */
export async function processPendingNativeActions(): Promise<
  Array<{
    type: "do_it" | "step_down" | "snooze";
    goalId: string;
  }>
> {
  if (Platform.OS !== "android" || !ElarinPendingActions) return [];

  try {
    const pending: Array<{ key: string; value: string }> =
      await ElarinPendingActions.getPendingActions();

    const actions = pending.map(({ value }) => {
      const parts = value.split("|");
      return {
        type: parts[0] as "do_it" | "step_down" | "snooze",
        goalId: parts[1],
      };
    });

    await ElarinPendingActions.clearPendingActions();
    return actions;
  } catch {
    return [];
  }
}
