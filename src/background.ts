import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import { getGoals } from "./storage";
import { recordDoIt, recordStepDown, recordSnooze } from "./progression";
import { buildNotificationContent } from "./notifications";
import { NOTIFICATION_CHANNEL_ID, SNOOZE_DURATION_MINUTES } from "./constants";

const BACKGROUND_NOTIFICATION_TASK = "ELARIN_BACKGROUND_NOTIFICATION";

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
