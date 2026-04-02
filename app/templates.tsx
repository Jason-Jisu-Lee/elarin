import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { PRE_BUILT_GOALS } from "../src/constants";
import { useTheme, fonts } from "../src/theme";

export default function TemplateSelection() {
  const router = useRouter();
  const { colors } = useTheme();

  const handleSelectPreBuilt = (index: number) => {
    router.push(`/create?prebuilt=${index}`);
  };

  const handleCreateOwn = () => {
    router.push("/create");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.secondary }]}>
          CHOOSE A TEMPLATE
        </Text>
        <Text style={[styles.title, { color: colors.onSurface }]}>
          Pick a Goal
        </Text>

        {PRE_BUILT_GOALS.map((goal, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.card,
              { backgroundColor: colors.surfaceContainerLowest },
            ]}
            onPress={() => handleSelectPreBuilt(i)}
            activeOpacity={0.7}
          >
            <Text style={[styles.goalName, { color: colors.onSurface }]}>
              {goal.name}
            </Text>
            <Text style={[styles.primaryTier, { color: colors.onSurface }]}>
              {goal.tiers.primary}
            </Text>
            <View style={styles.tierRow}>
              <Text style={[styles.arrow, { color: colors.outlineVariant }]}>
                ↓
              </Text>
              <Text
                style={[styles.tierText, { color: colors.onSurfaceVariant }]}
              >
                {goal.tiers.easier}
              </Text>
            </View>
            <View style={styles.tierRow}>
              <Text style={[styles.arrow, { color: colors.outlineVariant }]}>
                ↓
              </Text>
              <Text
                style={[styles.tierText, { color: colors.onSurfaceVariant }]}
              >
                {goal.tiers.easiest}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.createCard, { borderColor: colors.outlineVariant }]}
          onPress={handleCreateOwn}
          activeOpacity={0.7}
        >
          <Text style={[styles.createText, { color: colors.primary }]}>
            Create Your Own
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.headlineExtraBold,
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  goalName: {
    fontSize: 22,
    fontFamily: fonts.headlineBold,
    marginBottom: 16,
  },
  primaryTier: {
    fontSize: 17,
    fontFamily: fonts.bodySemiBold,
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
    marginRight: 8,
  },
  tierText: {
    fontSize: 15,
    fontFamily: fonts.bodyRegular,
  },
  createCard: {
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 20,
    paddingVertical: 24,
    backgroundColor: "transparent",
  },
  createText: {
    fontSize: 20,
    fontFamily: fonts.headlineBold,
  },
});
