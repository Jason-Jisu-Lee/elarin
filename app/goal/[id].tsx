import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRouter, useLocalSearchParams } from "expo-router";
import { colors } from "../../src/constants";
import { Goal } from "../../src/types";
import { getGoals, updateGoal, deleteGoal } from "../../src/storage";
import {
  scheduleGoalNotifications,
  cancelGoalNotifications,
} from "../../src/notifications";

export default function GoalDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [editing, setEditing] = useState(false);

  // Edit state
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [primary, setPrimary] = useState("");
  const [easier, setEasier] = useState("");
  const [easiest, setEasiest] = useState("");
  const [reminderType, setReminderType] = useState<"window" | "exact">(
    "window",
  );
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("20:00");
  const [remindersPerDay, setRemindersPerDay] = useState(2);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editingField, setEditingField] = useState<"start" | "end">("start");

  useEffect(() => {
    if (!id) return;
    getGoals().then((goals) => {
      const g = goals.find((g) => g.id === id);
      if (g) {
        setGoal(g);
        populateEdit(g);
      }
    });
  }, [id]);

  const populateEdit = (g: Goal) => {
    setName(g.name);
    setEmoji(g.emoji);
    setPrimary(g.tiers.primary);
    setEasier(g.tiers.easier);
    setEasiest(g.tiers.easiest);
    setReminderType(g.reminder.type);
    setStartTime(g.reminder.startTime);
    setEndTime(g.reminder.endTime || "20:00");
    setRemindersPerDay(g.reminder.remindersPerDay);
  };

  const formatTime = (timeStr: string): string => {
    const [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const timeToDate = (timeStr: string): Date => {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
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

  const handleSave = async () => {
    if (
      !goal ||
      !name.trim() ||
      !primary.trim() ||
      !easier.trim() ||
      !easiest.trim()
    ) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }

    const updated: Goal = {
      ...goal,
      name: name.trim(),
      emoji,
      tiers: {
        primary: primary.trim(),
        easier: easier.trim(),
        easiest: easiest.trim(),
      },
      reminder: {
        type: reminderType,
        startTime,
        endTime: reminderType === "window" ? endTime : undefined,
        remindersPerDay,
        activeDays: goal.reminder.activeDays,
        frequency: goal.reminder.frequency,
      },
    };

    await updateGoal(updated);
    await scheduleGoalNotifications(updated);
    setGoal(updated);
    setEditing(false);
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert("Delete goal?", "This can't be undone.", [
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

  if (!goal) return null;

  if (editing) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.editContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => {
              setEditing(false);
              populateEdit(goal);
            }}
          >
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.editLabel}>Goal Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            maxLength={50}
          />

          <Text style={styles.editLabel}>Emoji</Text>
          <TextInput
            style={[styles.input, styles.emojiInput]}
            value={emoji}
            onChangeText={(t) => setEmoji(t.slice(-2))}
            maxLength={2}
          />

          <Text style={styles.editLabel}>Your Goal</Text>
          <TextInput
            style={styles.input}
            value={primary}
            onChangeText={setPrimary}
            maxLength={100}
          />

          <Text style={styles.editLabel}>Easier Version</Text>
          <TextInput
            style={styles.input}
            value={easier}
            onChangeText={setEasier}
            maxLength={100}
          />

          <Text style={styles.editLabel}>Easiest Version</Text>
          <TextInput
            style={styles.input}
            value={easiest}
            onChangeText={setEasiest}
            maxLength={100}
          />

          <Text style={styles.editLabel}>Reminder Type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[
                styles.typeChip,
                reminderType === "window" && styles.typeChipActive,
              ]}
              onPress={() => setReminderType("window")}
            >
              <Text
                style={[
                  styles.typeChipText,
                  reminderType === "window" && styles.typeChipTextActive,
                ]}
              >
                Window
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeChip,
                reminderType === "exact" && styles.typeChipActive,
              ]}
              onPress={() => setReminderType("exact")}
            >
              <Text
                style={[
                  styles.typeChipText,
                  reminderType === "exact" && styles.typeChipTextActive,
                ]}
              >
                Exact
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.timeBtn}
            onPress={() => {
              setEditingField("start");
              setPickerVisible(true);
            }}
          >
            <Text style={styles.timeBtnLabel}>
              {reminderType === "window" ? "From" : "At"}
            </Text>
            <Text style={styles.timeBtnValue}>{formatTime(startTime)}</Text>
          </TouchableOpacity>

          {reminderType === "window" && (
            <TouchableOpacity
              style={styles.timeBtn}
              onPress={() => {
                setEditingField("end");
                setPickerVisible(true);
              }}
            >
              <Text style={styles.timeBtnLabel}>To</Text>
              <Text style={styles.timeBtnValue}>{formatTime(endTime)}</Text>
            </TouchableOpacity>
          )}

          {pickerVisible && (
            <DateTimePicker
              mode="time"
              value={timeToDate(editingField === "start" ? startTime : endTime)}
              onChange={onTimePickerChange}
              is24Hour={false}
              display={Platform.OS === "ios" ? "spinner" : "default"}
            />
          )}

          <Text style={styles.editLabel}>Reminders per day</Text>
          <View style={styles.typeRow}>
            {[1, 2, 3].map((n) => (
              <TouchableOpacity
                key={n}
                style={[
                  styles.typeChip,
                  remindersPerDay === n && styles.typeChipActive,
                ]}
                onPress={() => setRemindersPerDay(n)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    remindersPerDay === n && styles.typeChipTextActive,
                  ]}
                >
                  {n}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // View mode
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>

        {/* Goal header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>{goal.emoji}</Text>
          <Text style={styles.headerName}>{goal.name}</Text>
        </View>

        {/* 3-Tier Ladder */}
        <TouchableOpacity
          style={styles.tierCard}
          onPress={() => setEditing(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.tierLabel}>Your Goal</Text>
          <Text style={styles.tierText}>{goal.tiers.primary}</Text>
        </TouchableOpacity>

        <Text style={styles.arrow}>↓ easier</Text>

        <TouchableOpacity
          style={styles.tierCard}
          onPress={() => setEditing(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.tierLabel}>Easier</Text>
          <Text style={styles.tierText}>{goal.tiers.easier}</Text>
        </TouchableOpacity>

        <Text style={styles.arrow}>↓ easiest</Text>

        <TouchableOpacity
          style={styles.tierCard}
          onPress={() => setEditing(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.tierLabel}>Easiest</Text>
          <Text style={styles.tierText}>{goal.tiers.easiest}</Text>
        </TouchableOpacity>

        {/* Reminder info */}
        <View style={styles.reminderInfo}>
          <Text style={styles.reminderLabel}>Reminder</Text>
          <Text style={styles.reminderValue}>
            {goal.reminder.type === "exact"
              ? formatTime(goal.reminder.startTime)
              : `${formatTime(goal.reminder.startTime)} – ${formatTime(goal.reminder.endTime || goal.reminder.startTime)}`}
            {" · "}
            {goal.reminder.remindersPerDay}x/day
          </Text>
        </View>

        {/* Delete */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete Goal</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 56,
  },
  backBtn: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: "600",
    marginBottom: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerName: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
  },
  tierCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  tierText: {
    fontSize: 18,
    fontWeight: "500",
    color: colors.text,
  },
  arrow: {
    textAlign: "center",
    fontSize: 14,
    color: colors.textMuted,
    paddingVertical: 8,
  },
  reminderInfo: {
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
  },
  reminderLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  reminderValue: {
    fontSize: 16,
    color: colors.text,
  },
  deleteBtn: {
    marginTop: 32,
    paddingVertical: 16,
    alignItems: "center",
  },
  deleteBtnText: {
    fontSize: 16,
    color: "#E53E3E",
    fontWeight: "600",
  },
  // Edit mode
  editContent: {
    padding: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  cancelBtn: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: "600",
    marginBottom: 24,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  emojiInput: {
    fontSize: 28,
    textAlign: "center",
    width: 60,
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.muted,
  },
  typeChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
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
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.muted,
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
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "600",
  },
});
