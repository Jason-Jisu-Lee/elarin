import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  getAccountId as getAccountIdFromAuth,
  getAccountEmail,
  getAccountName,
  resetPassword,
  updateUsername,
  updateEmail,
  updateName,
  updateBirthday,
  isUsernameTaken,
} from "../../src/auth";
import { getProfile as getLocalProfile } from "../../src/storage";
import { useTheme, fonts } from "../../src/theme";
import { supabase } from "../../src/supabase";

interface ProfileRow {
  username: string;
  birthday: string;
}

function parseBirthday(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function displayDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AccountIndex() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetMsg, setResetMsg] = useState("");
  const [resetErr, setResetErr] = useState("");
  const [resetting, setResetting] = useState(false);

  // Editing state
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    (async () => {
      const id = await getAccountIdFromAuth();
      if (!id) {
        router.replace("/profile");
        return;
      }
      setUserId(id);
      const [{ data }, accountEmail, accountName, localProfile] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("username, birthday")
            .eq("id", id)
            .single(),
          getAccountEmail(),
          getAccountName(),
          getLocalProfile(),
        ]);
      const profileData = data ?? { username: "", birthday: "" };
      // Fallback to local profile username if Supabase profile is empty
      if (!profileData.username && localProfile?.username) {
        profileData.username = localProfile.username;
      }
      setProfile(profileData);
      setEmail(accountEmail);
      setName(accountName);
      setLoading(false);
    })();
  }, []);

  const startEdit = (field: string, currentValue: string) => {
    if (field === "birthday") {
      setShowDatePicker(true);
      return;
    }
    setEditField(field);
    setEditValue(currentValue);
    setEditError("");
  };

  const cancelEdit = () => {
    setEditField(null);
    setEditValue("");
    setEditError("");
  };

  const saveEdit = async () => {
    if (!userId) return;
    const trimmed = editValue.trim();
    setSaving(true);
    setEditError("");

    try {
      if (editField === "username") {
        if (!/^[a-zA-Z0-9]{3,15}$/.test(trimmed)) {
          setEditError("3-15 letters or numbers only.");
          return;
        }
        const taken = await isUsernameTaken(trimmed);
        if (
          taken &&
          trimmed.toLowerCase() !== (profile?.username ?? "").toLowerCase()
        ) {
          setEditError("That username is already taken.");
          return;
        }
        const err = await updateUsername(userId, trimmed);
        if (err) {
          setEditError(err.message);
          return;
        }
        setProfile((p) => (p ? { ...p, username: trimmed } : p));
      } else if (editField === "email") {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          setEditError("Please enter a valid email.");
          return;
        }
        const err = await updateEmail(trimmed);
        if (err) {
          setEditError(err.message);
          return;
        }
        setEmail(trimmed);
      } else if (editField === "name") {
        if (trimmed.length > 50) {
          setEditError("Name is too long.");
          return;
        }
        const err = await updateName(trimmed);
        if (err) {
          setEditError(err.message);
          return;
        }
        setName(trimmed);
      }
      setEditField(null);
      setEditValue("");
    } finally {
      setSaving(false);
    }
  };

  const handleBirthdayChange = async (_: any, date?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (!date || !userId) return;
    setSaving(true);
    const formatted = formatDate(date);
    const err = await updateBirthday(userId, formatted);
    setSaving(false);
    if (!err) {
      setProfile((p) => (p ? { ...p, birthday: formatted } : p));
    }
  };

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

  const rows: { label: string; key: string; value: string }[] = [
    { label: "Username", key: "username", value: profile?.username || "" },
    { label: "Email", key: "email", value: email ?? "" },
    { label: "Name", key: "name", value: name ?? "" },
    {
      label: "Birthday",
      key: "birthday",
      value: profile?.birthday
        ? displayDate(parseBirthday(profile.birthday) ?? new Date())
        : "Not set",
    },
  ];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, paddingTop: insets.top + 16 },
      ]}
    >
      <Text style={[styles.title, { color: colors.onSurface }]}>Account</Text>

      <View style={styles.infoBlock}>
        {rows.map((row) => (
          <TouchableOpacity
            key={row.key}
            style={[
              styles.infoRow,
              { backgroundColor: colors.surfaceContainerLowest },
            ]}
            onPress={() =>
              startEdit(row.key, row.value === "Not set" ? "" : row.value)
            }
            activeOpacity={0.7}
          >
            {editField === row.key ? (
              <View style={styles.editRow}>
                <Text
                  style={[styles.infoLabel, { color: colors.onSurfaceVariant }]}
                >
                  {row.label}
                </Text>
                <View style={styles.editInputRow}>
                  <TextInput
                    style={[
                      styles.editInput,
                      {
                        color: colors.onSurface,
                        borderBottomColor: colors.primary,
                      },
                    ]}
                    value={editValue}
                    onChangeText={setEditValue}
                    autoFocus
                    autoCapitalize={row.key === "email" ? "none" : "words"}
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={saveEdit}
                    placeholder={row.label}
                    placeholderTextColor={colors.outlineVariant}
                  />
                  <TouchableOpacity onPress={cancelEdit} style={styles.editBtn}>
                    <Text
                      style={{
                        color: colors.onSurfaceVariant,
                        fontSize: 14,
                        fontFamily: fonts.bodyMedium,
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={saveEdit}
                    disabled={saving}
                    style={styles.editBtn}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text
                        style={{
                          color: colors.primary,
                          fontSize: 14,
                          fontFamily: fonts.bodySemiBold,
                        }}
                      >
                        Save
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
                {editError !== "" && (
                  <Text style={[styles.editError, { color: colors.error }]}>
                    {editError}
                  </Text>
                )}
              </View>
            ) : (
              <>
                <Text
                  style={[styles.infoLabel, { color: colors.onSurfaceVariant }]}
                >
                  {row.label}
                </Text>
                <Text style={[styles.infoValue, { color: colors.onSurface }]}>
                  {row.value || "\u2014"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {showDatePicker && (
        <DateTimePicker
          mode="date"
          display="spinner"
          value={parseBirthday(profile?.birthday ?? "") ?? new Date(2000, 0, 1)}
          minimumDate={new Date(1900, 0, 1)}
          maximumDate={new Date()}
          onChange={handleBirthdayChange}
        />
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
  title: { fontSize: 28, fontFamily: fonts.headlineBold, marginBottom: 32 },
  infoBlock: { gap: 2 },
  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
  },
  infoLabel: { fontSize: 14, fontFamily: fonts.bodyRegular },
  infoValue: { fontSize: 14, fontFamily: fonts.bodySemiBold },
  editRow: { width: "100%" },
  editInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
  },
  editInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    borderBottomWidth: 2,
    paddingBottom: 4,
    paddingHorizontal: 0,
  },
  editBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  editError: { fontSize: 12, fontFamily: fonts.bodyRegular, marginTop: 4 },
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
