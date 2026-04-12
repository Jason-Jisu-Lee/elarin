import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { signUp } from "../src/auth";
import { getProfile, saveProfile } from "../src/storage";
import { useTheme, fonts } from "../src/theme";

const PASSWORD_RE = /^[a-zA-Z0-9!@#$%^&*]{6,18}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AccountSetup() {
  const router = useRouter();
  const { colors } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [showBdayPicker, setShowBdayPicker] = useState(false);

  const formatDate = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const handleCreate = async () => {
    if (!EMAIL_RE.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!PASSWORD_RE.test(password)) {
      setError("Password must be 6-18 chars: letters, numbers, or !@#$%^&*");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!birthday) {
      setError("Please select your birthday.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const profile = await getProfile();
      const username = profile?.username ?? "";
      const bdayStr = formatDate(birthday);
      await saveProfile({ username, birthday: bdayStr });

      const result = await signUp({
        username,
        email: email.trim(),
        password,
        birthday: bdayStr,
      });

      if ("message" in result) {
        if (result.message.toLowerCase().includes("check your email")) {
          router.push({
            pathname: "/account-verify",
            params: { email: email.trim() },
          });
        } else {
          setError(result.message);
        }
        return;
      }

      // Direct sign-up without email confirmation (shouldn't happen, but handle it)
      const { setAccountId } = await import("../src/storage");
      await setAccountId(result.userId);
      router.replace("/home");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.onSurface }]}>
          Account Creation
        </Text>
        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          This is required to sync your data as a user and generate analytics
          only
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              color: colors.onSurface,
              borderColor: colors.outlineVariant,
              backgroundColor: colors.surfaceContainerLowest,
            },
          ]}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="E-mail"
          placeholderTextColor={colors.outlineVariant}
          returnKeyType="next"
        />

        <TextInput
          style={[
            styles.input,
            {
              color: colors.onSurface,
              borderColor: colors.outlineVariant,
              backgroundColor: colors.surfaceContainerLowest,
            },
          ]}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          maxLength={18}
          placeholder="Password"
          placeholderTextColor={colors.outlineVariant}
          returnKeyType="next"
        />

        <TextInput
          style={[
            styles.input,
            {
              color: colors.onSurface,
              borderColor: colors.outlineVariant,
              backgroundColor: colors.surfaceContainerLowest,
            },
          ]}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          maxLength={18}
          placeholder="Confirm password"
          placeholderTextColor={colors.outlineVariant}
          returnKeyType="done"
          onSubmitEditing={handleCreate}
        />

        <TouchableOpacity
          style={[
            styles.input,
            styles.birthdayBtn,
            {
              borderColor: colors.outlineVariant,
              backgroundColor: colors.surfaceContainerLowest,
            },
          ]}
          onPress={() => setShowBdayPicker(true)}
          activeOpacity={0.7}
        >
          <Text
            style={{
              color: birthday ? colors.onSurface : colors.outlineVariant,
              fontFamily: fonts.bodyRegular,
              fontSize: 15,
            }}
          >
            {birthday
              ? birthday.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "Birthday"}
          </Text>
        </TouchableOpacity>
        {showBdayPicker && (
          <DateTimePicker
            mode="date"
            display="spinner"
            value={birthday ?? new Date(2000, 0, 1)}
            minimumDate={new Date(1900, 0, 1)}
            maximumDate={new Date()}
            onChange={(_, date) => {
              if (Platform.OS === "android") setShowBdayPicker(false);
              if (date) setBirthday(date);
            }}
          />
        )}

        {error !== "" && (
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
              Create and Verify
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 64,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontFamily: fonts.headlineBold,
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.bodyRegular,
    lineHeight: 20,
    marginBottom: 36,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.bodyRegular,
    marginBottom: 14,
  },
  error: {
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
    marginBottom: 12,
  },
  birthdayBtn: {
    justifyContent: "center",
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 14,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: fonts.headlineBold,
  },
});
