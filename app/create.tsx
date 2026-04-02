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
import { colors, PRE_BUILT_GOALS } from "../src/constants";
import { Goal } from "../src/types";
import { addGoal } from "../src/storage";
import { scheduleGoalNotifications } from "../src/notifications";
import { setupNotifications } from "../src/notifications";

type Step = "goal" | "easier" | "easiest" | "time" | "permission" | "done";

export default function CreateGoal() {
  const router = useRouter();
  const { prebuilt } = useLocalSearchParams<{ prebuilt?: string }>();

  const prebuiltGoal =
    prebuilt !== undefined ? PRE_BUILT_GOALS[Number(prebuilt)] : null;

  const [name, setName] = useState(prebuiltGoal?.name ?? "");
  const [primary, setPrimary] = useState(prebuiltGoal?.tiers.primary ?? "");
  const [easier, setEasier] = useState(prebuiltGoal?.tiers.easier ?? "");
  const [easiest, setEasiest] = useState(prebuiltGoal?.tiers.easiest ?? "");
  const [reminderType, setReminderType] = useState<"window" | "exact">(
    "exact",
  );
  const [startTime, setStartTime] = useState(
    prebuiltGoal?.reminder.startTime ?? "17:00",
  );
  const [endTime, setEndTime] = useState(
    prebuiltGoal?.reminder.endTime ?? "20:00",
  );

  const [step, setStep] = useState<Step>(prebuiltGoal ? "time" : "goal");
  const [fadeAnim] = useState(new Animated.Value(1));
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editingField, setEditingField] = useState<"start" | "end">("start");

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

  const openTimePicker = (field: "start" | "end") => {
    setEditingField(field);
    setPickerVisible(true);
  };

  const onTimePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setPickerVisible(false);
    if (event.type === "dismissed" || !date) return;
    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");
    const time = `${h}:${m}`;
    if (editingField === "start") setStartTime(time);
    else setEndTime(time);
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Step 1: What do you want to do? */}
        {step === "goal" && (
          <View style={styles.stepContainer}>
            <Text style={styles.question}>What do you want to do?</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Give it a name (e.g., Daily Walk)"
              placeholderTextColor={colors.textMuted}
              autoFocus
              maxLength={50}
            />
            <TextInput
              style={[styles.input, { marginTop: 12 }]}
              value={primary}
              onChangeText={setPrimary}
              placeholder="Your goal (e.g., 15 min walk outside)"
              placeholderTextColor={colors.textMuted}
              maxLength={100}
            />
            {name.trim() && primary.trim() && (
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={() => transition("easier")}
              >
                <Text style={styles.nextBtnText}>Next</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Step 2: Easier version */}
        {step === "easier" && (
          <View style={styles.stepContainer}>
            <Text style={styles.question}>What's an easier version?</Text>
            <Text style={styles.context}>Your goal: {primary}</Text>
            <TextInput
              style={styles.input}
              value={easier}
              onChangeText={setEasier}
              placeholder="e.g., 1 min walk outside"
              placeholderTextColor={colors.textMuted}
              autoFocus
              maxLength={100}
            />
            {easier.trim() && (
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={() => transition("easiest")}
              >
                <Text style={styles.nextBtnText}>Next</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Step 3: Easiest version */}
        {step === "easiest" && (
          <View style={styles.stepContainer}>
            <Text style={styles.question}>What's the easiest version?</Text>
            <Text style={styles.subQuestion}>
              Something you'd do even on your worst day.
            </Text>
            <Text style={styles.context}>Easier: {easier}</Text>
            <TextInput
              style={styles.input}
              value={easiest}
              onChangeText={setEasiest}
              placeholder="e.g., 1 min walk in your room"
              placeholderTextColor={colors.textMuted}
              autoFocus
              maxLength={100}
            />
            {easiest.trim() && (
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={() => transition("time")}
              >
                <Text style={styles.nextBtnText}>Next</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Step 4: Time */}
        {step === "time" && (
          <View style={styles.stepContainer}>
            <Text style={styles.question}>When should we remind you?</Text>

            <TouchableOpacity
              style={styles.timeBtn}
              onPress={() => openTimePicker("start")}
            >
              <Text style={styles.timeBtnLabel}>At</Text>
              <Text style={styles.timeBtnValue}>{formatTime(startTime)}</Text>
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

            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => transition("permission")}
            >
              <Text style={styles.nextBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 5: Permission */}
        {step === "permission" && (
          <View style={styles.stepContainer}>
            <Text style={styles.question}>One more thing</Text>
            <Text style={styles.permissionText}>
              We'll send you a reminder at your chosen time. Once you've done it, we stop
              for the day.
            </Text>
            <TouchableOpacity style={styles.nextBtn} onPress={handlePermission}>
              <Text style={styles.nextBtnText}>Allow Notifications</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 6: Done */}
        {step === "done" && (
          <View style={styles.stepContainer}>
            <Text style={styles.doneTitle}>{name}</Text>
            <View style={styles.summary}>
              <Text style={styles.summaryTier}>{primary}</Text>
              <Text style={styles.summaryArrow}>↓</Text>
              <Text style={styles.summaryTier}>{easier}</Text>
              <Text style={styles.summaryArrow}>↓</Text>
              <Text style={styles.summaryTier}>{easiest}</Text>
            </View>
            <TouchableOpacity style={styles.doneBtn} onPress={handleFinish}>
              <Text style={styles.doneBtnText}>Let's go</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  stepContainer: {
    alignItems: "stretch",
  },
  question: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    lineHeight: 36,
  },
  subQuestion: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 12,
  },
  context: {
    fontSize: 14,
    color: colors.accent,
    marginBottom: 20,
    fontStyle: "italic",
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 18,
    fontSize: 18,
    color: colors.text,
  },
  nextBtn: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  nextBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "600",
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    marginBottom: 16,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  typeChipActive: {
    backgroundColor: colors.accent,
  },
  typeChipText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textMuted,
  },
  typeChipTextActive: {
    color: colors.white,
  },
  timeBtn: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  timeBtnLabel: {
    fontSize: 15,
    color: colors.textMuted,
  },
  timeBtnValue: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.accent,
  },
  permissionText: {
    fontSize: 17,
    color: colors.textMuted,
    lineHeight: 26,
    marginTop: 8,
    marginBottom: 8,
  },
  emoji: {
    fontSize: 48,
    textAlign: "center",
    marginBottom: 12,
  },
  doneTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: 24,
  },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 8,
  },
  summaryTier: {
    fontSize: 17,
    color: colors.text,
    fontWeight: "500",
    paddingVertical: 4,
  },
  summaryArrow: {
    fontSize: 16,
    color: colors.textMuted,
  },
  doneBtn: {
    backgroundColor: colors.doItGreen,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  doneBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
});
