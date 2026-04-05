import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  getAccountId as getAccountIdFromAuth,
  getAccountEmail,
  resetPassword,
} from "../../src/auth";
import { useTheme, fonts } from "../../src/theme";
import { supabase } from "../../src/supabase";

interface ProfileRow {
  username: string;
  birthday: string;
}

export default function AccountIndex() {
  const router = useRouter();
  const { colors } = useTheme();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetMsg, setResetMsg] = useState("");
  const [resetErr, setResetErr] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    (async () => {
      const userId = await getAccountIdFromAuth();
      if (!userId) {
        router.replace("/profile");
        return;
      }
      const [{ data }, accountEmail] = await Promise.all([
        supabase
          .from("profiles")
          .select("username, birthday")
          .eq("id", userId)
          .single(),
        getAccountEmail(),
      ]);
      setProfile(data ?? null);
      setEmail(accountEmail);
      setLoading(false);
    })();
  }, []);

  const handleResetPassword = async () => {
    if (!email) return;
    setResetting(true);
    setResetMsg("");
    setResetErr("");
    const err = await resetPassword(email);
    if (err) {
      setResetErr(err.message);
    } else {
      setResetMsg("Password reset email sent!");
    }
    setResetting(false);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={[styles.backText, { color: colors.primary }]}>
          {"\u2190"}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.onSurface }]}>Account</Text>

      {profile && (
        <View style={styles.infoBlock}>
          <View
            style={[
              styles.infoRow,
              { backgroundColor: colors.surfaceContainerLowest },
            ]}
          >
            <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant }]}>
              Username
            </Text>
            <Text style={[styles.infoValue, { color: colors.onSurface }]}>
              {profile.username || "\u2014"}
            </Text>
          </View>

          <View
            style={[
              styles.infoRow,
              { backgroundColor: colors.surfaceContainerLowest },
            ]}
          >
            <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant }]}>
              Email
            </Text>
            <Text style={[styles.infoValue, { color: colors.onSurface }]}>
              {email ?? "\u2014"}
            </Text>
          </View>

          <View
            style={[
              styles.infoRow,
              { backgroundColor: colors.surfaceContainerLowest },
            ]}
          >
            <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant }]}>
              Birthday
            </Text>
            <Text style={[styles.infoValue, { color: colors.onSurface }]}>
              {profile.birthday || "Not set"}
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.resetBtn,
          { backgroundColor: colors.surfaceContainerLowest },
        ]}
        onPress={handleResetPassword}
        disabled={resetting}
        activeOpacity={0.7}
      >
        {resetting ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={[styles.resetBtnText, { color: colors.primary }]}>
            Reset Password
          </Text>
        )}
      </TouchableOpacity>

      {resetMsg !== "" && (
        <Text style={[styles.msg, { color: colors.primary }]}>{resetMsg}</Text>
      )}
      {resetErr !== "" && (
        <Text style={[styles.msg, { color: colors.error }]}>{resetErr}</Text>
      )}
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
  resetBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  resetBtnText: { fontSize: 15, fontFamily: fonts.bodySemiBold },
  msg: {
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
    marginTop: 10,
    textAlign: "center",
  },
});
