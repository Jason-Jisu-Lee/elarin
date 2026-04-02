import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { Goal } from "./types";
import { NOTIFICATION_CHANNEL_ID, SNOOZE_DURATION_MINUTES } from "./constants";
import { recordDoIt, recordStepDown, recordSnooze } from "./progression";
import { getGoals } from "./storage";

// ─── Setup ───

export async function setupNotifications(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn("Notifications only work on physical devices");
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: "Elarin Reminders",
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

// ─── Schedule Notifications for a Goal ───

export async function scheduleGoalNotifications(goal: Goal): Promise<void> {
  await cancelGoalNotifications(goal.id);

  const { reminder } = goal;

  if (reminder.type === "exact") {
    const [hours, minutes] = reminder.startTime.split(":").map(Number);
    for (let i = 0; i < reminder.remindersPerDay; i++) {
      await Notifications.scheduleNotificationAsync({
        content: buildNotificationContent(goal),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
          channelId: NOTIFICATION_CHANNEL_ID,
        },
        identifier: `${goal.id}-daily-${i}`,
      });
    }
  } else {
    // Window type: space reminders evenly within the window
    const [startH, startM] = reminder.startTime.split(":").map(Number);
    const [endH, endM] = (reminder.endTime || reminder.startTime)
      .split(":")
      .map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const range = Math.max(1, endMinutes - startMinutes);

    for (let i = 0; i < reminder.remindersPerDay; i++) {
      const offset = Math.round(
        (range / (reminder.remindersPerDay + 1)) * (i + 1),
      );
      const totalMin = startMinutes + offset;
      const hours = Math.floor(totalMin / 60) % 24;
      const minutes = totalMin % 60;

      await Notifications.scheduleNotificationAsync({
        content: buildNotificationContent(goal),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
          channelId: NOTIFICATION_CHANNEL_ID,
        },
        identifier: `${goal.id}-window-${i}`,
      });
    }
  }
}

function buildNotificationContent(
  goal: Goal,
): Notifications.NotificationContentInput {
  return {
    title: goal.name,
    body: goal.tiers.primary,
    data: {
      goalId: goal.id,
    },
    categoryIdentifier: "elarin-goal",
    ...(Platform.OS === "android"
      ? { priority: Notifications.AndroidNotificationPriority.HIGH }
      : {}),
  };
}

// ─── Cancel ───

export async function cancelGoalNotifications(goalId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.identifier.startsWith(goalId)) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Notification Action Categories ───

export async function registerNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync("elarin-goal", [
    {
      identifier: "DO_IT",
      buttonTitle: "Done",
      options: { opensAppToForeground: false },
    },
    {
      identifier: "STEP_DOWN",
      buttonTitle: "Step down",
      options: { opensAppToForeground: false },
    },
    {
      identifier: "SNOOZE",
      buttonTitle: `Snooze ${SNOOZE_DURATION_MINUTES}m`,
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
    goalId: string;
  };

  if (!data?.goalId) return;

  const goals = await getGoals();
  const goal = goals.find((g) => g.id === data.goalId);
  if (!goal) return;

  switch (actionIdentifier) {
    case "DO_IT":
      await recordDoIt(data.goalId, "primary");
      break;

    case "STEP_DOWN":
      await recordStepDown(data.goalId, "easier");
      break;

    case "SNOOZE":
      await recordSnooze(data.goalId);
      await Notifications.scheduleNotificationAsync({
        content: buildNotificationContent(goal),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: SNOOZE_DURATION_MINUTES * 60,
          channelId: NOTIFICATION_CHANNEL_ID,
        },
        identifier: `${data.goalId}-snooze-${Date.now()}`,
      });
      break;

    default:
      break;
  }
}
