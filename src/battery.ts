import { Platform, Linking } from "react-native";
import * as IntentLauncher from "expo-intent-launcher";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BATTERY_PROMPT_KEY = "elarin:battery-prompt-shown";

/**
 * Check if we've already prompted the user for battery optimization.
 */
async function hasPromptedBattery(): Promise<boolean> {
  const val = await AsyncStorage.getItem(BATTERY_PROMPT_KEY);
  return val === "true";
}

async function markBatteryPrompted(): Promise<void> {
  await AsyncStorage.setItem(BATTERY_PROMPT_KEY, "true");
}

/**
 * Open the Android battery optimization settings for this app.
 * On Samsung/Xiaomi/OnePlus, the OS aggressively kills background processes.
 * This prompts the user to whitelist Elarin.
 */
export async function openBatteryOptimizationSettings(): Promise<void> {
  if (Platform.OS !== "android") return;

  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
      {
        data: "package:com.elarin.app",
      },
    );
  } catch {
    // Fallback: open general battery settings
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS,
      );
    } catch {
      // Last resort: open app settings
      await Linking.openSettings();
    }
  }
}

/**
 * On first launch, prompt user to whitelist Elarin from battery optimization.
 * Returns true if the prompt was shown (first time), false if already prompted.
 */
export async function promptBatteryOptimizationIfNeeded(): Promise<boolean> {
  if (Platform.OS !== "android") return false;

  const alreadyPrompted = await hasPromptedBattery();
  if (alreadyPrompted) return false;

  await markBatteryPrompted();
  return true; // Caller should show the UI prompt
}
