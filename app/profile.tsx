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
import { colors } from "../src/constants";
import { getProfile, saveProfile, setSwipeTutorialShown } from "../src/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Profile() {
  const router = useRouter();
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

  const handleReplayTutorial = async () => {
    await AsyncStorage.setItem("elarin:swipe_tutorial_shown", "false");
    Alert.alert(
      "Tutorial reset",
      "The swipe tutorial will show next time you open the home screen.",
    );
  };

  return (
    <View style={styles.container}>
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Profile icon + name */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <View style={styles.avatarHead} />
          <View style={styles.avatarBody} />
        </View>
        <Text style={styles.name}>{name || "You"}</Text>
      </View>

      {/* Menu items */}
      <View style={styles.menu}>
        {/* Edit Name */}
        {editingName ? (
          <View style={styles.editNameRow}>
            <TextInput
              style={styles.nameInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter name"
              placeholderTextColor={colors.textMuted}
              autoFocus
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            <TouchableOpacity
              style={styles.saveNameBtn}
              onPress={handleSaveName}
            >
              <Text style={styles.saveNameText}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setNewName(name);
              setEditingName(true);
            }}
          >
            <Text style={styles.menuIcon}>👤</Text>
            <Text style={styles.menuText}>Edit Name</Text>
          </TouchableOpacity>
        )}

        {/* Replay Tutorial */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleReplayTutorial}
        >
          <Text style={styles.menuIcon}>🔄</Text>
          <Text style={styles.menuText}>Replay Tutorial</Text>
        </TouchableOpacity>

        {/* About */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Alert.alert("Elarin", "Version 0.2.0")}
        >
          <Text style={styles.menuIcon}>ℹ️</Text>
          <Text style={styles.menuText}>About</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
  },
  backBtn: {
    paddingTop: 56,
    marginBottom: 24,
  },
  backText: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: "600",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 12,
  },
  avatarHead: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text,
    position: "absolute",
    top: 10,
  },
  avatarBody: {
    width: 44,
    height: 28,
    borderRadius: 22,
    backgroundColor: colors.text,
    position: "absolute",
    bottom: -6,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  menu: {
    gap: 0,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  menuText: {
    fontSize: 17,
    fontWeight: "500",
    color: colors.text,
  },
  editNameRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  nameInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 18,
    fontSize: 17,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  saveNameBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  saveNameText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
