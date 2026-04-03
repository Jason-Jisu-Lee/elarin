import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRouter, useLocalSearchParams } from "expo-router";
import { PRE_BUILT_GOALS } from "../src/constants";
import { Goal } from "../src/types";
import { addGoal } from "../src/storage";
import {
  scheduleGoalNotifications,
  setupNotifications,
} from "../src/notifications";
import { useTheme, fonts } from "../src/theme";

type Step = "goal" | "easier" | "time" | "done";

const FREQUENCY_OPTIONS = [
  { value: "daily" as const, label: "Daily" },
  { value: "every_other_day" as const, label: "Every 2 days" },
  { value: "every_3_days" as const, label: "Every 3 days" },
  { value: "weekly" as const, label: "Weekly" },
  { value: "every_2_weeks" as const, label: "Biweekly" },
  { value: "monthly" as const, label: "Monthly" },
] as const;

export default function CreateGoal() {
  const router = useRouter();
  const { colors } = useTheme();
  const { prebuilt, onboarding } = useLocalSearchParams<{ prebuilt?: string; onboarding?: string }>();
  const isOnboarding = onboarding === "1";

  const prebuiltGoal =
    prebuilt !== undefined ? PRE_BUILT_GOALS[Number(prebuilt)] : null;

  const [name, setName] = useState(prebuiltGoal?.name ?? "");
  const [primary, setPrimary] = useState(prebuiltGoal?.tiers.primary ?? "");
  const [easier, setEasier] = useState(prebuiltGoal?.tiers.easier ?? "");
  const [easiest, setEasiest] = useState(prebuiltGoal?.tiers.easiest ?? "");
  const [showEasiest, setShowEasiest] = useState(
    prebuiltGoal ? !!prebuiltGoal.tiers.easiest : false,
  );
  const [startTime, setStartTime] = useState(
    prebuiltGoal?.reminder.startTime ?? "17:00",
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [frequency, setFrequency] = useState<
    | "daily"
    | "every_other_day"
    | "every_3_days"
    | "weekly"
    | "every_2_weeks"
    | "monthly"
  >(prebuiltGoal?.reminder.frequency ?? "daily");

  const [step, setStep] = useState<Step>("goal");
  const [fadeAnim] = useState(new Animated.Value(1));
  const [pickerVisible, setPickerVisible] = useState(false);

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
        easier: easier.trim(),
        easiest: easiest.trim() || easier.trim(),
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
      await setupNotifications();
      await scheduleGoalNotifications(goal);
    }
    router.replace(isOnboarding ? "/theme-select" : "/home");
  };

  const PlainButton = ({
    label,
    onPress,
    disabled,
  }: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.5}
      style={styles.plainBtnWrap}
      disabled={disabled}
    >
      <Text
        style={[
          styles.plainBtnText,
          { color: disabled ? colors.outlineVariant : colors.onSurface },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {step === "goal" && (
          <View style={styles.stepContainer}>
            <Text style={[styles.question, { color: colors.onSurface }]}>
              Your goal
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
              placeholder="Name"
              placeholderTextColor={colors.outlineVariant}
              autoFocus
              maxLength={50}
            />
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.onSurface,
                  borderBottomColor: colors.surfaceVariant,
                  marginTop: 24,
                },
              ]}
              value={primary}
              onChangeText={setPrimary}
              placeholder="What you want to do"
              placeholderTextColor={colors.outlineVariant}
              maxLength={100}
            />
            {name.trim() && primary.trim() ? (
              <PlainButton
                label="Next"
                onPress={() => transition("easier")}
              />
            ) : null}
          </View>
        )}

        {step === "easier" && (
          <View style={styles.stepContainer}>
            <Text style={[styles.question, { color: colors.onSurface }]}>
              Easier version
            </Text>
            <Text style={[styles.hint, { color: colors.onSurfaceVariant }]}>
              If your goal feels too hard, what's a lighter version?
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.onSurface,
                  borderBottomColor: colors.surfaceVariant,
                },
              ]}
              value={easier}
              onChangeText={setEasier}
              placeholder="e.g., 5 minutes instead of 30"
              placeholderTextColor={colors.outlineVariant}
              autoFocus
              maxLength={100}
            />
            {easier.trim() && !showEasiest ? (
              <TouchableOpacity
                onPress={() => setShowEasiest(true)}
                activeOpacity={0.5}
                style={styles.addMoreWrap}
              >
                <Text
                  style={[styles.addMoreText, { color: colors.primary }]}
                >
                  + Add an even easier version
                </Text>
              </TouchableOpacity>
            ) : null}
            {showEasiest && (
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.onSurface,
                    borderBottomColor: colors.surfaceVariant,
                    marginTop: 20,
                  },
                ]}
                value={easiest}
                onChangeText={setEasiest}
                placeholder="The absolute easiest version"
                placeholderTextColor={colors.outlineVariant}
                autoFocus
                maxLength={100}
              />
            )}
            {easier.trim() ? (
              <PlainButton
                label="Next"
                onPress={() => transition("time")}
              />
            ) : null}
          </View>
        )}

        {step === "time" && (
          <View style={styles.stepContainer}>
            <Text style={[styles.question, { color: colors.onSurface }]}>
              Notification
            </Text>

            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleChip,
                  {
                    backgroundColor: notificationsEnabled
                      ? colors.primary
                      : colors.surfaceContainerHigh,
                  },
                ]}
                onPress={() => setNotificationsEnabled(true)}
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
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleChip,
                  {
                    backgroundColor: !notificationsEnabled
                      ? colors.primary
                      : colors.surfaceContainerHigh,
                  },
                ]}
                onPress={() => setNotificationsEnabled(false)}
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
              </TouchableOpacity>
            </View>

            {notificationsEnabled && (
              <TouchableOpacity
                style={[
                  styles.timeBtn,
                  { backgroundColor: colors.surfaceContainerHigh },
                ]}
                onPress={() => setPickerVisible(true)}
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
              </TouchableOpacity>
            )}
            {notificationsEnabled && pickerVisible && (
              <DateTimePicker
                mode="time"
                value={timeToDate(startTime)}
                onChange={onTimePickerChange}
                is24Hour={false}
                display={Platform.OS === "ios" ? "spinner" : "default"}
              />
            )}

            <Text
              style={[styles.freqLabel, { color: colors.onSurfaceVariant }]}
            >
              How often?
            </Text>
            <View style={styles.freqRow}>
              {FREQUENCY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.freqChip,
                    {
                      backgroundColor:
                        frequency === opt.value
                          ? colors.primary
                          : colors.surfaceContainerHigh,
                    },
                  ]}
                  onPress={() => setFrequency(opt.value)}
                >
                  <Text
                    style={[
                      styles.freqChipText,
                      {
                        color:
                          frequency === opt.value
                            ? colors.onPrimary
                            : colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <PlainButton label="Confirm" onPress={() => transition("done")} />
          </View>
        )}

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
              <Text
                style={[styles.summaryArrow, { color: colors.outlineVariant }]}
              >
                ↓
              </Text>
              <Text style={[styles.summaryTier, { color: colors.onSurface }]}>
                {easier}
              </Text>
              {easiest.trim() && easiest.trim() !== easier.trim() ? (
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
                    {easiest}
                  </Text>
                </>
              ) : null}
            </View>
            <PlainButton label="Let's go" onPress={handleFinish} />
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
  question: {
    fontSize: 28,
    fontFamily: fonts.headlineExtraBold,
    marginBottom: 8,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  hint: {
    fontSize: 15,
    fontFamily: fonts.bodyRegular,
    marginBottom: 16,
    lineHeight: 22,
  },
  input: {
    borderBottomWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 4,
    fontSize: 20,
    fontFamily: fonts.bodyRegular,
  },
  plainBtnWrap: {
    marginTop: 32,
    alignSelf: "center",
  },
  plainBtnText: {
    fontSize: 20,
    fontFamily: fonts.headlineExtraBold,
  },
  addMoreWrap: {
    marginTop: 16,
  },
  addMoreText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
  },
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
  toggleRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  toggleChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  toggleChipText: { fontSize: 15, fontFamily: fonts.bodySemiBold },
  freqLabel: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    marginTop: 20,
    marginBottom: 10,
  },
  freqRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  freqChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  freqChipText: { fontSize: 13, fontFamily: fonts.bodySemiBold },
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
  },
  summaryArrow: {
    fontSize: 16,
  },
});
