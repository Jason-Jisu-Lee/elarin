import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  getAccountId as getAccountIdFromAuth,
  signOut,
  getAccountEmail,
} from "../../src/auth";
import { clearAccountId } from "../../src/storage";
import { useTheme, fonts } from "../../src/theme";
import { supabase } from "../../src/supabase";

interface ProfileRow {
  username: string;
  birthday: string;
  created_at: string;
}

export default function AccountIndex() {
  const router = useRouter();
  const { colors } = useTheme();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  useEffect(() => {
    (async () => {
      const userId = await getAccountIdFromAuth();
      if (!userId) {
        router.replace("/account/create");
        return;
      }
      const [{ data }, accountEmail] = await Promise.all([
        supabase
          .from("profiles")
          .select("username, birthday, created_at")
          .eq("id", userId)
          .single(),
        getAccountEmail(),
      ]);
      setProfile(data ?? null);
      setEmail(accountEmail);
      setLoading(false);
    })();
  }, []);

  const handleSignOut = async () => {
    setShowSignOutDialog(false);
    await signOut();
    await clearAccountId();
    router.replace("/profile");
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const joinYear = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={[styles.backText, { color: colors.primary }]}>←</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.onSurface }]}>Account</Text>

      {profile ? (
        <View style={styles.infoBlock}>
          <View
            style={[
              styles.infoRow,
              { backgroundColor: colors.surfaceContainerLowest },
            ]}
          >
            <Text
              style={[styles.infoLabel, { color: colors.onSurfaceVariant }]}
            >
              Username
            </Text>
            <Text style={[styles.infoValue, { color: colors.onSurface }]}>
              {profile.username}
            </Text>
          </View>

          {joinYear && (
            <View
              style={[
                styles.infoRow,
                { backgroundColor: colors.surfaceContainerLowest },
              ]}
            >
              <Text
                style={[styles.infoLabel, { color: colors.onSurfaceVariant }]}
              >
                Email
              </Text>
              <Text style={[styles.infoValue, { color: colors.onSurface }]}>
                {email ?? "—"}
              </Text>
            </View>
          )}

          {joinYear && (
            <View
              style={[
                styles.infoRow,
                { backgroundColor: colors.surfaceContainerLowest },
              ]}
            >
              <Text
                style={[styles.infoLabel, { color: colors.onSurfaceVariant }]}
              >
                Member since
              </Text>
              <Text style={[styles.infoValue, { color: colors.onSurface }]}>
                {joinYear}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <Text style={[styles.noProfile, { color: colors.onSurfaceVariant }]}>
          Could not load profile.
        </Text>
      )}

      <TouchableOpacity
        style={[styles.signOutBtn, { borderColor: colors.error }]}
        onPress={() => setShowSignOutDialog(true)}
      >
        <Text style={[styles.signOutText, { color: colors.error }]}>
          Sign Out
        </Text>
      </TouchableOpacity>

      {/* Sign out confirmation */}
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
              Sign out?
            </Text>
            <Text
              style={[styles.dialogBody, { color: colors.onSurfaceVariant }]}
            >
              Your goals and progress stay on this device.
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
                  Sign Out
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { flex: 1, paddingHorizontal: 24 },
  backBtn: { paddingTop: 56, marginBottom: 24 },
  backText: { fontSize: 22, fontFamily: fonts.headlineBold },
  title: { fontSize: 28, fontFamily: fonts.headlineBold, marginBottom: 32 },
  infoBlock: { gap: 2 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
  },
  infoLabel: { fontSize: 14, fontFamily: fonts.bodyRegular },
  infoValue: { fontSize: 14, fontFamily: fonts.bodySemiBold },
  noProfile: { fontSize: 14, fontFamily: fonts.bodyRegular },
  signOutBtn: {
    marginTop: 40,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: { fontSize: 15, fontFamily: fonts.bodySemiBold },
  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  dialogCard: {
    width: "100%",
    borderRadius: 16,
    padding: 24,
  },
  dialogTitle: {
    fontSize: 18,
    fontFamily: fonts.headlineBold,
    marginBottom: 8,
  },
  dialogBody: {
    fontSize: 14,
    fontFamily: fonts.bodyRegular,
    marginBottom: 20,
    lineHeight: 20,
  },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: 24 },
  dialogBtn: { paddingVertical: 4 },
  dialogBtnText: { fontSize: 15, fontFamily: fonts.bodySemiBold },
});
