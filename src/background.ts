import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import { getTemplates } from "./storage";
import { recordCompletion, recordSnooze } from "./progression";
import { NOTIFICATION_CHANNEL_ID, SNOOZE_DURATION_MINUTES } from "./constants";
import { Template } from "./types";

const BACKGROUND_NOTIFICATION_TASK = "ELARIN_BACKGROUND_NOTIFICATION";

function buildNotificationContent(
  template: Template,
  currentStep: number,
): Notifications.NotificationContentInput {
  const step = template.ladder.steps[currentStep];
  return {
    title: `⚡ ${template.name}`,
    body: step,
    data: {
      templateId: template.id,
      currentStep,
      totalSteps: template.ladder.steps.length,
    },
    categoryIdentifier: "elarin-step",
    priority: Notifications.AndroidNotificationPriority.HIGH,
  };
}

// This runs even when the app is fully closed.
// expo-task-manager keeps a headless JS context alive for this.
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
      | {
          templateId: string;
          currentStep: number;
          totalSteps: number;
        }
      | undefined;

    if (!notifData?.templateId) return;

    const templates = await getTemplates();
    const template = templates.find((t) => t.id === notifData.templateId);
    if (!template) return;

    switch (actionIdentifier) {
      case "DO_IT":
        await recordCompletion(
          notifData.templateId,
          notifData.currentStep,
          notifData.totalSteps,
        );
        break;

      case "MAKE_EASIER": {
        const nextStep = notifData.currentStep + 1;
        if (nextStep < notifData.totalSteps) {
          await Notifications.scheduleNotificationAsync({
            content: buildNotificationContent(template, nextStep),
            trigger: null,
            identifier: `${notifData.templateId}-stepdown-${nextStep}`,
          });
        } else {
          await Notifications.scheduleNotificationAsync({
            content: buildNotificationContent(template, notifData.currentStep),
            trigger: null,
            identifier: `${notifData.templateId}-stepdown-min`,
          });
        }
        break;
      }

      case "SNOOZE":
        await recordSnooze(notifData.templateId);
        await Notifications.scheduleNotificationAsync({
          content: buildNotificationContent(template, notifData.currentStep),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: SNOOZE_DURATION_MINUTES * 60,
            channelId: NOTIFICATION_CHANNEL_ID,
          },
          identifier: `${notifData.templateId}-snooze-${Date.now()}`,
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
