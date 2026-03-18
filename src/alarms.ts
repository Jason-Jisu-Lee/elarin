import { NativeModules, Platform } from "react-native";
import { Template } from "./types";

const { ElarinAlarmModule, ElarinPendingActions } = NativeModules;

/**
 * Schedule AlarmManager alarms for a template using setAlarmClock().
 * These fire even under Doze mode and aggressive battery optimization.
 */
export async function scheduleAlarms(template: Template): Promise<void> {
  if (Platform.OS !== "android" || !ElarinAlarmModule) return;

  const firstStep = template.ladder.steps[0];

  for (const timeStr of template.schedule.times) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    await ElarinAlarmModule.scheduleAlarm(
      template.id,
      template.name,
      firstStep,
      0,
      template.ladder.steps.length,
      hours,
      minutes,
    );
  }
}

/**
 * Cancel all AlarmManager alarms for a template.
 */
export async function cancelAlarms(template: Template): Promise<void> {
  if (Platform.OS !== "android" || !ElarinAlarmModule) return;

  for (const timeStr of template.schedule.times) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    await ElarinAlarmModule.cancelAlarm(template.id, hours, minutes);
  }
}

/**
 * Process pending actions that were recorded by native receivers
 * while the app was fully closed. Call this on app foreground.
 */
export async function processPendingNativeActions(): Promise<
  Array<{
    type: "completion" | "snooze" | "step_down";
    templateId: string;
    stepIndex: number;
    totalSteps: number;
  }>
> {
  if (Platform.OS !== "android" || !ElarinPendingActions) return [];

  try {
    const pending: Array<{ key: string; value: string }> =
      await ElarinPendingActions.getPendingActions();

    const actions = pending.map(({ value }) => {
      const parts = value.split("|");
      return {
        type: parts[0] as "completion" | "snooze" | "step_down",
        templateId: parts[1],
        stepIndex: parseInt(parts[2], 10),
        totalSteps: parseInt(parts[3], 10),
      };
    });

    await ElarinPendingActions.clearPendingActions();
    return actions;
  } catch {
    return [];
  }
}
