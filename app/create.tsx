/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Animated,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { useRouter, useLocalSearchParams } from "expo-router";
import { PRE_BUILT_GOALS } from "../src/constants";
import { Goal } from "../src/types";
import { addGoal } from "../src/storage";
import {
  scheduleGoalNotifications,
  setupNotifications,
} from "../src/notifications";
import { useTheme, fonts } from "../src/theme";

type Step = "goal" | "frequency" | "time" | "done";

const FREQUENCY_OPTIONS = [
  { value: "daily" as const, label: "Daily" },
  { value: "every_other_day" as const, label: "Every 2 days" },
  { value: "every_3_days" as const, label: "Every 3 days" },
  { value: "every_4_days" as const, label: "Every 4 days" },
  { value: "every_5_days" as const, label: "Every 5 days" },
  { value: "every_6_days" as const, label: "Every 6 days" },
  { value: "weekly" as const, label: "Weekly" },
] as const;

type FreqValue = (typeof FREQUENCY_OPTIONS)[number]["value"];

const ITEM_HEIGHT = 32;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

export default function CreateGoal() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { prebuilt, onboarding } = useLocalSearchParams<{
    prebuilt?: string;
    onboarding?: string;
  }>();
  const isOnboarding = onboarding === "1";

  const prebuiltGoal =
    prebuilt !== undefined ? PRE_BUILT_GOALS[Number(prebuilt)] : null;

  const [name, setName] = useState(prebuiltGoal?.name ?? "");
  const [primary, setPrimary] = useState(prebuiltGoal?.tiers.primary ?? "");
  const [micro, setMicro] = useState(prebuiltGoal?.tiers.easier ?? "");
  const [startTime, setStartTime] = useState(
    prebuiltGoal?.reminder.startTime ?? "17:00",
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [frequency, setFrequency] = useState<FreqValue>(
    (prebuiltGoal?.reminder.frequency as FreqValue) ?? "daily",
  );

  const [step, setStep] = useState<Step>("goal");
  const [fadeAnim] = useState(new Animated.Value(1));
  const [pickerVisible, setPickerVisible] = useState(false);
  const [permError, setPermError] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Scroll wheel initial position
  useEffect(() => {
    if (step === "frequency") {
      const idx = FREQUENCY_OPTIONS.findIndex((f) => f.value === frequency);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
      }, 50);
    }
  }, [step]);

  const transition = (next: Step) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const onTimePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setPickerVisible(false);
    if (event.type === "dismissed" || !date) return;
    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");
    setStartTime(`${h}:${m}`);
  };

  const timeToDate = (timeStr: string): Date => {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  };

  const formatTime = (timeStr: string): string => {
    const [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const handleFinish = async () => {
    const goal: Goal = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim() || "My Goal",
      emoji: "",
      tiers: {
        primary: primary.trim(),
        easier: micro.trim() || primary.trim(),
        easiest: micro.trim() || primary.trim(),
      },
      reminder: {
        type: "exact",
        startTime,
        remindersPerDay: 1,
        activeDays: [],
        frequency,
        notificationsEnabled,
      },
      createdAt: Date.now(),
    };
    await addGoal(goal);
    if (notificationsEnabled) {
      await scheduleGoalNotifications(goal);
    }
    router.replace(isOnboarding ? "/theme-select" : "/home");
  };

  // Request notification permission; proceed to "done" only if granted (or not needed)
  const handleTimeNext = async () => {
    if (notificationsEnabled) {
      // Always re-request — on Android 13+ this shows the system dialog every time
      // if permanently denied, canAskAgain is false so we open Settings instead
      const { status, canAskAgain } =
        await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        if (!canAskAgain) {
          // Permanently denied — send user to app settings
          await Notifications.getPermissionsAsync(); // no-op, just keeps import used
          const { openSettings } = await import("expo-linking");
          openSettings();
        }
        setPermError(true);
        return;
      }
      await setupNotifications();
    }
    setPermError(false);
    transition("done");
  };

  // ── Scroll wheel handlers ──
  const onWheelScrollEnd = (e: {
    nativeEvent: { contentOffset: { y: number } };
  }) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(
      0,
      Math.min(Math.round(y / ITEM_HEIGHT), FREQUENCY_OPTIONS.length - 1),
    );
    const newFreq = FREQUENCY_OPTIONS[idx].value;
    if (newFreq !== frequency) {
      setFrequency(newFreq);
      Haptics.selectionAsync();
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* ── Goal step ── */}
        {step === "goal" && (
          <View style={styles.stepContainer}>
            <Text style={[styles.label, { color: colors.onSurface }]}>
              Title
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.onSurface,
                  borderBottomColor: colors.surfaceVariant,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Title of your action e.g. Push Ups"
              placeholderTextColor={colors.outlineVariant}
              maxLength={50}
              textAlign="center"
              multiline
            />

            <Text
              style={[styles.label, { color: colors.onSurface, marginTop: 24 }]}
            >
              Action
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.onSurface,
                  borderBottomColor: colors.surfaceVariant,
                },
              ]}
              value={primary}
              onChangeText={setPrimary}
              placeholder={"What do you want to do?\ne.g. 20 Push Ups"}
              placeholderTextColor={colors.outlineVariant}
              maxLength={50}
              textAlign="center"
              multiline
            />

            <Text
              style={[styles.label, { color: colors.onSurface, marginTop: 24 }]}
            >
              Micro Action
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.onSurface,
                  borderBottomColor: colors.surfaceVariant,
                },
              ]}
              value={micro}
              onChangeText={setMicro}
              placeholder="An easy version e.g. 1 Push Up"
              placeholderTextColor={colors.outlineVariant}
              maxLength={50}
              textAlign="center"
              multiline
            />

            {name.trim() && primary.trim() ? (
              <Pressable
                onPress={() => transition("frequency")}
                style={({ pressed }) => [
                  styles.ghostBtn,
                  pressed && styles.ghostBtnPressed,
                ]}
              >
                <Text style={[styles.btnText, { color: colors.onSurface }]}>
                  Next
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {/* ── Frequency step ── */}
        {step === "frequency" && (
          <View style={styles.stepContainer}>
            <Pressable
              onPress={() => transition("goal")}
              style={styles.backArrow}
            >
              <Text style={[styles.backArrowText, { color: colors.onSurface }]}>
                ←
              </Text>
            </Pressable>
            <Text style={[styles.question, { color: colors.onSurface }]}>
              Frequency
            </Text>
            <Text
              style={[styles.freqExplain, { color: colors.onSurfaceVariant }]}
            >
              How often would you like to perform this action?{"\n"}
              Goals are grouped by frequency on your home screen.
            </Text>

            <View style={[styles.wheelContainer, { height: WHEEL_HEIGHT }]}>
              {/* Center highlight bar */}
              <View
                style={[
                  styles.wheelHighlight,
                  {
                    top: ITEM_HEIGHT * 2,
                    height: ITEM_HEIGHT,
                    backgroundColor: isDark
                      ? colors.surfaceContainerHigh
                      : colors.surfaceContainerHighest,
                  },
                ]}
              />
              <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                showsVerticalScrollIndicator={false}
                onMomentumScrollEnd={onWheelScrollEnd}
                onScrollEndDrag={onWheelScrollEnd}
              >
                {FREQUENCY_OPTIONS.map((opt) => {
                  const selected = opt.value === frequency;
                  return (
                    <View
                      key={opt.value}
                      style={[styles.wheelItem, { height: ITEM_HEIGHT }]}
                    >
                      <Text
                        style={[
                          styles.wheelText,
                          {
                            color: colors.onSurface,
                            opacity: selected ? 1 : 0.25,
                            fontSize: selected ? 17 : 13,
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            <Pressable
              onPress={() => transition("time")}
              style={({ pressed }) => [
                styles.ghostBtn,
                pressed && styles.ghostBtnPressed,
              ]}
            >
              <Text style={[styles.btnText, { color: colors.onSurface }]}>
                Next
              </Text>
            </Pressable>
          </View>
        )}

        {/* ── Time / Notification step ── */}
        {step === "time" && (
          <View style={styles.stepContainer}>
            <Pressable
              onPress={() => transition("frequency")}
              style={styles.backArrow}
            >
              <Text style={[styles.backArrowText, { color: colors.onSurface }]}>
                ←
              </Text>
            </Pressable>
            <Text style={[styles.question, { color: colors.onSurface }]}>
              Notification
            </Text>

            {/* Vertical toggle */}
            <Pressable
              style={[
                styles.toggleChip,
                {
                  backgroundColor: notificationsEnabled
                    ? colors.primary
                    : colors.surfaceContainerHigh,
                  marginBottom: 10,
                },
              ]}
              onPress={() => {
                setNotificationsEnabled(true);
                setPermError(false);
              }}
            >
              <Text
                style={[
                  styles.toggleChipText,
                  {
                    color: notificationsEnabled
                      ? colors.onPrimary
                      : colors.onSurfaceVariant,
                  },
                ]}
              >
                Set Time
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.toggleChip,
                {
                  backgroundColor: !notificationsEnabled
                    ? colors.primary
                    : colors.surfaceContainerHigh,
                  marginBottom: 16,
                },
              ]}
              onPress={() => {
                setNotificationsEnabled(false);
                setPermError(false);
              }}
            >
              <Text
                style={[
                  styles.toggleChipText,
                  {
                    color: !notificationsEnabled
                      ? colors.onPrimary
                      : colors.onSurfaceVariant,
                  },
                ]}
              >
                None
              </Text>
            </Pressable>

            {/* Time button — greyed out when None is selected */}
            <Pressable
              style={[
                styles.timeBtn,
                {
                  backgroundColor: colors.surfaceContainerHigh,
                  opacity: notificationsEnabled ? 1 : 0.35,
                },
              ]}
              onPress={() => notificationsEnabled && setPickerVisible(true)}
              disabled={!notificationsEnabled}
            >
              <Text
                style={[
                  styles.timeBtnLabel,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                At
              </Text>
              <Text style={[styles.timeBtnValue, { color: colors.primary }]}>
                {formatTime(startTime)}
              </Text>
            </Pressable>

            {notificationsEnabled && pickerVisible && (
              <DateTimePicker
                mode="time"
                value={timeToDate(startTime)}
                onChange={onTimePickerChange}
                is24Hour={false}
                display={Platform.OS === "ios" ? "spinner" : "default"}
              />
            )}

            {/* Permission error warning */}
            {permError && (
              <View
                style={[
                  styles.permWarning,
                  { backgroundColor: colors.surfaceContainerHigh },
                ]}
              >
                <Text
                  style={[styles.permWarningText, { color: colors.onSurface }]}
                >
                  Please grant notification permission for this app, or set
                  reminder to{" "}
                  <Text style={{ fontFamily: fonts.bodySemiBold }}>"None"</Text>
                  .
                </Text>
              </View>
            )}

            <Pressable
              onPress={handleTimeNext}
              style={({ pressed }) => [
                styles.ghostBtn,
                pressed && styles.ghostBtnPressed,
              ]}
            >
              <Text style={[styles.btnText, { color: colors.onSurface }]}>
                Next
              </Text>
            </Pressable>
          </View>
        )}

        {/* ── Done step ── */}
        {step === "done" && (
          <View style={styles.stepContainer}>
            <Text style={[styles.doneTitle, { color: colors.onSurface }]}>
              {name}
            </Text>
            <View
              style={[
                styles.summary,
                { backgroundColor: colors.surfaceContainerLowest },
              ]}
            >
              <Text style={[styles.summaryTier, { color: colors.onSurface }]}>
                {primary}
              </Text>
              {micro.trim() && micro.trim() !== primary.trim() ? (
                <>
                  <Text
                    style={[
                      styles.summaryArrow,
                      { color: colors.outlineVariant },
                    ]}
                  >
                    ↓
                  </Text>
                  <Text
                    style={[styles.summaryTier, { color: colors.onSurface }]}
                  >
                    {micro}
                  </Text>
                </>
              ) : null}
            </View>
            <Pressable
              onPress={handleFinish}
              style={({ pressed }) => [
                styles.ghostBtn,
                pressed && styles.ghostBtnPressed,
              ]}
            >
              <Text style={[styles.btnText, { color: colors.onSurface }]}>
                Let's Go
              </Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  stepContainer: { alignItems: "stretch" },
  backArrow: {
    alignSelf: "flex-start",
    padding: 8,
    marginBottom: 8,
    marginLeft: -8,
  },
  backArrowText: {
    fontSize: 22,
    fontFamily: fonts.headlineBold,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
    textAlign: "center",
  },
  question: {
    fontSize: 28,
    fontFamily: fonts.headlineExtraBold,
    marginBottom: 8,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  freqExplain: {
    fontSize: 14,
    fontFamily: fonts.bodyRegular,
    lineHeight: 21,
    marginBottom: 12,
    textAlign: "center",
  },
  input: {
    borderBottomWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 4,
    fontSize: 18,
    fontFamily: fonts.bodyRegular,
    minHeight: 56,
    textAlignVertical: "center",
  },
  ghostBtn: {
    marginTop: 32,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  ghostBtnPressed: {
    backgroundColor: "rgba(128,128,128,0.18)",
  },
  btnText: {
    fontSize: 22,
    fontFamily: fonts.headlineExtraBold,
  },
  // Scroll wheel
  wheelContainer: {
    overflow: "hidden",
    marginVertical: 8,
  },
  wheelHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    borderRadius: 10,
    zIndex: 0,
  },
  wheelItem: {
    justifyContent: "center",
    alignItems: "center",
  },
  wheelText: {
    fontFamily: fonts.bodySemiBold,
  },
  // Time
  timeBtn: {
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  timeBtnLabel: { fontSize: 15, fontFamily: fonts.bodyRegular },
  timeBtnValue: { fontSize: 18, fontFamily: fonts.bodySemiBold },
  toggleChip: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  toggleChipText: { fontSize: 15, fontFamily: fonts.bodySemiBold },
  // Permission warning
  permWarning: {
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  permWarningText: {
    fontSize: 14,
    fontFamily: fonts.bodyRegular,
    lineHeight: 20,
    textAlign: "center",
  },
  // Done
  doneTitle: {
    fontSize: 28,
    fontFamily: fonts.headlineExtraBold,
    textAlign: "center",
    marginBottom: 24,
  },
  summary: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  summaryTier: {
    fontSize: 17,
    fontFamily: fonts.bodyMedium,
    paddingVertical: 4,
    textAlign: "center",
  },
  summaryArrow: {
    fontSize: 16,
  },
});
