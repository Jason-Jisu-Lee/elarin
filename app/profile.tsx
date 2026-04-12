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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getProfile,
  saveProfile,
  getAccountId,
  clearAllLocalData,
  setOnboarded,
} from "../src/storage";
import { signOut, updateUsername, isUsernameTaken } from "../src/auth";
import { useTheme, fonts, storeTheme } from "../src/theme";

const USERNAME_RE = /^[a-zA-Z0-9]{3,15}$/;

export default function Profile() {
  const router = useRouter();
  const { colors, setTheme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");
  const [showIntroDialog, setShowIntroDialog] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [accountId, setCurrentAccountId] = useState<string | null>(null);

  useEffect(() => {
    getProfile().then((p) => {
      if (p) setUsername(p.username ?? "");
    });
    getAccountId().then((id) => {
      setHasAccount(!!id);
      setCurrentAccountId(id);
    });
  }, []);

  const handleSaveUsername = async () => {
    const trimmed = newName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 15);
    if (!USERNAME_RE.test(trimmed)) {
      setNameError("3-15 letters or numbers only.");
      return;
    }
    if (hasAccount && accountId) {
      const taken = await isUsernameTaken(trimmed);
      if (taken && trimmed.toLowerCase() !== username.toLowerCase()) {
        setNameError("That username is already taken.");
        return;
      }
      const err = await updateUsername(accountId, trimmed);
      if (err) {
        setNameError(err.message);
        return;
      }
    }
    await saveProfile({ username: trimmed });
    setUsername(trimmed);
    setEditingName(false);
    setNameError("");
  };

  const handleToggleTheme = async () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    await storeTheme(next);
  };

  const handleSignOut = async () => {
    setShowSignOutDialog(false);
    await signOut();
    await clearAllLocalData();
    await setOnboarded(true);
    router.replace("/account/signin");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={[styles.backText, { color: colors.primary }]}>
          {"\u2190"}
        </Text>
      </TouchableOpacity>

      {/* Avatar + username (tap to edit) */}
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
          <View style={styles.editBlock}>
            <TextInput
              style={[
                styles.nameInput,
                { color: colors.onSurface, borderBottomColor: colors.primary },
              ]}
              value={newName}
              onChangeText={(t) =>
                setNewName(t.replace(/[^a-zA-Z0-9]/g, "").slice(0, 15))
              }
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={15}
              returnKeyType="done"
              onSubmitEditing={handleSaveUsername}
              onBlur={handleSaveUsername}
              placeholder="username"
              placeholderTextColor={colors.outlineVariant}
            />
            {nameError !== "" && (
              <Text style={[styles.nameError, { color: colors.error }]}>
                {nameError}
              </Text>
            )}
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => {
              setNewName(username);
              setNameError("");
              setEditingName(true);
            }}
          >
            <Text style={[styles.name, { color: colors.onSurface }]}>
              {username || "Tap to set username"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Menu items */}
      <View style={styles.menu}>
        {/* Account — disabled when not logged in */}
        <TouchableOpacity
          style={[
            styles.menuItem,
            {
              backgroundColor: colors.surfaceContainerLowest,
              opacity: hasAccount ? 1 : 0.4,
            },
          ]}
          onPress={() => hasAccount && router.push("/account")}
          disabled={!hasAccount}
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

      {/* Spacer to push login/logout to bottom */}
      <View style={{ flex: 1 }} />

      {/* Sign In / Sign Out at the bottom */}
      {hasAccount ? (
        <TouchableOpacity
          style={[
            styles.bottomBtn,
            {
              backgroundColor: colors.surfaceContainerLowest,
              marginBottom: Math.max(insets.bottom + 16, 40),
            },
          ]}
          onPress={() => setShowSignOutDialog(true)}
        >
          <Text style={[styles.menuText, { color: colors.error }]}>
            Log out
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[
            styles.bottomBtn,
            {
              backgroundColor: colors.surfaceContainerLowest,
              marginBottom: Math.max(insets.bottom + 16, 40),
            },
          ]}
          onPress={() => router.push("/account/signin")}
        >
          <Text style={[styles.menuText, { color: colors.primary }]}>
            Log in
          </Text>
        </TouchableOpacity>
      )}

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

      {/* Sign Out confirmation modal */}
      <Modal
        visible={showSignOutDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutDialog(false)}
      >
        <TouchableOpacity
          style={styles.dialogOverlay}
          activeOpacity={1}
          onPress={() => setShowSignOutDialog(false)}
        >
          <View
            style={[
              styles.dialogCard,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.onSurface }]}>
              Log out?
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogBtn}
                onPress={() => setShowSignOutDialog(false)}
              >
                <Text
                  style={[
                    styles.dialogBtnText,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogBtn}
                onPress={handleSignOut}
              >
                <Text style={[styles.dialogBtnText, { color: colors.error }]}>
                  Log out
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
  editBlock: { alignItems: "center" },
  nameInput: {
    fontSize: 24,
    fontFamily: fonts.headlineExtraBold,
    textAlign: "center",
    borderBottomWidth: 2,
    paddingBottom: 4,
    minWidth: 120,
  },
  nameError: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
    marginTop: 4,
    textAlign: "center",
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
  bottomBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
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
    marginBottom: 8,
    textAlign: "center",
  },
  dialogBody: {
    fontSize: 14,
    fontFamily: fonts.bodyRegular,
    marginBottom: 20,
    textAlign: "center",
  },
  dialogActions: { flexDirection: "row", gap: 24 },
  dialogBtn: { paddingVertical: 4 },
  dialogBtnText: { fontSize: 15, fontFamily: fonts.bodySemiBold },
});
