import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import {
  useTheme,
  lightColors,
  darkColors,
  fonts,
  storeTheme,
} from "../src/theme";

export default function ThemeSelect() {
  const router = useRouter();
  const { colors, setTheme } = useTheme();

  const pick = async (choice: "light" | "dark") => {
    setTheme(choice);
    await storeTheme(choice);
    router.replace("/templates");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text
        style={[
          styles.label,
          { color: colors.onSurfaceVariant, fontFamily: fonts.bodySemiBold },
        ]}
      >
        STEP 04 / 04
      </Text>
      <Text
        style={[
          styles.title,
          { color: colors.onSurface, fontFamily: fonts.headlineExtraBold },
        ]}
      >
        Light or Dark?
      </Text>
      <View style={styles.row}>
        {/* Light box */}
        <TouchableOpacity
          style={[
            styles.box,
            {
              backgroundColor: lightColors.surface,
              borderColor: lightColors.outlineVariant,
            },
          ]}
          onPress={() => pick("light")}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.boxInner,
              { backgroundColor: lightColors.surfaceContainerLowest },
            ]}
          >
            <View
              style={[
                styles.boxLine,
                { backgroundColor: lightColors.onSurface, width: 48 },
              ]}
            />
            <View
              style={[
                styles.boxLine,
                {
                  backgroundColor: lightColors.onSurfaceVariant,
                  width: 36,
                  opacity: 0.5,
                },
              ]}
            />
            <View
              style={[
                styles.boxCircle,
                { backgroundColor: lightColors.primaryContainer },
              ]}
            />
          </View>
          <Text
            style={[
              styles.boxLabel,
              { color: colors.onSurface, fontFamily: fonts.bodySemiBold },
            ]}
          >
            Light
          </Text>
        </TouchableOpacity>

        {/* Dark box */}
        <TouchableOpacity
          style={[
            styles.box,
            {
              backgroundColor: darkColors.surface,
              borderColor: darkColors.outlineVariant,
            },
          ]}
          onPress={() => pick("dark")}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.boxInner,
              { backgroundColor: darkColors.surfaceContainerLow },
            ]}
          >
            <View
              style={[
                styles.boxLine,
                { backgroundColor: darkColors.onSurface, width: 48 },
              ]}
            />
            <View
              style={[
                styles.boxLine,
                {
                  backgroundColor: darkColors.onSurfaceVariant,
                  width: 36,
                  opacity: 0.5,
                },
              ]}
            />
            <View
              style={[
                styles.boxCircle,
                { backgroundColor: darkColors.primary },
              ]}
            />
          </View>
          <Text
            style={[
              styles.boxLabel,
              { color: colors.onSurface, fontFamily: fonts.bodySemiBold },
            ]}
          >
            Dark
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
    alignItems: "center",
    paddingHorizontal: 32,
  },
  label: {
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    textAlign: "center",
    marginBottom: 48,
    letterSpacing: -0.5,
  },
  row: {
    flexDirection: "row",
    gap: 24,
  },
  box: {
    width: 140,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
  },
  boxInner: {
    width: "100%",
    aspectRatio: 0.7,
    borderRadius: 10,
    padding: 16,
    justifyContent: "center",
    gap: 8,
  },
  boxLine: {
    height: 4,
    borderRadius: 2,
  },
  boxCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginTop: 4,
  },
  boxLabel: {
    fontSize: 15,
    marginTop: 12,
  },
});
