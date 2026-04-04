import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { getProfile, saveProfile, getAccountId } from "../src/storage";
import { useTheme, fonts, storeTheme } from "../src/theme";

export default function Profile() {
  const router = useRouter();
  const { colors, setTheme, isDark } = useTheme();
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [showIntroDialog, setShowIntroDialog] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      if (p) setName(p.name);
    });
    getAccountId().then((id) => setHasAccount(!!id));
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

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={[styles.backText, { color: colors.primary }]}>←</Text>
      </TouchableOpacity>

      {/* Profile icon + name (tap to edit) */}
      <View style={styles.header}>
        <View style={[styles.avatarCircle, { borderColor: colors.onSurface }]}>
          <View
            style={[styles.avatarHead, { backgroundColor: colors.onSurface }]}
          />
          <View
            style={[styles.avatarBody, { backgroundColor: colors.onSurface }]}
          />
        </View>
        {editingName ? (
          <TextInput
            style={[
              styles.nameInput,
              { color: colors.onSurface, borderBottomColor: colors.primary },
            ]}
            value={newName}
            onChangeText={setNewName}
            autoFocus
            maxLength={30}
            returnKeyType="done"
            onSubmitEditing={handleSaveName}
            onBlur={handleSaveName}
            placeholder="Your name"
            placeholderTextColor={colors.outlineVariant}
          />
        ) : (
          <TouchableOpacity
            onPress={() => {
              setNewName(name);
              setEditingName(true);
            }}
          >
            <Text style={[styles.name, { color: colors.onSurface }]}>
              {name || "Tap to set name"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Menu items */}
      <View style={styles.menu}>
        {/* Account */}
        <TouchableOpacity
          style={[
            styles.menuItem,
            { backgroundColor: colors.surfaceContainerLowest },
          ]}
          onPress={() =>
            router.push(hasAccount ? "/account" : "/account/create")
          }
        >
          <Text style={[styles.menuText, { color: colors.onSurface }]}>
            Account
          </Text>
        </TouchableOpacity>

        {/* Theme Toggle */}
        <TouchableOpacity
          style={[
            styles.menuItem,
            { backgroundColor: colors.surfaceContainerLowest },
          ]}
          onPress={handleToggleTheme}
        >
          <Text style={[styles.menuText, { color: colors.onSurface }]}>
            {isDark ? "Light Mode" : "Dark Mode"}
          </Text>
        </TouchableOpacity>

        {/* Play Intro */}
        <TouchableOpacity
          style={[
            styles.menuItem,
            { backgroundColor: colors.surfaceContainerLowest },
          ]}
          onPress={() => setShowIntroDialog(true)}
        >
          <Text style={[styles.menuText, { color: colors.onSurface }]}>
            Play Intro
          </Text>
        </TouchableOpacity>
      </View>

      {/* Play Intro confirmation modal */}
      <Modal
        visible={showIntroDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIntroDialog(false)}
      >
        <TouchableOpacity
          style={styles.dialogOverlay}
          activeOpacity={1}
          onPress={() => setShowIntroDialog(false)}
        >
          <View
            style={[
              styles.dialogCard,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.onSurface }]}>
              Play Intro?
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogBtn}
                onPress={() => setShowIntroDialog(false)}
              >
                <Text
                  style={[
                    styles.dialogBtnText,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  No
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogBtn}
                onPress={() => {
                  setShowIntroDialog(false);
                  router.push("/onboarding?replay=1");
                }}
              >
                <Text
                  style={[styles.dialogBtnText, { color: colors.onSurface }]}
                >
                  Yes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  name: {
    fontSize: 24,
    fontFamily: fonts.headlineExtraBold,
    textAlign: "center",
  },
  nameInput: {
    fontSize: 24,
    fontFamily: fonts.headlineExtraBold,
    textAlign: "center",
    borderBottomWidth: 2,
    paddingBottom: 4,
    minWidth: 120,
  },
  menu: { gap: 0 },
  menuItem: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  menuText: { fontSize: 15, fontFamily: fonts.bodyMedium },
  // Dialog
  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  dialogCard: {
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 32,
    minWidth: 240,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  dialogTitle: {
    fontSize: 18,
    fontFamily: fonts.headlineBold,
    marginBottom: 24,
  },
  dialogActions: {
    flexDirection: "row",
    gap: 32,
  },
  dialogBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dialogBtnText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
  },
});
