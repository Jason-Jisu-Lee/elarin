import { useEffect, useRef, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from "react-native";
import * as Notifications from "expo-notifications";
import {
  setupNotifications,
  registerNotificationCategories,
  handleNotificationResponse,
} from "../src/notifications";
import { registerBackgroundNotificationHandler } from "../src/background";
import {
  promptBatteryOptimizationIfNeeded,
  openBatteryOptimizationSettings,
} from "../src/battery";
import { processPendingNativeActions } from "../src/alarms";
import { recordCompletion, recordSnooze } from "../src/progression";
import { colors } from "../src/constants";

// Handle notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const [showBatteryModal, setShowBatteryModal] = useState(false);

  useEffect(() => {
    // Setup notifications and register background handler
    setupNotifications();
    registerNotificationCategories();
    registerBackgroundNotificationHandler();

    // Listen for notification responses (button taps) when app is in foreground
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse,
      );

    // Process any pending actions from native receivers (app was killed)
    processPendingNativeActions().then(async (actions) => {
      for (const action of actions) {
        if (action.type === "completion") {
          await recordCompletion(
            action.templateId,
            action.stepIndex,
            action.totalSteps,
          );
        } else if (action.type === "snooze") {
          await recordSnooze(action.templateId);
        }
        // step_down is handled natively
      }
    });

    // Battery optimization prompt on first launch
    if (Platform.OS === "android") {
      promptBatteryOptimizationIfNeeded().then((shouldPrompt) => {
        if (shouldPrompt) setShowBatteryModal(true);
      });
    }

    return () => {
      responseListener.current?.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: colors.bg },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen
          name="template/create"
          options={{ title: "New Template", presentation: "modal" }}
        />
        <Stack.Screen
          name="template/schedule"
          options={{ title: "Set Schedule" }}
        />
      </Stack>

      {/* Battery Optimization Modal */}
      <Modal
        visible={showBatteryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBatteryModal(false)}
      >
        <View style={batteryStyles.overlay}>
          <View style={batteryStyles.card}>
            <Text style={batteryStyles.emoji}>🔋</Text>
            <Text style={batteryStyles.title}>Keep Elarin Alive</Text>
            <Text style={batteryStyles.body}>
              Some Android phones aggressively kill background apps. To make
              sure your step-down notifications arrive on time, please allow
              Elarin to run in the background.
            </Text>
            <Text style={batteryStyles.hint}>
              This is especially important on Samsung, Xiaomi, and OnePlus
              devices.
            </Text>
            <TouchableOpacity
              style={batteryStyles.primaryBtn}
              onPress={async () => {
                setShowBatteryModal(false);
                await openBatteryOptimizationSettings();
              }}
            >
              <Text style={batteryStyles.primaryBtnText}>
                Open Battery Settings
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={batteryStyles.secondaryBtn}
              onPress={() => setShowBatteryModal(false)}
            >
              <Text style={batteryStyles.secondaryBtnText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const batteryStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: colors.accent,
    textAlign: "center",
    marginBottom: 20,
    fontStyle: "italic",
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryBtn: {
    paddingVertical: 10,
  },
  secondaryBtnText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
