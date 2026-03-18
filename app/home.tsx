import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import {
  colors,
  getLevelForXp,
  getXpToNextLevel,
  LEVELS,
} from "../src/constants";
import { getLiveProgress } from "../src/progression";
import { getTemplates } from "../src/storage";
import { Template, UserProgress } from "../src/types";

export default function Home() {
  const router = useRouter();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [p, t] = await Promise.all([getLiveProgress(), getTemplates()]);
    setProgress(p);
    setTemplates(t);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const level = progress ? getLevelForXp(progress.totalXp) : LEVELS[0];
  const xpNext = progress ? getXpToNextLevel(progress.totalXp) : null;
  const momentum = progress?.momentum ?? 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>Elarin</Text>
        <Text style={styles.subtitle}>lower the barrier</Text>
      </View>

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
        {/* Momentum Meter */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Momentum</Text>
          <View style={styles.momentumBar}>
            <View
              style={[
                styles.momentumFill,
                {
                  width: `${Math.min(100, Math.max(0, momentum))}%`,
                  opacity: momentum > 0 ? 0.7 + (momentum / 100) * 0.3 : 0.3,
                },
              ]}
            />
          </View>
          <Text style={styles.momentumLabel}>
            {momentum < 10
              ? "Cold start — do anything to light the ember"
              : momentum < 40
                ? "Warming up — keep going"
                : momentum < 70
                  ? "Building heat — nice momentum"
                  : "On fire — unstoppable"}
          </Text>
        </View>

        {/* Level & XP */}
        <View style={styles.card}>
          <View style={styles.levelRow}>
            <View>
              <Text style={styles.levelName}>{level.name}</Text>
              <Text style={styles.levelLabel}>Level {level.level}</Text>
            </View>
            <View style={styles.xpBox}>
              <Text style={styles.xpValue}>{progress?.totalXp ?? 0}</Text>
              <Text style={styles.xpLabel}>XP</Text>
            </View>
          </View>
          {xpNext && (
            <View style={styles.xpBar}>
              <View
                style={[
                  styles.xpFill,
                  {
                    width: `${Math.min(100, (xpNext.current / xpNext.needed) * 100)}%`,
                  },
                ]}
              />
            </View>
          )}
          {xpNext && (
            <Text style={styles.xpToNext}>
              {xpNext.needed - xpNext.current} XP to next level
            </Text>
          )}
        </View>

        {/* Templates */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Templates</Text>
        </View>

        {templates.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🎯</Text>
            <Text style={styles.emptyTitle}>No templates yet</Text>
            <Text style={styles.emptyBody}>
              Create your first step-down template to get started
            </Text>
          </View>
        ) : (
          templates.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.templateCard}
              onPress={() => router.push(`/template/create?id=${t.id}`)}
              activeOpacity={0.7}
            >
              <Text style={styles.templateName}>{t.name}</Text>
              <Text style={styles.templateSteps}>
                {t.ladder.steps.length} steps · {t.schedule.times.length} daily
              </Text>
              <View style={styles.ladderPreview}>
                {t.ladder.steps.map((step, i) => (
                  <Text key={i} style={styles.ladderPreviewStep}>
                    {i === 0 ? "⚡" : "↓"} {step}
                  </Text>
                ))}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/template/create")}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  momentumBar: {
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    overflow: "hidden",
  },
  momentumFill: {
    height: "100%",
    backgroundColor: colors.momentumGlow,
    borderRadius: 4,
  },
  momentumLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 8,
  },
  levelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  levelName: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.accent,
  },
  levelLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  xpBox: {
    alignItems: "flex-end",
  },
  xpValue: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
  },
  xpLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  xpBar: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 12,
  },
  xpFill: {
    height: "100%",
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  xpToNext: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
  },
  templateCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  templateName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  templateSteps: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  ladderPreview: {
    marginTop: 10,
  },
  ladderPreviewStep: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 2,
  },
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
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
});
