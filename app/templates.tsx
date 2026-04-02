import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { colors, PRE_BUILT_GOALS } from "../src/constants";

export default function TemplateSelection() {
  const router = useRouter();

  const handleSelectPreBuilt = (index: number) => {
    router.push(`/create?prebuilt=${index}`);
  };

  const handleCreateOwn = () => {
    router.push("/create");
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {PRE_BUILT_GOALS.map((goal, i) => (
          <TouchableOpacity
            key={i}
            style={styles.card}
            onPress={() => handleSelectPreBuilt(i)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.goalName}>{goal.name}</Text>
            </View>
            <Text style={styles.primaryTier}>{goal.tiers.primary}</Text>
            <View style={styles.tierRow}>
              <Text style={styles.arrow}>↓</Text>
              <Text style={styles.tierText}>{goal.tiers.easier}</Text>
            </View>
            <View style={styles.tierRow}>
              <Text style={styles.arrow}>↓</Text>
              <Text style={styles.tierText}>{goal.tiers.easiest}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.card, styles.createCard]}
          onPress={handleCreateOwn}
          activeOpacity={0.7}
        >
          <Text style={styles.createText}>Create Your Own</Text>
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
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  emoji: {
    fontSize: 28,
    marginRight: 12,
  },
  goalName: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  primaryTier: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
    marginBottom: 4,
  },
  arrow: {
    fontSize: 16,
    color: colors.textMuted,
    marginRight: 8,
  },
  tierText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  createCard: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    borderStyle: "dashed",
    backgroundColor: "transparent",
  },
  createEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  createText: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.accent,
  },
});
