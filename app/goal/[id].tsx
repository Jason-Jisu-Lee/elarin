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

import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Goal } from "../../src/types";
import { getGoals, updateGoal, deleteGoal } from "../../src/storage";
import {
  scheduleGoalNotifications,
  cancelGoalNotifications,
} from "../../src/notifications";
import { useTheme, fonts } from "../../src/theme";

const TIER_LABELS = ["Action", "Micro Action"] as const;

export default function GoalDetail() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("");
  const [easier, setEasier] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

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
    setPrimary(g.tiers.primary);
    setEasier(g.tiers.easier);
    setNotificationsEnabled(g.reminder.notificationsEnabled !== false);
  };

  const handleSave = async () => {
    if (!goal || !name.trim() || !primary.trim() || !easier.trim()) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    const updated: Goal = {
      ...goal,
      name: name.trim(),
      emoji: "",
      tiers: {
        primary: primary.trim(),
        easier: easier.trim(),
        easiest: easier.trim(),
      },
      reminder: {
        ...goal.reminder,
        notificationsEnabled,
      },
    };
    await updateGoal(updated);
    if (notificationsEnabled) {
      await scheduleGoalNotifications(updated);
    } else {
      await cancelGoalNotifications(updated.id);
    }
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

  // ─── Edit Mode ───
  if (editing) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.surface }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.editContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              setEditing(false);
              populateEdit(goal);
            }}
          >
            <Text style={[styles.backBtnText, { color: colors.primary }]}>
              ← Back
            </Text>
          </TouchableOpacity>

          {/* Notification toggle — top right */}
          <View style={styles.bellRow}>
            <Text
              style={[
                styles.bellIcon,
                {
                  color: notificationsEnabled
                    ? colors.primary
                    : colors.outlineVariant,
                },
              ]}
            >
              🔔
            </Text>
            <TouchableOpacity
              style={[
                styles.bellToggle,
                {
                  backgroundColor: notificationsEnabled
                    ? colors.tertiaryContainer
                    : colors.surfaceContainer,
                },
              ]}
              onPress={() => setNotificationsEnabled(!notificationsEnabled)}
            >
              <View
                style={[
                  styles.bellToggleThumb,
                  {
                    backgroundColor: notificationsEnabled
                      ? colors.onPrimary
                      : colors.outlineVariant,
                    alignSelf: notificationsEnabled ? "flex-end" : "flex-start",
                  },
                ]}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.editLabel, { color: colors.onSurfaceVariant }]}>
            Goal Name
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceContainerHigh,
                color: colors.onSurface,
              },
            ]}
            value={name}
            onChangeText={setName}
            maxLength={50}
          />

          {[
            { label: "Action", val: primary, set: setPrimary },
            { label: "Micro Action", val: easier, set: setEasier },
          ].map((tier) => (
            <View key={tier.label}>
              <Text
                style={[styles.editLabel, { color: colors.onSurfaceVariant }]}
              >
                {tier.label}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                    color: colors.onSurface,
                  },
                ]}
                value={tier.val}
                onChangeText={tier.set}
                maxLength={100}
              />
            </View>
          ))}

          <TouchableOpacity onPress={handleSave}>
            <LinearGradient
              colors={[colors.primary, colors.primaryContainer]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.saveBtn}
            >
              <Text style={[styles.saveBtnText, { color: colors.onPrimary }]}>
                Save
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── View Mode ───
  const tiers = [goal.tiers.primary, goal.tiers.easier];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backArrow, { color: colors.onSurface }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.onSurface }]}>
          {goal.name}
        </Text>
        <TouchableOpacity
          style={styles.profileBtnSmall}
          onPress={() => router.push("/profile")}
        >
          <View style={[styles.profileIcon, { borderColor: colors.onSurface }]}>
            <View
              style={[
                styles.profileHead,
                { backgroundColor: colors.onSurface },
              ]}
            />
            <View
              style={[
                styles.profileBody,
                { backgroundColor: colors.onSurface },
              ]}
            />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom + 16, 40) },
        ]}
      >
        {/* Tier cards */}
        {tiers.map((tier, i) => (
          <View key={i}>
            <TouchableOpacity
              style={[
                styles.tierCard,
                { backgroundColor: colors.surfaceContainerLowest },
              ]}
              onPress={() => setEditing(true)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.tierBadge, { color: colors.onSurfaceVariant }]}
              >
                {TIER_LABELS[i]}
              </Text>
              <Text style={[styles.tierText, { color: colors.onSurface }]}>
                {tier}
              </Text>
            </TouchableOpacity>
            {i < 1 && (
              <Text style={[styles.arrow, { color: colors.outlineVariant }]}>
                ↓
              </Text>
            )}
          </View>
        ))}

        {/* Delete */}
        <TouchableOpacity
          style={[styles.deleteBtn, { borderColor: colors.error }]}
          onPress={handleDelete}
        >
          <Text style={[styles.deleteBtnText, { color: colors.error }]}>
            DELETE
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: { padding: 8, marginRight: 8 },
  backArrow: { fontSize: 22, fontFamily: fonts.headlineBold },
  topBarTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: fonts.headlineBold,
    textAlign: "center",
  },
  profileBtnSmall: { padding: 8 },
  profileIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileHead: {
    width: 11,
    height: 11,
    borderRadius: 6,
    position: "absolute",
    top: 3,
  },
  profileBody: {
    width: 18,
    height: 11,
    borderRadius: 9,
    position: "absolute",
    bottom: -3,
  },
  scroll: { flex: 1 },
  content: { padding: 24, paddingTop: 16, paddingBottom: 40 },
  tierCard: {
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 24,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  tierBadge: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  tierText: {
    fontSize: 18,
    fontFamily: fonts.headlineBold,
  },
  arrow: {
    textAlign: "center",
    fontSize: 18,
    paddingVertical: 10,
  },
  deleteBtn: {
    marginTop: 28,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
  },
  deleteBtnText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 2,
  },
  // Edit mode
  editContent: { padding: 24, paddingTop: 56, paddingBottom: 40 },
  backBtnText: { fontSize: 16, fontFamily: fonts.bodySemiBold },
  cancelBtn: { fontSize: 16, fontFamily: fonts.bodySemiBold, marginBottom: 24 },
  bellRow: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    top: 56,
    right: 24,
    gap: 8,
  },
  bellIcon: { fontSize: 18 },
  bellToggle: {
    width: 40,
    height: 22,
    borderRadius: 11,
    padding: 2,
    justifyContent: "center",
  },
  bellToggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  editLabel: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderRadius: 14,
    padding: 16,
    fontSize: 17,
    fontFamily: fonts.bodyRegular,
  },
  saveBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  saveBtnText: { fontSize: 17, fontFamily: fonts.bodySemiBold },
});
