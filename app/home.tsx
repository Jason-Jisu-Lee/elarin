import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
  Modal,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Swipeable } from "react-native-gesture-handler";
import { colors, MICROCOPY } from "../src/constants";
import {
  getGoals,
  getDailyStates,
  hasShownSwipeTutorial,
  setSwipeTutorialShown,
} from "../src/storage";
import { recordDoIt, recordStepDown, recordSnooze } from "../src/progression";
import { Goal, DailyGoalState } from "../src/types";

export default function Home() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dailyStates, setDailyStates] = useState<DailyGoalState[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const tutorialAnim = useRef(new Animated.Value(0)).current;
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const load = useCallback(async () => {
    const [g, ds] = await Promise.all([getGoals(), getDailyStates()]);
    setGoals(g);
    setDailyStates(ds);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      setShowFabMenu(false);
    }, [load]),
  );

  // Swipe tutorial on first visit
  useEffect(() => {
    hasShownSwipeTutorial().then((shown) => {
      if (!shown && goals.length > 0) {
        setTimeout(() => {
          setShowTutorial(true);
          Animated.sequence([
            Animated.timing(tutorialAnim, {
              toValue: -80,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(tutorialAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setTimeout(() => setShowTutorial(false), 2000);
          });
          setSwipeTutorialShown();
        }, 800);
      }
    });
  }, [goals.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const getGoalState = (goalId: string): DailyGoalState | undefined =>
    dailyStates.find((s) => s.goalId === goalId);

  const handleDoIt = async (goalId: string) => {
    swipeableRefs.current.get(goalId)?.close();
    await recordDoIt(goalId, "primary");
    await load();
  };

  const handleStepDown = async (goalId: string) => {
    swipeableRefs.current.get(goalId)?.close();
    await recordStepDown(goalId, "easier");
    await load();
  };

  const handleSnooze = async (goalId: string) => {
    swipeableRefs.current.get(goalId)?.close();
    await recordSnooze(goalId);
    await load();
  };

  const formatReminderTime = (goal: Goal): string => {
    const { reminder } = goal;
    const fmt = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
    };
    if (reminder.type === "exact") return fmt(reminder.startTime);
    return `${fmt(reminder.startTime)} – ${fmt(reminder.endTime || reminder.startTime)}`;
  };

  const renderLeftActions = (goalId: string) => (
    <TouchableOpacity
      style={styles.snoozeAction}
      onPress={() => handleSnooze(goalId)}
    >
      <Text style={styles.actionLabel}>Snooze</Text>
    </TouchableOpacity>
  );

  const renderRightActions = (goalId: string) => (
    <View style={styles.rightActions}>
      <TouchableOpacity
        style={styles.doItAction}
        onPress={() => handleDoIt(goalId)}
      >
        <Text style={styles.actionLabel}>Done</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.stepDownAction}
        onPress={() => handleStepDown(goalId)}
      >
        <Text style={styles.actionLabel}>Step Down</Text>
      </TouchableOpacity>
    </View>
  );

  const isDone = (state?: DailyGoalState) =>
    state?.status === "done" || state?.status === "stepped_down";

  return (
    <View style={styles.container}>
      {/* Profile icon */}
      <TouchableOpacity
        style={styles.profileBtn}
        onPress={() => router.push("/profile")}
      >
        <View style={styles.profileIcon}>
          <View style={styles.profileHead} />
          <View style={styles.profileBody} />
        </View>
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No goals yet</Text>
            <Text style={styles.emptyBody}>
              Tap + to create your first goal
            </Text>
          </View>
        ) : (
          goals.map((goal) => {
            const state = getGoalState(goal.id);
            const done = isDone(state);

            return (
              <Swipeable
                key={goal.id}
                ref={(ref) => {
                  if (ref) swipeableRefs.current.set(goal.id, ref);
                }}
                renderLeftActions={
                  done ? undefined : () => renderLeftActions(goal.id)
                }
                renderRightActions={
                  done ? undefined : () => renderRightActions(goal.id)
                }
                enabled={!done}
                overshootLeft={false}
                overshootRight={false}
              >
                <Animated.View
                  style={[
                    showTutorial && goal.id === goals[0]?.id
                      ? { transform: [{ translateX: tutorialAnim }] }
                      : {},
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.goalCard,
                      {
                        borderColor: done
                          ? colors.doneBorder
                          : colors.pendingBorder,
                      },
                    ]}
                    onPress={() => router.push(`/goal/${goal.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.goalHeader}>
                      <View style={styles.goalInfo}>
                        <Text
                          style={[styles.goalName, done && styles.goalNameDone]}
                        >
                          {goal.name}
                        </Text>
                        {done ? (
                          <Text style={styles.goalDoneText}>
                            {state?.status === "stepped_down"
                              ? MICROCOPY.STEP_DOWN
                              : MICROCOPY.DO_IT}
                          </Text>
                        ) : (
                          <Text style={styles.goalTime}>
                            {formatReminderTime(goal)}
                          </Text>
                        )}
                      </View>
                      {done && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </Swipeable>
            );
          })
        )}
      </ScrollView>

      {/* Swipe tutorial tooltip */}
      {showTutorial && (
        <View style={styles.tutorialTooltip}>
          <Text style={styles.tutorialText}>Swipe to act</Text>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowFabMenu(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* FAB Menu Modal */}
      <Modal
        visible={showFabMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFabMenu(false)}
      >
        <TouchableOpacity
          style={styles.fabOverlay}
          activeOpacity={1}
          onPress={() => setShowFabMenu(false)}
        >
          <View style={styles.fabMenu}>
            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => {
                setShowFabMenu(false);
                router.push("/create");
              }}
            >
              <Text style={styles.fabMenuText}>Create</Text>
            </TouchableOpacity>
            <View style={styles.fabMenuDivider} />
            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => {
                setShowFabMenu(false);
                router.push("/templates");
              }}
            >
              <Text style={styles.fabMenuText}>Template</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  profileBtn: {
    position: "absolute",
    top: 52,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileHead: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.text,
    position: "absolute",
    top: 4,
  },
  profileBody: {
    width: 20,
    height: 12,
    borderRadius: 10,
    backgroundColor: colors.text,
    position: "absolute",
    bottom: -3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 120,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 15,
    color: colors.textMuted,
  },
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  goalEmoji: {
    fontSize: 28,
    marginRight: 14,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  goalNameDone: {
    color: colors.textMuted,
  },
  goalTime: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  goalDoneText: {
    fontSize: 14,
    color: colors.doneBorder,
    marginTop: 2,
    fontStyle: "italic",
  },
  checkmark: {
    fontSize: 22,
    color: colors.doneBorder,
    fontWeight: "700",
  },
  // Swipe actions
  rightActions: {
    flexDirection: "row",
    marginBottom: 12,
  },
  doItAction: {
    backgroundColor: colors.doItGreen,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 8,
  },
  stepDownAction: {
    backgroundColor: colors.stepDownYellow,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 8,
  },
  snoozeAction: {
    backgroundColor: colors.snoozeGray,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 20,
  },
  actionLabel: {
    fontSize: 11,
    color: colors.white,
    fontWeight: "600",
    marginTop: 2,
  },
  // Tutorial
  tutorialTooltip: {
    position: "absolute",
    top: 160,
    alignSelf: "center",
    backgroundColor: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tutorialText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  // FAB
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    fontSize: 28,
    color: colors.white,
    fontWeight: "300",
    marginTop: -2,
  },
  fabOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    padding: 24,
    paddingBottom: 100,
  },
  fabMenu: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    minWidth: 160,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  fabMenuItem: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  fabMenuText: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
  },
  fabMenuDivider: {
    height: 1,
    backgroundColor: colors.muted,
  },
});
