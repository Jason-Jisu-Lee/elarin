import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { getProfile, saveProfile } from "../src/storage";
import { useTheme, fonts, storeTheme } from "../src/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Profile() {
  const router = useRouter();
  const { colors, theme, setTheme, isDark } = useTheme();
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    getProfile().then((p) => {
      if (p) setName(p.name);
    });
  }, []);

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    await saveProfile({ name: newName.trim() });
    setName(newName.trim());
    setEditingName(false);
  };

  const handleToggleTheme = async () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    await storeTheme(next);
  };

  const handleReplayTutorial = async () => {
    await AsyncStorage.setItem("elarin:swipe_tutorial_shown", "false");
    Alert.alert(
      "Tutorial reset",
      "The swipe tutorial will show next time you open the home screen.",
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={[styles.backText, { color: colors.primary }]}>←</Text>
      </TouchableOpacity>

      {/* Profile icon + name */}
      <View style={styles.header}>
        <View style={[styles.avatarCircle, { borderColor: colors.onSurface }]}>
          <View
            style={[styles.avatarHead, { backgroundColor: colors.onSurface }]}
          />
          <View
            style={[styles.avatarBody, { backgroundColor: colors.onSurface }]}
          />
        </View>
        <Text style={[styles.name, { color: colors.onSurface }]}>
          {name || "You"}
        </Text>
      </View>

      {/* Menu items */}
      <View style={styles.menu}>
        {/* Edit Name */}
        {editingName ? (
          <View style={styles.editNameRow}>
            <TextInput
              style={[
                styles.nameInput,
                {
                  backgroundColor: colors.surfaceContainerHigh,
                  color: colors.onSurface,
                  borderColor: colors.primary,
                },
              ]}
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter name"
              placeholderTextColor={colors.outlineVariant}
              autoFocus
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            <TouchableOpacity
              style={[styles.saveNameBtn, { backgroundColor: colors.primary }]}
              onPress={handleSaveName}
            >
              <Text style={[styles.saveNameText, { color: colors.onPrimary }]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.menuItem,
              { backgroundColor: colors.surfaceContainerLowest },
            ]}
            onPress={() => {
              setNewName(name);
              setEditingName(true);
            }}
          >
            <Text style={[styles.menuText, { color: colors.onSurface }]}>
              Edit Name
            </Text>
          </TouchableOpacity>
        )}

        {/* Theme Toggle */}
        <TouchableOpacity
          style={[
            styles.menuItem,
            { backgroundColor: colors.surfaceContainerLowest },
          ]}
          onPress={handleToggleTheme}
        >
          <Text style={[styles.menuText, { color: colors.onSurface }]}>
            Theme: {isDark ? "Dark" : "Light"}
          </Text>
          <Text style={[styles.menuHint, { color: colors.onSurfaceVariant }]}>
            Tap to switch
          </Text>
        </TouchableOpacity>

        {/* Replay Tutorial */}
        <TouchableOpacity
          style={[
            styles.menuItem,
            { backgroundColor: colors.surfaceContainerLowest },
          ]}
          onPress={handleReplayTutorial}
        >
          <Text style={[styles.menuText, { color: colors.onSurface }]}>
            Replay Tutorial
          </Text>
        </TouchableOpacity>

        {/* About */}
        <TouchableOpacity
          style={[
            styles.menuItem,
            { backgroundColor: colors.surfaceContainerLowest },
          ]}
          onPress={() => Alert.alert("Elarin", "Version 0.2.0")}
        >
          <Text style={[styles.menuText, { color: colors.onSurface }]}>
            About
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  backBtn: { paddingTop: 56, marginBottom: 24 },
  backText: { fontSize: 22, fontFamily: fonts.headlineBold },
  header: { alignItems: "center", marginBottom: 40 },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 12,
  },
  avatarHead: {
    width: 24,
    height: 24,
    borderRadius: 12,
    position: "absolute",
    top: 10,
  },
  avatarBody: {
    width: 44,
    height: 28,
    borderRadius: 22,
    position: "absolute",
    bottom: -6,
  },
  name: { fontSize: 24, fontFamily: fonts.headlineExtraBold },
  menu: { gap: 0 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    padding: 18,
    marginBottom: 10,
  },
  menuText: { fontSize: 17, fontFamily: fonts.bodyMedium },
  menuHint: { fontSize: 13, fontFamily: fonts.bodyRegular },
  editNameRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  nameInput: {
    flex: 1,
    borderRadius: 14,
    padding: 18,
    fontSize: 17,
    fontFamily: fonts.bodyRegular,
    borderWidth: 1,
  },
  saveNameBtn: {
    borderRadius: 14,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  saveNameText: { fontSize: 16, fontFamily: fonts.bodySemiBold },
});
