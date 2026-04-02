import { useState, useEffect } from "react";
import {
  View,
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
import { colors, PRE_BUILT_GOALS } from "../../src/constants";
import { Goal } from "../../src/types";
import { addGoal, updateGoal, deleteGoal, getGoals } from "../../src/storage";
import {
  scheduleGoalNotifications,
  cancelGoalNotifications,
} from "../../src/notifications";

// This file kept for backwards compat — redirects handled in create.tsx at root
// But still used for editing existing goals via /template/create?id=xxx

export default function EditGoal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("");
  const [easier, setEasier] = useState("");
  const [easiest, setEasiest] = useState("");
  const [reminderType, setReminderType] = useState<"window" | "exact">(
    "exact",
  );
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("20:00");
  const [remindersPerDay, setRemindersPerDay] = useState(2);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [editingField, setEditingField] = useState<"start" | "end">("start");

  useEffect(() => {
    if (id) {
      getGoals().then((goals) => {
        const g = goals.find((g) => g.id === id);
        if (g) {
          setName(g.name);
          setPrimary(g.tiers.primary);
          setEasier(g.tiers.easier);
          setEasiest(g.tiers.easiest);
          setReminderType(g.reminder.type);
          setStartTime(g.reminder.startTime);
          setEndTime(g.reminder.endTime || "20:00");
          setRemindersPerDay(g.reminder.remindersPerDay);
        }
      });
    }
  }, [id]);

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
      },
      createdAt: Date.now(),
    };

    if (isEditing) {
      await updateGoal(goal);
    } else {
      await addGoal(goal);
    }

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
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <Text style={styles.label}>Goal Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Daily Walk"
          placeholderTextColor={colors.textMuted}
          maxLength={50}
        />

        {/* 3-Tier Ladder */}
        <Text style={styles.hint}>What do you want to do?</Text>
        <TextInput
          style={styles.input}
          value={primary}
          onChangeText={setPrimary}
          placeholder="e.g., 15 min walk outside"
          placeholderTextColor={colors.textMuted}
          maxLength={100}
        />

        <Text style={styles.hint}>What's an easier version?</Text>
        <TextInput
          style={styles.input}
          value={easier}
          onChangeText={setEasier}
          placeholder="e.g., 1 min walk outside"
          placeholderTextColor={colors.textMuted}
          maxLength={100}
        />

        <Text style={styles.hint}>
          Something you'd do even on your worst day.
        </Text>
        <TextInput
          style={styles.input}
          value={easiest}
          onChangeText={setEasiest}
          placeholder="e.g., 1 min walk in your room"
          placeholderTextColor={colors.textMuted}
          maxLength={100}
        />

        {/* Reminder Config */}
        <Text style={styles.label}>When should we remind you?</Text>

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

        {/* Save */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>
            {isEditing ? "Save Changes" : "Create Goal"}
          </Text>
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginTop: 20,
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  emojiInput: {
    fontSize: 28,
    textAlign: "center",
    width: 70,
    paddingVertical: 8,
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  typeChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  typeChipActive: {
    backgroundColor: colors.accent,
  },
  typeChipText: {
    fontSize: 14,
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
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 32,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "600",
  },
  deleteBtn: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 12,
  },
  deleteBtnText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
});
