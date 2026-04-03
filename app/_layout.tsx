import { useEffect, useRef, useState, useCallback } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  ActivityIndicator,
  LogBox,
} from "react-native";

LogBox.ignoreLogs([
  "Sending `onAnimatedValueUpdate`",
  "componentWillReceiveProps",
  "componentWillMount",
  "Remote debugger",
  "Require cycle:",
  "new NativeEventEmitter",
  "EventEmitter.removeListener",
  "expo-notifications",
  "Unable to find module",
]);
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import {
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_400Regular_Italic,
} from "@expo-google-fonts/plus-jakarta-sans";
import { Caveat_400Regular } from "@expo-google-fonts/caveat";
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
import { recordDoIt, recordStepDown, recordSnooze } from "../src/progression";
import {
  ThemeContext,
  useTheme,
  lightColors,
  darkColors,
  getStoredTheme,
  fonts,
  type ThemeName,
  type ThemeColors,
} from "../src/theme";

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
  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Manrope_800ExtraBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_400Regular_Italic,
    Caveat_400Regular,
  });
  const [themeName, setThemeName] = useState<ThemeName>("light");
  const [themeReady, setThemeReady] = useState(false);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const [showBatteryModal, setShowBatteryModal] = useState(false);

  useEffect(() => {
    getStoredTheme().then((t) => {
      setThemeName(t);
      setThemeReady(true);
    });
  }, []);

  useEffect(() => {
    registerNotificationCategories();
    registerBackgroundNotificationHandler();

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse,
      );

    processPendingNativeActions().then(async (actions) => {
      for (const action of actions) {
        if (action.type === "do_it") {
          await recordDoIt(action.goalId, "primary");
        } else if (action.type === "step_down") {
          await recordStepDown(action.goalId, "easier");
        } else if (action.type === "snooze") {
          await recordSnooze(action.goalId);
        }
      }
    });

    // Battery optimization prompt disabled — too aggressive

    return () => {
      responseListener.current?.remove();
    };
  }, []);

  const colors = themeName === "dark" ? darkColors : lightColors;

  const setTheme = useCallback((t: ThemeName) => setThemeName(t), []);

  if (!fontsLoaded || !themeReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.surface,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        theme: themeName,
        colors,
        isDark: themeName === "dark",
        setTheme,
      }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style={themeName === "dark" ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.onSurface,
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: colors.surface },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="theme-select" options={{ headerShown: false }} />
          <Stack.Screen name="home" options={{ headerShown: false }} />
          <Stack.Screen name="templates" options={{ headerShown: false }} />
          <Stack.Screen name="create" options={{ headerShown: false }} />
          <Stack.Screen name="goal/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen
            name="template/create"
            options={{ title: "Edit Goal", presentation: "modal" }}
          />
        </Stack>

        <BatteryModal
          visible={showBatteryModal}
          colors={colors}
          onSettings={async () => {
            setShowBatteryModal(false);
            await openBatteryOptimizationSettings();
          }}
          onDismiss={() => setShowBatteryModal(false)}
        />
      </GestureHandlerRootView>
    </ThemeContext.Provider>
  );
}

function BatteryModal({
  visible,
  colors,
  onSettings,
  onDismiss,
}: {
  visible: boolean;
  colors: ThemeColors;
  onSettings: () => void;
  onDismiss: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={batteryStyles.overlay}>
        <View
          style={[
            batteryStyles.card,
            { backgroundColor: colors.surfaceContainerLowest },
          ]}
        >
          <Text
            style={[
              batteryStyles.title,
              { color: colors.onSurface, fontFamily: fonts.headlineBold },
            ]}
          >
            Keep Elarin Alive
          </Text>
          <Text
            style={[
              batteryStyles.body,
              { color: colors.onSurfaceVariant, fontFamily: fonts.bodyRegular },
            ]}
          >
            Some Android phones aggressively kill background apps. To make sure
            your step-down notifications arrive on time, please allow Elarin to
            run in the background.
          </Text>
          <Text
            style={[
              batteryStyles.hint,
              { color: colors.primary, fontFamily: fonts.bodyRegular },
            ]}
          >
            This is especially important on Samsung, Xiaomi, and OnePlus
            devices.
          </Text>
          <TouchableOpacity
            style={[
              batteryStyles.primaryBtn,
              { backgroundColor: colors.primary },
            ]}
            onPress={onSettings}
          >
            <Text
              style={[
                batteryStyles.primaryBtnText,
                { color: colors.onPrimary, fontFamily: fonts.bodySemiBold },
              ]}
            >
              Open Battery Settings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={batteryStyles.secondaryBtn}
            onPress={onDismiss}
          >
            <Text
              style={[
                batteryStyles.secondaryBtnText,
                {
                  color: colors.onSurfaceVariant,
                  fontFamily: fonts.bodyMedium,
                },
              ]}
            >
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    marginBottom: 12,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
    fontStyle: "italic",
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  primaryBtnText: {
    fontSize: 16,
  },
  secondaryBtn: {
    paddingVertical: 10,
  },
  secondaryBtnText: {
    fontSize: 14,
  },
});
