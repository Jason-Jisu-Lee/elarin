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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Swipeable } from "react-native-gesture-handler";
import {
  getGoals,
  getDailyStates,
  hasShownSwipeTutorial,
  setSwipeTutorialShown,
  getCompletionHistory,
  ensureHeatmapStartDate,
  updateDailyGoalState,
} from "../src/storage";
import { recordDoIt } from "../src/progression";
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
  const insets = useSafeAreaInsets();
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
    await recordDoIt(goalId, "primary");
    await load();
  };

  const handleReset = async (goalId: string) => {
    await updateDailyGoalState(goalId, "pending");
    await load();
  };

  const isOverdue = (goal: Goal): boolean => {
    if (goal.reminder.notificationsEnabled === false) return false;
    const now = new Date();
    const timeStr =
      goal.reminder.type === "window"
        ? goal.reminder.endTime || goal.reminder.startTime
        : goal.reminder.startTime;
    const [h, m] = timeStr.split(":").map(Number);
    const scheduled = new Date(now);
    scheduled.setHours(h, m, 0, 0);
    return now > scheduled;
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

  const renderCompleteAction = () => (
    <View
      style={[
        styles.completeAction,
        { backgroundColor: isDark ? "#14532d" : "#bbf7d0" },
      ]}
    />
  );

  const renderResetAction = () => (
    <View
      style={[
        styles.resetAction,
        { backgroundColor: colors.surfaceContainerHighest },
      ]}
    />
  );

  // Heatmap color scale — light green (few) → dark green (many)
  const getHeatColor = (ratio: number): string => {
    if (ratio < 0) return "transparent";
    if (ratio === 0)
      return isDark
        ? colors.surfaceContainerHigh
        : colors.surfaceContainerHighest;
    if (ratio <= 0.25) return isDark ? "#14532d" : "#dcfce7";
    if (ratio <= 0.5) return isDark ? "#166534" : "#86efac";
    if (ratio <= 0.75) return isDark ? "#16a34a" : "#22c55e";
    return isDark ? "#4ade80" : "#15803d";
  };

  const legendColors = [
    isDark ? colors.surfaceContainerHigh : colors.surfaceContainerHighest,
    isDark ? "#14532d" : "#dcfce7",
    isDark ? "#166534" : "#86efac",
    isDark ? "#16a34a" : "#22c55e",
    isDark ? "#4ade80" : "#15803d",
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

  // Heatmap renderer — 3-month window, fixed 11px cells spread across full width
  const renderHeatmap = () => {
    if (heatmapData.length === 0) return null;

    // 3-month rolling window ending in current month
    const now = new Date();
    const endMonth = now.getMonth();
    const windowStart = new Date(now.getFullYear(), endMonth - 2, 1);
    const windowEnd = new Date(now.getFullYear(), endMonth + 1, 0);

    // Build complete day-by-day list for the window (fill gaps with no-data cells)
    const dataMap = new Map(heatmapData.map((e) => [e.date, e]));
    const windowDays: HeatmapEntry[] = [];
    const cursor = new Date(windowStart);
    while (cursor <= windowEnd) {
      const dateStr = cursor.toISOString().split("T")[0];
      windowDays.push(
        dataMap.get(dateStr) ?? {
          date: dateStr,
          ratio: -1,
          completed: 0,
          total: 0,
        },
      );
      cursor.setDate(cursor.getDate() + 1);
    }

    // Build week columns
    const weeks: HeatmapEntry[][] = [];
    let currentWeek: HeatmapEntry[] = [];
    const startDay = windowStart.getDay();
    for (let i = 0; i < startDay; i++)
      currentWeek.push({ date: "", ratio: -1, completed: 0, total: 0 });
    for (const entry of windowDays) {
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

    // Month labels
    const monthMarkers: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const realDay = week.find((d) => d.date !== "");
      if (realDay) {
        const m = parseInt(realDay.date.split("-")[1], 10) - 1;
        if (m !== lastMonth) {
          monthMarkers.push({ weekIndex: wi, label: MONTH_LABELS[m] });
          lastMonth = m;
        }
      }
    });

    const DAY_LABEL_W = 24;
    const CELL = 11;
    const CELL_GAP = 3;

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
          Activity
        </Text>

        {/* Month labels — spread to fill full width */}
        <View style={{ flexDirection: "row", marginBottom: 4 }}>
          <View style={{ width: DAY_LABEL_W }} />
          <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between" }}>
            {weeks.map((_, wi) => {
              const marker = monthMarkers.find((m) => m.weekIndex === wi);
              return (
                <View key={wi} style={{ width: CELL }}>
                  {marker && (
                    <Text
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
        </View>

        {/* Grid: day labels + cells */}
        <View style={{ flexDirection: "row" }}>
          {/* Day labels */}
          <View style={{ width: DAY_LABEL_W }}>
            {DAY_LABELS.map((lbl, i) => (
              <View
                key={i}
                style={{ height: CELL + CELL_GAP, justifyContent: "center" }}
              >
                <Text
                  style={[styles.dayLabel, { color: colors.onSurfaceVariant }]}
                >
                  {lbl}
                </Text>
              </View>
            ))}
          </View>

          {/* Cell columns — spread to fill full width */}
          <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between" }}>
            {weeks.map((week, wi) => (
              <View key={wi} style={{ gap: CELL_GAP }}>
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
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: 2,
                      backgroundColor: getHeatColor(day.ratio),
                      borderWidth: day.ratio === 0 ? 1 : 0,
                      borderColor:
                        day.ratio === 0
                          ? isDark
                            ? colors.surfaceContainerHighest
                            : colors.outlineVariant
                          : "transparent",
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Legend */}
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
                  const overdue = !done && isOverdue(goal);
                  const time = formatReminderTime(goal);

                  const cardBg = done
                    ? isDark ? "#14532d" : "#dcfce7"
                    : overdue
                      ? isDark ? "#3b2200" : "#fef9c3"
                      : colors.surfaceContainerHigh;

                  const barColor = done
                    ? isDark ? "#4ade80" : "#15803d"
                    : overdue
                      ? isDark ? "#d97706" : "#f59e0b"
                      : colors.outlineVariant;

                  return (
                    <Swipeable
                      key={goal.id}
                      ref={(ref) => {
                        if (ref) swipeableRefs.current.set(goal.id, ref);
                      }}
                      renderLeftActions={() => renderCompleteAction()}
                      renderRightActions={() => renderResetAction()}
                      overshootLeft={false}
                      overshootRight={false}
                      onSwipeableOpen={(direction, swipeable) => {
                        swipeable.close();
                        if (direction === "right") handleDoIt(goal.id);
                        else handleReset(goal.id);
                      }}
                    >
                      <Animated.View
                        style={
                          showTutorial && goal.id === goals[0]?.id
                            ? { transform: [{ translateX: tutorialAnim }] }
                            : {}
                        }
                      >
                        <View style={styles.goalRow}>
                          <TouchableOpacity
                            style={[styles.goalCard, { backgroundColor: cardBg }]}
                            onPress={() => router.push(`/goal/${goal.id}`)}
                            activeOpacity={0.7}
                          >
                            <View
                              style={[styles.leftBar, { backgroundColor: barColor }]}
                            />
                            <View style={styles.goalContent}>
                              <Text
                                style={[
                                  styles.goalName,
                                  {
                                    color: done
                                      ? colors.onSurfaceVariant
                                      : colors.onSurface,
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {goal.name}
                              </Text>
                            </View>
                          </TouchableOpacity>
                          {!done && time !== "" && (
                            <Text
                              style={[
                                styles.goalTime,
                                {
                                  color: overdue
                                    ? isDark ? "#fbbf24" : "#d97706"
                                    : colors.onSurfaceVariant,
                                },
                              ]}
                            >
                              {time}
                            </Text>
                          )}
                        </View>
                      </Animated.View>
                    </Swipeable>
                  );
                })}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Fixed heatmap at the bottom of the screen */}
      <View
        style={[
          styles.heatmapFixed,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.outlineVariant,
            paddingBottom: Math.max(insets.bottom + 6, 14),
          },
        ]}
      >
        {renderHeatmap()}
      </View>

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
    paddingTop: 10,
    paddingBottom: 40,
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
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  goalCard: {
    borderRadius: 14,
    flexDirection: "row",
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    width: "60%",
  },
  goalTime: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
  },
  leftBar: { width: 4 },
  goalContent: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  goalName: {
    fontSize: 16,
    fontFamily: fonts.headlineBold,
  },
  // Heatmap
  heatmapFixed: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  heatmapWrap: {
    marginBottom: 4,
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
    fontSize: 9,
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
  completeAction: {
    width: 70,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    marginBottom: 12,
  },
  resetAction: {
    width: 70,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    marginBottom: 12,
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
  // FAB — top-left
  fab: {
    position: "absolute",
    top: 44,
    left: 20,
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
    fontSize: 28,
    includeFontPadding: false,
    textAlign: "center",
    textAlignVertical: "center",
    lineHeight: 32,
    marginTop: -1,
  },
  fabOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    paddingTop: 110,
    paddingLeft: 20,
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
