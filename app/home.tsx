/* eslint-disable react-hooks/exhaustive-deps */
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
import { MICROCOPY } from "../src/constants";
import {
  getGoals,
  getDailyStates,
  hasShownSwipeTutorial,
  setSwipeTutorialShown,
  getCompletionHistory,
  ensureHeatmapStartDate,
} from "../src/storage";
import { recordDoIt, recordStepDown, recordSnooze } from "../src/progression";
import { Goal, DailyGoalState } from "../src/types";
import { useTheme, fonts } from "../src/theme";

const FREQ_ORDER: Record<string, number> = {
  daily: 0,
  every_other_day: 1,
  every_3_days: 2,
  every_4_days: 3,
  every_5_days: 4,
  every_6_days: 5,
  weekly: 6,
  every_2_weeks: 7,
  monthly: 8,
};

const FREQ_LABELS: Record<string, string> = {
  daily: "Daily",
  every_other_day: "Every 2 Days",
  every_3_days: "Every 3 Days",
  every_4_days: "Every 4 Days",
  every_5_days: "Every 5 Days",
  every_6_days: "Every 6 Days",
  weekly: "Weekly",
  every_2_weeks: "Biweekly",
  monthly: "Monthly",
};

const MONTH_LABELS = [
  "J",
  "F",
  "M",
  "A",
  "M",
  "J",
  "J",
  "A",
  "S",
  "O",
  "N",
  "D",
];

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

type HeatmapEntry = {
  date: string;
  ratio: number;
  completed: number;
  total: number;
};

export default function Home() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dailyStates, setDailyStates] = useState<DailyGoalState[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [heatmapData, setHeatmapData] = useState<HeatmapEntry[]>([]);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const tutorialAnim = useRef(new Animated.Value(0)).current;
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const load = useCallback(async () => {
    const [g, ds] = await Promise.all([getGoals(), getDailyStates()]);
    setGoals(g);
    setDailyStates(ds);
    if (g.length > 0) {
      await ensureHeatmapStartDate();
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const daysFromJan1 =
        Math.floor(
          (now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;
      const history = await getCompletionHistory(daysFromJan1);
      setHeatmapData(history);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      setShowFabMenu(false);
      setTooltip(null);
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
    if (goal.reminder.notificationsEnabled === false) return "";
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

  const groupedGoals = goals.reduce(
    (acc, goal) => {
      const freq = goal.reminder.frequency || "daily";
      if (!acc[freq]) acc[freq] = [];
      acc[freq].push(goal);
      return acc;
    },
    {} as Record<string, Goal[]>,
  );

  const sortedFreqs = Object.keys(groupedGoals).sort(
    (a, b) => (FREQ_ORDER[a] ?? 99) - (FREQ_ORDER[b] ?? 99),
  );

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

  // Heatmap color scale using theme-appropriate greens
  const getHeatColor = (ratio: number): string => {
    if (ratio < 0) return "transparent";
    if (ratio === 0)
      return isDark
        ? colors.surfaceContainerHigh
        : colors.surfaceContainerHighest;
    if (ratio <= 0.25) return isDark ? "#0e4429" : "#9be9a8";
    if (ratio <= 0.5) return isDark ? "#006d32" : "#40c463";
    if (ratio <= 0.75) return isDark ? "#26a641" : "#30a14e";
    return isDark ? "#39d353" : "#216e39";
  };

  const legendColors = [
    isDark ? colors.surfaceContainerHigh : colors.surfaceContainerHighest,
    isDark ? "#0e4429" : "#9be9a8",
    isDark ? "#006d32" : "#40c463",
    isDark ? "#26a641" : "#30a14e",
    isDark ? "#39d353" : "#216e39",
  ];

  const formatDateLabel = (dateStr: string): string => {
    const [_y, m, d] = dateStr.split("-").map(Number);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const suffix =
      d === 1 || d === 21 || d === 31
        ? "st"
        : d === 2 || d === 22
          ? "nd"
          : d === 3 || d === 23
            ? "rd"
            : "th";
    return `${months[m - 1]} ${d}${suffix}`;
  };

  // Heatmap renderer — GitHub-style with month labels, day labels, legend
  const renderHeatmap = () => {
    if (heatmapData.length === 0) return null;

    // Build week columns
    const weeks: HeatmapEntry[][] = [];
    let currentWeek: HeatmapEntry[] = [];
    const firstDate = new Date(heatmapData[0].date);
    const startDay = firstDate.getDay(); // 0=Sun
    // Pad start of first week
    for (let i = 0; i < startDay; i++) {
      currentWeek.push({ date: "", ratio: -1, completed: 0, total: 0 });
    }
    for (const entry of heatmapData) {
      currentWeek.push(entry);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7)
        currentWeek.push({ date: "", ratio: -1, completed: 0, total: 0 });
      weeks.push(currentWeek);
    }

    // Month labels: find which weeks start a new month
    const monthMarkers: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      // Use first real day in the week
      const realDay = week.find((d) => d.date !== "");
      if (realDay) {
        const m = parseInt(realDay.date.split("-")[1], 10) - 1;
        if (m !== lastMonth) {
          monthMarkers.push({ weekIndex: wi, label: MONTH_LABELS[m] });
          lastMonth = m;
        }
      }
    });

    const CELL = 11;
    const GAP = 3;
    const DAY_LABEL_W = 28;

    const handleCellPress = (
      entry: HeatmapEntry,
      pageX: number,
      pageY: number,
    ) => {
      if (entry.date === "" || entry.ratio < 0) return;
      const label = formatDateLabel(entry.date);
      setTooltip({
        x: pageX,
        y: pageY - 40,
        text: `${entry.completed} of ${entry.total} completed on ${label}`,
      });
      setTimeout(() => setTooltip(null), 2500);
    };

    return (
      <View style={styles.heatmapWrap}>
        <Text style={[styles.heatmapTitle, { color: colors.onSurfaceVariant }]}>
          {new Date().getFullYear()} Activity
        </Text>

        {/* Month labels row */}
        <View style={styles.heatmapMonthRow}>
          <View style={{ width: DAY_LABEL_W }} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
          >
            <View style={{ flexDirection: "row" }}>
              {weeks.map((_, wi) => {
                const marker = monthMarkers.find((m) => m.weekIndex === wi);
                return (
                  <View
                    key={wi}
                    style={{ width: CELL + GAP, alignItems: "flex-start" }}
                  >
                    {marker && (
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.monthLabel,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {marker.label}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Grid: day labels + cells */}
        <View style={{ flexDirection: "row" }}>
          {/* Day labels column */}
          <View style={{ width: DAY_LABEL_W }}>
            {DAY_LABELS.map((lbl, i) => (
              <View
                key={i}
                style={{ height: CELL + GAP, justifyContent: "center" }}
              >
                <Text
                  style={[styles.dayLabel, { color: colors.onSurfaceVariant }]}
                >
                  {lbl}
                </Text>
              </View>
            ))}
          </View>

          {/* Scrollable grid */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.heatmapGrid}
          >
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.heatmapCol}>
                {week.map((day, di) => (
                  <TouchableOpacity
                    key={`${wi}-${di}`}
                    activeOpacity={0.7}
                    onPress={(e) =>
                      handleCellPress(
                        day,
                        e.nativeEvent.pageX,
                        e.nativeEvent.pageY,
                      )
                    }
                    style={[
                      styles.heatmapCell,
                      {
                        backgroundColor: getHeatColor(day.ratio),
                        borderWidth: day.ratio === 0 ? 1 : 0,
                        borderColor:
                          day.ratio === 0
                            ? isDark
                              ? colors.surfaceContainerHighest
                              : colors.outlineVariant
                            : "transparent",
                      },
                    ]}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Legend row */}
        <View style={styles.legendRow}>
          <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
            Less
          </Text>
          {legendColors.map((c, i) => (
            <View
              key={i}
              style={[
                styles.legendCell,
                {
                  backgroundColor: c,
                  borderWidth: i === 0 ? 1 : 0,
                  borderColor:
                    i === 0
                      ? isDark
                        ? colors.surfaceContainerHighest
                        : colors.outlineVariant
                      : "transparent",
                },
              ]}
            />
          ))}
          <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
            More
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <View style={{ flex: 1 }} />
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
          <>
            {sortedFreqs.map((freq, fi) => (
              <View key={freq}>
                {sortedFreqs.length > 1 && fi > 0 && (
                  <View
                    style={[
                      styles.freqSeparator,
                      { backgroundColor: colors.outlineVariant },
                    ]}
                  />
                )}
                {sortedFreqs.length > 1 && (
                  <Text
                    style={[
                      styles.freqGroupLabel,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    {FREQ_LABELS[freq] || freq}
                  </Text>
                )}
                {groupedGoals[freq].map((goal) => {
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
                            {
                              backgroundColor: colors.surfaceContainerLowest,
                            },
                          ]}
                          onPress={() => router.push(`/goal/${goal.id}`)}
                          activeOpacity={0.7}
                        >
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
                                  done && {
                                    color: colors.onSurfaceVariant,
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {goal.name}
                              </Text>
                              {done && (
                                <View
                                  style={[
                                    styles.doneBadge,
                                    {
                                      backgroundColor: colors.tertiaryContainer,
                                    },
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
                              {!done && formatReminderTime(goal) !== "" && (
                                <Text
                                  style={[
                                    styles.timePillText,
                                    { color: colors.onSurfaceVariant },
                                  ]}
                                >
                                  {formatReminderTime(goal)}
                                </Text>
                              )}
                            </View>
                            {done ? (
                              <Text
                                style={[
                                  styles.goalSub,
                                  { color: colors.tertiary },
                                ]}
                              >
                                {state?.status === "stepped_down"
                                  ? MICROCOPY.STEP_DOWN
                                  : MICROCOPY.DO_IT}
                              </Text>
                            ) : (
                              <Text
                                style={[
                                  styles.goalDesc,
                                  { color: colors.onSurfaceVariant },
                                ]}
                                numberOfLines={1}
                              >
                                {goal.tiers.primary}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    </Swipeable>
                  );
                })}
              </View>
            ))}

            {renderHeatmap()}
          </>
        )}
      </ScrollView>

      {/* Tooltip bubble */}
      {tooltip && (
        <View
          style={[
            styles.tooltipBubble,
            {
              left: Math.max(8, Math.min(tooltip.x - 80, 220)),
              top: tooltip.y,
              backgroundColor: colors.inverseSurface,
            },
          ]}
        >
          <Text
            style={[styles.tooltipText, { color: colors.inverseOnSurface }]}
          >
            {tooltip.text}
          </Text>
        </View>
      )}

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

      {/* FAB — clean, minimal circle */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.surfaceContainerLowest,
            borderColor: isDark
              ? colors.surfaceContainerHighest
              : colors.outlineVariant,
          },
        ]}
        onPress={() => setShowFabMenu(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.fabText, { color: colors.onSurface }]}>+</Text>
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
    justifyContent: "flex-end",
    alignItems: "center",
    paddingTop: 52,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  profileBtn: { padding: 8 },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
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
  freqSeparator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
    opacity: 0.5,
  },
  freqGroupLabel: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  goalCard: {
    borderRadius: 14,
    marginBottom: 8,
    flexDirection: "row",
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  leftBar: { width: 4 },
  goalContent: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  goalTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalName: {
    fontSize: 15,
    fontFamily: fonts.headlineBold,
    flex: 1,
  },
  doneBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
    marginLeft: 6,
  },
  doneBadgeText: {
    fontSize: 9,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 1,
  },
  goalDesc: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
    marginTop: 2,
  },
  goalSub: {
    fontSize: 13,
    fontFamily: fonts.bodyItalic,
    marginTop: 2,
  },
  timePillText: {
    fontSize: 11,
    fontFamily: fonts.bodyMedium,
    marginLeft: 6,
  },
  // Heatmap
  heatmapWrap: {
    marginTop: 24,
    marginBottom: 8,
  },
  heatmapTitle: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    marginBottom: 10,
  },
  heatmapMonthRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  monthLabel: {
    fontSize: 8,
    fontFamily: fonts.bodyMedium,
    includeFontPadding: false,
  },
  dayLabel: {
    fontSize: 9,
    fontFamily: fonts.bodyMedium,
  },
  heatmapGrid: {
    flexDirection: "row",
    gap: 3,
  },
  heatmapCol: {
    gap: 3,
  },
  heatmapCell: {
    width: 11,
    height: 11,
    borderRadius: 2,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 4,
  },
  legendText: {
    fontSize: 10,
    fontFamily: fonts.bodyMedium,
  },
  legendCell: {
    width: 11,
    height: 11,
    borderRadius: 2,
  },
  // Tooltip
  tooltipBubble: {
    position: "absolute",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 200,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    zIndex: 999,
  },
  tooltipText: {
    fontSize: 11,
    fontFamily: fonts.bodyMedium,
    textAlign: "center",
  },
  // Swipe actions
  rightActions: { flexDirection: "row", marginBottom: 8 },
  doItAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 70,
    paddingHorizontal: 6,
  },
  stepDownAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 70,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 6,
  },
  snoozeAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 70,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  actionLabel: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    marginTop: 2,
  },
  tutorialTooltip: {
    position: "absolute",
    top: 140,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tutorialText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
  },
  // FAB — clean minimal
  fab: {
    position: "absolute",
    bottom: 88,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  fabText: {
    fontSize: 26,
    fontFamily: fonts.bodyRegular,
    lineHeight: 28,
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
  fabMenuDivider: { height: 1 },
  fabMenuText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
  },
});
