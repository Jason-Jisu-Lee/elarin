import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { Template } from "./types";
import { NOTIFICATION_CHANNEL_ID, SNOOZE_DURATION_MINUTES } from "./constants";
import { recordCompletion, recordSnooze } from "./progression";
import { getTemplates } from "./storage";
import { scheduleAlarms, cancelAlarms } from "./alarms";

// ─── Setup ───

export async function setupNotifications(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn("Notifications only work on physical devices");
    return false;
  }

  // Create Android channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: "Elarin Steps",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

// ─── Schedule Notifications for a Template ───

export async function scheduleTemplateNotifications(
  template: Template,
): Promise<void> {
  // Cancel existing notifications for this template first
  await cancelTemplateNotifications(template.id);

  // Schedule AlarmManager alarms (high priority, survives Doze)
  await scheduleAlarms(template);

  for (const timeStr of template.schedule.times) {
    const [hours, minutes] = timeStr.split(":").map(Number);

    if (template.schedule.activeDays.length === 0) {
      // Every day: use daily trigger
      await Notifications.scheduleNotificationAsync({
        content: buildNotificationContent(template, 0),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
          channelId: NOTIFICATION_CHANNEL_ID,
        },
        identifier: `${template.id}-daily-${timeStr}`,
      });
    } else {
      // Specific days
      for (const weekday of template.schedule.activeDays) {
        await Notifications.scheduleNotificationAsync({
          content: buildNotificationContent(template, 0),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: weekday + 1, // expo uses 1-7 (Sun=1)
            hour: hours,
            minute: minutes,
            channelId: NOTIFICATION_CHANNEL_ID,
          },
          identifier: `${template.id}-weekly-${weekday}-${timeStr}`,
        });
      }
    }
  }
}

function buildNotificationContent(
  template: Template,
  currentStep: number,
): Notifications.NotificationContentInput {
  const step = template.ladder.steps[currentStep];
  const isEasiest = currentStep >= template.ladder.steps.length - 1;

  return {
    title: `⚡ ${template.name}`,
    body: step,
    data: {
      templateId: template.id,
      currentStep,
      totalSteps: template.ladder.steps.length,
    },
    categoryIdentifier: "elarin-step",
    ...(Platform.OS === "android"
      ? {
          priority: Notifications.AndroidNotificationPriority.HIGH,
        }
      : {}),
  };
}

// ─── Cancel ───

export async function cancelTemplateNotifications(
  templateId: string,
): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.identifier.startsWith(templateId)) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
  // Also cancel AlarmManager alarms — requires template data for times
  const templates = await getTemplates();
  const template = templates.find((t) => t.id === templateId);
  if (template) {
    await cancelAlarms(template);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Notification Action Categories ───

export async function registerNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync("elarin-step", [
    {
      identifier: "DO_IT",
      buttonTitle: "✅ Do it",
      options: { opensAppToForeground: false },
    },
    {
      identifier: "MAKE_EASIER",
      buttonTitle: "⬇️ Make it easier",
      options: { opensAppToForeground: false },
    },
    {
      identifier: "SNOOZE",
      buttonTitle: `💤 Snooze ${SNOOZE_DURATION_MINUTES}m`,
      options: { opensAppToForeground: false },
    },
  ]);
}

// ─── Handle Notification Responses ───

export async function handleNotificationResponse(
  response: Notifications.NotificationResponse,
): Promise<void> {
  const { actionIdentifier } = response;
  const data = response.notification.request.content.data as {
    templateId: string;
    currentStep: number;
    totalSteps: number;
  };

  if (!data?.templateId) return;

  const templates = await getTemplates();
  const template = templates.find((t) => t.id === data.templateId);
  if (!template) return;

  switch (actionIdentifier) {
    case "DO_IT":
      await recordCompletion(
        data.templateId,
        data.currentStep,
        data.totalSteps,
      );
      break;

    case "MAKE_EASIER": {
      const nextStep = data.currentStep + 1;
      if (nextStep < data.totalSteps) {
        // Fire a new notification with the easier step
        await Notifications.scheduleNotificationAsync({
          content: buildNotificationContent(template, nextStep),
          trigger: null, // immediate
          identifier: `${data.templateId}-stepdown-${nextStep}`,
        });
      } else {
        // Already at easiest — just show it again
        await Notifications.scheduleNotificationAsync({
          content: buildNotificationContent(template, data.currentStep),
          trigger: null,
          identifier: `${data.templateId}-stepdown-min`,
        });
      }
      break;
    }

    case "SNOOZE":
      await recordSnooze(data.templateId);
      // Re-fire the same notification after snooze delay
      await Notifications.scheduleNotificationAsync({
        content: buildNotificationContent(template, data.currentStep),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: SNOOZE_DURATION_MINUTES * 60,
          channelId: NOTIFICATION_CHANNEL_ID,
        },
        identifier: `${data.templateId}-snooze-${Date.now()}`,
      });
      break;

    default:
      // User tapped the notification itself (opened app)
      break;
  }
}
