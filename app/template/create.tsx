import { useState, useEffect } from "react";
import {
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Goal } from "../../src/types";
import { addGoal, updateGoal, deleteGoal, getGoals } from "../../src/storage";
import {
  scheduleGoalNotifications,
  cancelGoalNotifications,
} from "../../src/notifications";
import { useTheme, fonts } from "../../src/theme";

export default function EditGoal() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("");
  const [easier, setEasier] = useState("");
  const [easiest, setEasiest] = useState("");
  const [startTime, setStartTime] = useState("17:00");
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    if (id) {
      getGoals().then((goals) => {
        const g = goals.find((g) => g.id === id);
        if (g) {
          setName(g.name);
          setPrimary(g.tiers.primary);
          setEasier(g.tiers.easier);
          setEasiest(g.tiers.easiest);
          setStartTime(g.reminder.startTime);
        }
      });
    }
  }, [id]);

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

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Give your goal a name.");
      return;
    }
    if (!primary.trim() || !easier.trim() || !easiest.trim()) {
      Alert.alert(
        "All tiers required",
        "Fill in all three versions of your goal.",
      );
      return;
    }

    const goal: Goal = {
      id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
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
        notificationsEnabled: true,
      },
      createdAt: Date.now(),
    };

    if (isEditing) await updateGoal(goal);
    else await addGoal(goal);

    await scheduleGoalNotifications(goal);
    router.back();
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert("Delete goal?", "This will cancel all scheduled reminders.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await cancelGoalNotifications(id);
          await deleteGoal(id);
          router.back();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: colors.onSurface }]}>
          Goal Name
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
          placeholder="e.g., Daily Walk"
          placeholderTextColor={colors.outlineVariant}
          maxLength={50}
        />

        <Text style={[styles.hint, { color: colors.onSurfaceVariant }]}>
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
          value={primary}
          onChangeText={setPrimary}
          placeholder="e.g., 15 min walk outside"
          placeholderTextColor={colors.outlineVariant}
          maxLength={100}
        />

        <Text style={[styles.hint, { color: colors.onSurfaceVariant }]}>
          What's an easier version?
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
          maxLength={100}
        />

        <Text style={[styles.hint, { color: colors.onSurfaceVariant }]}>
          Something you'd do even on your worst day.
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
          maxLength={100}
        />

        <Text style={[styles.label, { color: colors.onSurface }]}>
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
            style={[styles.timeBtnLabel, { color: colors.onSurfaceVariant }]}
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

        <TouchableOpacity onPress={handleSave} activeOpacity={0.8}>
          <LinearGradient
            colors={[colors.primary, colors.primaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveBtn}
          >
            <Text style={[styles.saveBtnText, { color: colors.onPrimary }]}>
              {isEditing ? "Save Changes" : "Create Goal"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.error }]}
            onPress={handleDelete}
          >
            <Text style={[styles.deleteBtnText, { color: colors.error }]}>
              Delete
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  label: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
    marginTop: 20,
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderBottomWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 4,
    fontSize: 17,
    fontFamily: fonts.bodyRegular,
    marginBottom: 4,
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
  saveBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 32,
  },
  saveBtnText: { fontSize: 18, fontFamily: fonts.headlineBold },
  deleteBtn: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 16,
  },
  deleteBtnText: { fontSize: 16, fontFamily: fonts.bodySemiBold },
});
