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
import {
  colors,
  CATEGORY_LIST,
  CATEGORY_LABELS,
  EXAMPLE_LADDERS,
} from "../../src/constants";
import { Template, GoalCategory } from "../../src/types";
import {
  addTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplates,
} from "../../src/storage";
import {
  scheduleTemplateNotifications,
  cancelTemplateNotifications,
} from "../../src/notifications";

export default function CreateTemplate() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [name, setName] = useState("");
  const [category, setCategory] = useState<GoalCategory>("fitness");
  const [steps, setSteps] = useState<string[]>(["", "", "", ""]);
  const [times, setTimes] = useState<string[]>(["09:00"]);
  const [activeDays, setActiveDays] = useState<number[]>([]);

  // Load existing template if editing
  useEffect(() => {
    if (id) {
      getTemplates().then((templates) => {
        const t = templates.find((t) => t.id === id);
        if (t) {
          setName(t.name);
          setCategory(t.category);
          setSteps(t.ladder.steps);
          setTimes(t.schedule.times);
          setActiveDays(t.schedule.activeDays);
        }
      });
    }
  }, [id]);

  const updateStep = (index: number, value: string) => {
    const next = [...steps];
    next[index] = value;
    setSteps(next);
  };

  const addStep = () => setSteps([...steps, ""]);

  const removeStep = (index: number) => {
    if (steps.length <= 2) return; // minimum 2 steps
    setSteps(steps.filter((_, i) => i !== index));
  };

  const loadExample = (key: string) => {
    const ladder = EXAMPLE_LADDERS[key];
    if (ladder) {
      setSteps([...ladder]);
      setName(key);
    }
  };

  const [pickerVisible, setPickerVisible] = useState(false);
  const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null);

  const addTime = () => {
    setTimes([...times, "12:00"]);
    setEditingTimeIndex(times.length);
    setPickerVisible(true);
  };

  const openTimePicker = (index: number) => {
    setEditingTimeIndex(index);
    setPickerVisible(true);
  };

  const onTimePickerChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") setPickerVisible(false);
    if (
      event.type === "dismissed" ||
      !selectedDate ||
      editingTimeIndex === null
    )
      return;
    const h = selectedDate.getHours().toString().padStart(2, "0");
    const m = selectedDate.getMinutes().toString().padStart(2, "0");
    const next = [...times];
    next[editingTimeIndex] = `${h}:${m}`;
    setTimes(next);
  };

  const removeTime = (index: number) => {
    if (times.length <= 1) return;
    setTimes(times.filter((_, i) => i !== index));
  };

  /** Convert "HH:mm" to a Date for the picker */
  const timeToDate = (timeStr: string): Date => {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  };

  const toggleDay = (day: number) => {
    setActiveDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort(),
    );
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const validSteps = steps.map((s) => s.trim()).filter(Boolean);

    if (!trimmedName) {
      Alert.alert("Name required", "Give your template a name.");
      return;
    }
    if (validSteps.length < 2) {
      Alert.alert("Need more steps", "Add at least 2 steps to your ladder.");
      return;
    }

    const validTimes = times.filter((t) => /^\d{2}:\d{2}$/.test(t));
    if (validTimes.length === 0) {
      Alert.alert(
        "Schedule required",
        "Add at least one notification time (HH:mm).",
      );
      return;
    }

    const template: Template = {
      id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmedName,
      category,
      ladder: { steps: validSteps },
      schedule: { times: validTimes, activeDays },
      createdAt: Date.now(),
    };

    if (isEditing) {
      await updateTemplate(template);
    } else {
      await addTemplate(template);
    }

    await scheduleTemplateNotifications(template);
    router.back();
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      "Delete template?",
      "This will cancel all scheduled notifications.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await cancelTemplateNotifications(id);
            await deleteTemplate(id);
            router.back();
          },
        },
      ],
    );
  };

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
        <Text style={styles.label}>Template Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Morning Pushups"
          placeholderTextColor={colors.textMuted}
          maxLength={50}
        />

        {/* Category */}
        <Text style={styles.label}>Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryRow}
        >
          {CATEGORY_LIST.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                category === cat && styles.categoryChipActive,
              ]}
              onPress={() => setCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  category === cat && styles.categoryChipTextActive,
                ]}
              >
                {CATEGORY_LABELS[cat]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Example Templates */}
        <Text style={styles.label}>Quick Start</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryRow}
        >
          {Object.keys(EXAMPLE_LADDERS).map((key) => (
            <TouchableOpacity
              key={key}
              style={styles.exampleChip}
              onPress={() => loadExample(key)}
            >
              <Text style={styles.exampleChipText}>{key}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Step-Down Ladder */}
        <Text style={styles.label}>Step-Down Ladder</Text>
        <Text style={styles.hint}>Hardest at top → easiest at bottom</Text>

        {steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepNumber}>{i + 1}</Text>
              {i === 0 && <Text style={styles.stepTag}>Primary</Text>}
              {i === steps.length - 1 && (
                <Text style={styles.stepTag}>Easiest</Text>
              )}
            </View>
            <TextInput
              style={styles.stepInput}
              value={step}
              onChangeText={(v) => updateStep(i, v)}
              placeholder={
                i === 0
                  ? "Primary action (hardest)"
                  : i === steps.length - 1
                    ? "Minimum viable action"
                    : "Easier step..."
              }
              placeholderTextColor={colors.textMuted}
              maxLength={100}
            />
            {steps.length > 2 && (
              <TouchableOpacity
                onPress={() => removeStep(i)}
                style={styles.removeBtn}
              >
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.addStepBtn} onPress={addStep}>
          <Text style={styles.addStepText}>+ Add step</Text>
        </TouchableOpacity>

        {/* Schedule */}
        <Text style={styles.label}>Notification Times</Text>
        {times.map((time, i) => (
          <View key={i} style={styles.timeRow}>
            <TouchableOpacity
              style={styles.timeInput}
              onPress={() => openTimePicker(i)}
              activeOpacity={0.7}
            >
              <Text style={styles.timeDisplayText}>{time}</Text>
            </TouchableOpacity>
            {times.length > 1 && (
              <TouchableOpacity
                onPress={() => removeTime(i)}
                style={styles.removeBtn}
              >
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.addStepBtn} onPress={addTime}>
          <Text style={styles.addStepText}>+ Add time</Text>
        </TouchableOpacity>

        {pickerVisible && editingTimeIndex !== null && (
          <DateTimePicker
            mode="time"
            value={timeToDate(times[editingTimeIndex] || "12:00")}
            onChange={onTimePickerChange}
            is24Hour={false}
            display={Platform.OS === "ios" ? "spinner" : "default"}
          />
        )}

        {/* Active Days */}
        <Text style={styles.label}>Active Days</Text>
        <Text style={styles.hint}>Leave all unselected for every day</Text>
        <View style={styles.daysRow}>
          {DAY_LABELS.map((label, i) => (
            <TouchableOpacity
              key={label}
              style={[
                styles.dayChip,
                activeDays.includes(i) && styles.dayChipActive,
              ]}
              onPress={() => toggleDay(i)}
            >
              <Text
                style={[
                  styles.dayChipText,
                  activeDays.includes(i) && styles.dayChipTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>
            {isEditing ? "Save Changes" : "Create Template"}
          </Text>
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>Delete Template</Text>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
    marginTop: -4,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  categoryRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  categoryChip: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: colors.accent,
  },
  categoryChipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  categoryChipTextActive: {
    color: colors.white,
  },
  exampleChip: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  exampleChipText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "500",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  stepIndicator: {
    width: 48,
    alignItems: "center",
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accent,
  },
  stepTag: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 1,
  },
  stepInput: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  removeBtn: {
    marginLeft: 8,
    padding: 8,
  },
  removeBtnText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  addStepBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  addStepText: {
    color: colors.accent,
    fontWeight: "600",
    fontSize: 14,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  timeInput: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontVariant: ["tabular-nums"],
    justifyContent: "center",
  },
  timeDisplayText: {
    color: colors.text,
    fontSize: 16,
    fontVariant: ["tabular-nums"],
  },
  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayChip: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dayChipActive: {
    backgroundColor: colors.accent,
  },
  dayChipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  dayChipTextActive: {
    color: colors.white,
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
    fontSize: 17,
    fontWeight: "600",
  },
  deleteBtn: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 12,
  },
  deleteBtnText: {
    color: "#FF6B6B",
    fontSize: 15,
    fontWeight: "500",
  },
});
