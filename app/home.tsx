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
import { LinearGradient } from "expo-linear-gradient";
import { MICROCOPY } from "../src/constants";
import {
  getGoals,
  getDailyStates,
  hasShownSwipeTutorial,
  setSwipeTutorialShown,
} from "../src/storage";
import { recordDoIt, recordStepDown, recordSnooze } from "../src/progression";
import { Goal, DailyGoalState } from "../src/types";
import { useTheme, fonts } from "../src/theme";

export default function Home() {
  const router = useRouter();
  const { colors } = useTheme();
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
          ]).start(() => setTimeout(() => setShowTutorial(false), 2000));
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

  const isDone = (state?: DailyGoalState) =>
    state?.status === "done" || state?.status === "stepped_down";

  const renderLeftActions = (goalId: string) => (
    <TouchableOpacity
      style={[styles.snoozeAction, { backgroundColor: colors.outline }]}
      onPress={() => handleSnooze(goalId)}
    >
      <Text style={[styles.actionLabel, { color: colors.onPrimary }]}>
        Snooze
      </Text>
    </TouchableOpacity>
  );

  const renderRightActions = (goalId: string) => (
    <View style={styles.rightActions}>
      <TouchableOpacity
        style={[
          styles.doItAction,
          { backgroundColor: colors.tertiaryContainer },
        ]}
        onPress={() => handleDoIt(goalId)}
      >
        <Text style={[styles.actionLabel, { color: colors.onPrimary }]}>
          Done
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.stepDownAction,
          { backgroundColor: colors.secondaryContainer },
        ]}
        onPress={() => handleStepDown(goalId)}
      >
        <Text
          style={[styles.actionLabel, { color: colors.onSecondaryContainer }]}
        >
          Step Down
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={[styles.journalLabel, { color: colors.secondary }]}>
            THE LIVING JOURNAL
          </Text>
          <Text style={[styles.hubTitle, { color: colors.onSurface }]}>
            Goal Hub
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
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
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
              No goals yet
            </Text>
            <Text
              style={[styles.emptyBody, { color: colors.onSurfaceVariant }]}
            >
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
                  style={
                    showTutorial && goal.id === goals[0]?.id
                      ? { transform: [{ translateX: tutorialAnim }] }
                      : {}
                  }
                >
                  <TouchableOpacity
                    style={[
                      styles.goalCard,
                      { backgroundColor: colors.surfaceContainerLowest },
                    ]}
                    onPress={() => router.push(`/goal/${goal.id}`)}
                    activeOpacity={0.7}
                  >
                    {/* Left accent bar */}
                    <View
                      style={[
                        styles.leftBar,
                        {
                          backgroundColor: done
                            ? colors.tertiaryContainer
                            : colors.secondaryContainer,
                        },
                      ]}
                    />
                    <View style={styles.goalContent}>
                      <View style={styles.goalTop}>
                        <Text
                          style={[
                            styles.goalName,
                            { color: colors.onSurface },
                            done && { color: colors.onSurfaceVariant },
                          ]}
                        >
                          {goal.name}
                        </Text>
                        {done && (
                          <View
                            style={[
                              styles.doneBadge,
                              { backgroundColor: colors.tertiaryContainer },
                            ]}
                          >
                            <Text
                              style={[
                                styles.doneBadgeText,
                                { color: colors.onPrimary },
                              ]}
                            >
                              DONE
                            </Text>
                          </View>
                        )}
                      </View>
                      {done ? (
                        <Text
                          style={[styles.goalSub, { color: colors.tertiary }]}
                        >
                          {state?.status === "stepped_down"
                            ? MICROCOPY.STEP_DOWN
                            : MICROCOPY.DO_IT}
                        </Text>
                      ) : (
                        <>
                          <Text
                            style={[
                              styles.goalDesc,
                              { color: colors.onSurfaceVariant },
                            ]}
                            numberOfLines={1}
                          >
                            {goal.tiers.primary}
                          </Text>
                          <View
                            style={[
                              styles.timePill,
                              { backgroundColor: colors.surfaceContainer },
                            ]}
                          >
                            <Text
                              style={[
                                styles.timePillText,
                                { color: colors.onSurfaceVariant },
                              ]}
                            >
                              {formatReminderTime(goal)}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </Swipeable>
            );
          })
        )}

        {/* Pull to reflect dashed area */}
        <View
          style={[styles.reflectArea, { borderColor: colors.outlineVariant }]}
        >
          <Text style={[styles.reflectText, { color: colors.outlineVariant }]}>
            Pull to reflect
          </Text>
        </View>
      </ScrollView>

      {/* Swipe tutorial tooltip */}
      {showTutorial && (
        <View
          style={[
            styles.tutorialTooltip,
            { backgroundColor: colors.inverseSurface },
          ]}
        >
          <Text
            style={[styles.tutorialText, { color: colors.inverseOnSurface }]}
          >
            Swipe to act
          </Text>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowFabMenu(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Text style={[styles.fabText, { color: colors.onPrimary }]}>+</Text>
        </LinearGradient>
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
          <View
            style={[
              styles.fabMenu,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          >
            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => {
                setShowFabMenu(false);
                router.push("/create");
              }}
            >
              <Text style={[styles.fabMenuText, { color: colors.onSurface }]}>
                Create
              </Text>
            </TouchableOpacity>
            <View
              style={[
                styles.fabMenuDivider,
                { backgroundColor: colors.outlineVariant },
              ]}
            />
            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => {
                setShowFabMenu(false);
                router.push("/templates");
              }}
            >
              <Text style={[styles.fabMenuText, { color: colors.onSurface }]}>
                Template
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  journalLabel: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  hubTitle: {
    fontSize: 32,
    fontFamily: fonts.headlineExtraBold,
    letterSpacing: -0.5,
  },
  profileBtn: { padding: 8 },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileHead: {
    width: 13,
    height: 13,
    borderRadius: 7,
    position: "absolute",
    top: 4,
  },
  profileBody: {
    width: 22,
    height: 13,
    borderRadius: 11,
    position: "absolute",
    bottom: -3,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyState: { alignItems: "center", marginTop: 120 },
  emptyTitle: {
    fontSize: 20,
    fontFamily: fonts.headlineBold,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 15,
    fontFamily: fonts.bodyRegular,
  },
  goalCard: {
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  leftBar: {
    width: 5,
  },
  goalContent: {
    flex: 1,
    padding: 18,
    paddingLeft: 16,
  },
  goalTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  goalName: {
    fontSize: 18,
    fontFamily: fonts.headlineBold,
    flex: 1,
  },
  doneBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  doneBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 1,
  },
  goalDesc: {
    fontSize: 14,
    fontFamily: fonts.bodyRegular,
    marginBottom: 8,
  },
  goalSub: {
    fontSize: 14,
    fontFamily: fonts.bodyItalic,
    marginTop: 2,
  },
  timePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timePillText: {
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
  },
  reflectArea: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: "center",
    marginTop: 8,
  },
  reflectText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
  },
  // Swipe actions
  rightActions: { flexDirection: "row", marginBottom: 12 },
  doItAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    paddingHorizontal: 8,
  },
  stepDownAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 8,
  },
  snoozeAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  actionLabel: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    marginTop: 2,
  },
  // Tutorial
  tutorialTooltip: {
    position: "absolute",
    top: 180,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tutorialText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
  },
  // FAB
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderRadius: 28,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  fabText: {
    fontSize: 28,
    fontFamily: fonts.bodyRegular,
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
    paddingHorizontal: 20,
    alignItems: "center",
  },
  fabMenuDivider: {
    height: 1,
  },
  fabMenuText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
  },
});
