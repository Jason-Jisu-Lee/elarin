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
import { LinearGradient } from "expo-linear-gradient";
import { PRE_BUILT_GOALS } from "../src/constants";
import { Goal } from "../src/types";
import { addGoal } from "../src/storage";
import {
  scheduleGoalNotifications,
  setupNotifications,
} from "../src/notifications";
import { useTheme, fonts } from "../src/theme";

type Step = "goal" | "easier" | "easiest" | "time" | "permission" | "done";

export default function CreateGoal() {
  const router = useRouter();
  const { colors } = useTheme();
  const { prebuilt } = useLocalSearchParams<{ prebuilt?: string }>();

  const prebuiltGoal =
    prebuilt !== undefined ? PRE_BUILT_GOALS[Number(prebuilt)] : null;

  const [name, setName] = useState(prebuiltGoal?.name ?? "");
  const [primary, setPrimary] = useState(prebuiltGoal?.tiers.primary ?? "");
  const [easier, setEasier] = useState(prebuiltGoal?.tiers.easier ?? "");
  const [easiest, setEasiest] = useState(prebuiltGoal?.tiers.easiest ?? "");
  const [startTime, setStartTime] = useState(
    prebuiltGoal?.reminder.startTime ?? "17:00",
  );

  const [step, setStep] = useState<Step>(prebuiltGoal ? "time" : "goal");
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
        easiest: easiest.trim(),
      },
      reminder: {
        type: "exact",
        startTime,
        remindersPerDay: 1,
        activeDays: [],
        frequency: "daily",
      },
      createdAt: Date.now(),
    };
    await addGoal(goal);
    await scheduleGoalNotifications(goal);
    router.replace("/home");
  };

  const handlePermission = async () => {
    await setupNotifications();
    transition("done");
  };

  const GradientButton = ({
    label,
    onPress,
  }: {
    label: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.btnWrap}
    >
      <LinearGradient
        colors={[colors.primary, colors.primaryContainer]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBtn}
      >
        <Text style={[styles.btnText, { color: colors.onPrimary }]}>
          {label}
        </Text>
      </LinearGradient>
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
              What do you want to do?
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
              placeholder="Give it a name"
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
              placeholder="Your ideal goal"
              placeholderTextColor={colors.outlineVariant}
              maxLength={100}
            />
            {name.trim() && primary.trim() && (
              <GradientButton
                label="Next"
                onPress={() => transition("easier")}
              />
            )}
          </View>
        )}

        {step === "easier" && (
          <View style={styles.stepContainer}>
            <Text style={[styles.question, { color: colors.onSurface }]}>
              What's an easier version?
            </Text>
            <Text style={[styles.context, { color: colors.primary }]}>
              Your goal: {primary}
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
              placeholder="e.g., 1 min walk outside"
              placeholderTextColor={colors.outlineVariant}
              autoFocus
              maxLength={100}
            />
            {easier.trim() && (
              <GradientButton
                label="Next"
                onPress={() => transition("easiest")}
              />
            )}
          </View>
        )}

        {step === "easiest" && (
          <View style={styles.stepContainer}>
            <Text style={[styles.question, { color: colors.onSurface }]}>
              What's the easiest version?
            </Text>
            <Text
              style={[styles.subQuestion, { color: colors.onSurfaceVariant }]}
            >
              Something you'd do even on your worst day.
            </Text>
            <Text style={[styles.context, { color: colors.primary }]}>
              Easier: {easier}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.onSurface,
                  borderBottomColor: colors.surfaceVariant,
                },
              ]}
              value={easiest}
              onChangeText={setEasiest}
              placeholder="e.g., 1 min walk in your room"
              placeholderTextColor={colors.outlineVariant}
              autoFocus
              maxLength={100}
            />
            {easiest.trim() && (
              <GradientButton label="Next" onPress={() => transition("time")} />
            )}
          </View>
        )}

        {step === "time" && (
          <View style={styles.stepContainer}>
            <Text style={[styles.question, { color: colors.onSurface }]}>
              When should we remind you?
            </Text>
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
            {pickerVisible && (
              <DateTimePicker
                mode="time"
                value={timeToDate(startTime)}
                onChange={onTimePickerChange}
                is24Hour={false}
                display={Platform.OS === "ios" ? "spinner" : "default"}
              />
            )}
            <GradientButton
              label="Next"
              onPress={() => transition("permission")}
            />
          </View>
        )}

        {step === "permission" && (
          <View style={styles.stepContainer}>
            <Text style={[styles.question, { color: colors.onSurface }]}>
              One more thing
            </Text>
            <Text
              style={[
                styles.permissionText,
                { color: colors.onSurfaceVariant },
              ]}
            >
              We'll send you a reminder at your chosen time. Once you've done
              it, we stop for the day.
            </Text>
            <GradientButton
              label="Allow Notifications"
              onPress={handlePermission}
            />
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
              <Text
                style={[styles.summaryArrow, { color: colors.outlineVariant }]}
              >
                ↓
              </Text>
              <Text style={[styles.summaryTier, { color: colors.onSurface }]}>
                {easiest}
              </Text>
            </View>
            <GradientButton label="Let's go" onPress={handleFinish} />
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
  subQuestion: {
    fontSize: 16,
    fontFamily: fonts.bodyRegular,
    marginBottom: 12,
  },
  context: {
    fontSize: 14,
    fontFamily: fonts.bodyItalic,
    marginBottom: 20,
  },
  input: {
    borderBottomWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 4,
    fontSize: 20,
    fontFamily: fonts.bodyRegular,
  },
  btnWrap: { marginTop: 28 },
  gradientBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnText: { fontSize: 18, fontFamily: fonts.headlineBold },
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
  permissionText: {
    fontSize: 17,
    fontFamily: fonts.bodyRegular,
    lineHeight: 26,
    marginTop: 8,
    marginBottom: 8,
  },
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
