import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import { Goal } from "./types";
import { getGoals } from "./storage";
import { recordDoIt, recordStepDown, recordSnooze } from "./progression";
import { NOTIFICATION_CHANNEL_ID, SNOOZE_DURATION_MINUTES } from "./constants";

const BACKGROUND_NOTIFICATION_TASK = "ELARIN_BACKGROUND_NOTIFICATION";

function buildNotificationContent(
  goal: Goal,
): Notifications.NotificationContentInput {
  return {
    title: `${goal.emoji} ${goal.name}`,
    body: goal.tiers.primary,
    data: {
      goalId: goal.id,
    },
    categoryIdentifier: "elarin-goal",
    priority: Notifications.AndroidNotificationPriority.HIGH,
  };
}

TaskManager.defineTask(
  BACKGROUND_NOTIFICATION_TASK,
  async ({
    data,
    error,
  }: TaskManager.TaskManagerTaskBody<{
    notification: Notifications.NotificationResponse;
  }>) => {
    if (error) {
      console.error("Background notification task error:", error);
      return;
    }

    const response = data?.notification;
    if (!response) return;

    const actionIdentifier = response.actionIdentifier;
    const notifData = response.notification?.request?.content?.data as
      | { goalId: string }
      | undefined;

    if (!notifData?.goalId) return;

    const goals = await getGoals();
    const goal = goals.find((g) => g.id === notifData.goalId);
    if (!goal) return;

    switch (actionIdentifier) {
      case "DO_IT":
        await recordDoIt(notifData.goalId, "primary");
        break;

      case "STEP_DOWN":
        await recordStepDown(notifData.goalId, "easier");
        break;

      case "SNOOZE":
        await recordSnooze(notifData.goalId);
        await Notifications.scheduleNotificationAsync({
          content: buildNotificationContent(goal),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: SNOOZE_DURATION_MINUTES * 60,
            channelId: NOTIFICATION_CHANNEL_ID,
          },
          identifier: `${notifData.goalId}-snooze-${Date.now()}`,
        });
        break;
    }
  },
);

export function registerBackgroundNotificationHandler(): void {
  Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch((err) => {
    console.warn("Failed to register background notification task:", err);
  });
}

export { BACKGROUND_NOTIFICATION_TASK };
