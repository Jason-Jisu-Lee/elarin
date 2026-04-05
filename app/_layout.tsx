import { useEffect, useRef, useState, useCallback } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, LogBox } from "react-native";

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
  registerNotificationCategories,
  handleNotificationResponse,
} from "../src/notifications";
import { registerBackgroundNotificationHandler } from "../src/background";

import { processPendingNativeActions } from "../src/alarms";
import { recordDoIt, recordStepDown, recordSnooze } from "../src/progression";
import { getAccountId as getSupabaseAccountId } from "../src/auth";
import { setAccountId } from "../src/storage";
import {
  ThemeContext,
  lightColors,
  darkColors,
  getStoredTheme,
  type ThemeName,
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

  useEffect(() => {
    getStoredTheme().then((t) => {
      setThemeName(t);
      setThemeReady(true);
    });
    // Restore Supabase session into AsyncStorage on every launch
    getSupabaseAccountId().then((id) => {
      if (id) setAccountId(id);
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
          <Stack.Screen name="account" options={{ headerShown: false }} />
          <Stack.Screen
            name="account/create"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="account/signin"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="template/create"
            options={{ title: "Edit Goal", presentation: "modal" }}
          />
        </Stack>
      </GestureHandlerRootView>
    </ThemeContext.Provider>
  );
}
