import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, fonts } from "../src/theme";

const TEMPLATES = [
  { label: "Walk", prebuilt: 0 },
  { label: "Squats", prebuilt: 1 },
  { label: "Read", prebuilt: 2 },
  { label: "Push Ups", prebuilt: 3 },
] as const;

export default function TemplateSelection() {
  const router = useRouter();
  const { colors } = useTheme();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const isOnboarding = onboarding === "1";

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.onSurface }]}>
        Choose a template
      </Text>

      <View style={styles.grid}>
        {TEMPLATES.map((t) => (
          <TouchableOpacity
            key={t.prebuilt}
            style={[
              styles.card,
              { backgroundColor: colors.surfaceContainerLowest },
            ]}
            onPress={() => router.push(`/create?prebuilt=${t.prebuilt}${isOnboarding ? "&onboarding=1" : ""}`)}
            activeOpacity={0.7}
          >
            <Text style={[styles.cardLabel, { color: colors.onSurface }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.card, { borderColor: colors.outlineVariant, borderWidth: 1, backgroundColor: "transparent" }]}
          onPress={() => router.push(`/create${isOnboarding ? "?onboarding=1" : ""}`)}
          activeOpacity={0.7}
        >
          <Text style={[styles.cardLabel, { color: colors.primary }]}>
            Create Your Own
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.headlineExtraBold,
    letterSpacing: -0.5,
    marginBottom: 32,
    textAlign: "center",
  },
  grid: {
    gap: 12,
  },
  card: {
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  cardLabel: {
    fontSize: 17,
    fontFamily: fonts.headlineBold,
  },
});
