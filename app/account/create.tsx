import { useState, useEffect } from "react";
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
import { signUp, isUsernameTaken } from "../../src/auth";
import { setAccountId, getProfile } from "../../src/storage";
import { useTheme, fonts } from "../../src/theme";

const USERNAME_RE = /^[a-zA-Z0-9]{3,15}$/;
const PASSWORD_RE = /^[a-zA-Z0-9!@#$%^&*]{6,18}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export default function AccountCreate() {
  const router = useRouter();
  const { colors } = useTheme();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      if (p?.username) setUsername(p.username);
    });
  }, []);

  const validate = (): string | null => {
    if (!USERNAME_RE.test(username))
      return "Username must be 3â€“15 letters or numbers.";
    if (!EMAIL_RE.test(email.trim()))
      return "Please enter a valid email address.";
    if (!PASSWORD_RE.test(password))
      return "Password must be 6â€“18 chars: letters, numbers, or !@#$%^&*";
    if (!birthday) return "Please select your birthday.";
    const age =
      (Date.now() - birthday.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 13) return "You must be at least 13 years old.";
    return null;
  };

  const handleCreate = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const taken = await isUsernameTaken(username);
      if (taken) {
        setError("That username is already taken.");
        return;
      }

      const result = await signUp({
        username,
        email: email.trim(),
        password,
        birthday: formatDate(birthday!),
      });

      if ("message" in result) {
        setError(result.message);
        return;
      }

      await setAccountId(result.userId);
      router.replace("/account");
    } finally {
      setLoading(false);
    }
  };

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 13);

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
          Create Account
        </Text>
        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          Your progress stays on this device. An account lets you restore it if
          you switch phones.
        </Text>

        {/* Username */}
        <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
          Username
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
          value={username}
          onChangeText={(t) =>
            setUsername(t.replace(/[^a-zA-Z0-9]/g, "").slice(0, 15))
          }
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={15}
          placeholder="e.g. Alex42"
          placeholderTextColor={colors.outlineVariant}
          returnKeyType="next"
        />

        {/* Email */}
        <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
          Email
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
          placeholder="you@example.com"
          placeholderTextColor={colors.outlineVariant}
          returnKeyType="next"
        />

        {/* Password */}
        <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
          Password
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
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          maxLength={18}
          placeholder="6â€“18 characters"
          placeholderTextColor={colors.outlineVariant}
          returnKeyType="done"
        />

        {/* Birthday */}
        <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
          Birthday
        </Text>
        <TouchableOpacity
          style={[
            styles.input,
            styles.dateBtn,
            {
              borderColor: colors.outlineVariant,
              backgroundColor: colors.surfaceContainerLowest,
            },
          ]}
          onPress={() => setShowPicker(true)}
        >
          <Text
            style={{
              color: birthday ? colors.onSurface : colors.outlineVariant,
              fontFamily: fonts.bodyRegular,
              fontSize: 16,
            }}
          >
            {birthday ? displayDate(birthday) : "Select date"}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            mode="date"
            display="spinner"
            value={birthday ?? maxDate}
            maximumDate={maxDate}
            onChange={(_, date) => {
              setShowPicker(Platform.OS === "ios");
              if (date) setBirthday(date);
            }}
          />
        )}

        {error !== "" && (
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        )}

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={[styles.btnText, { color: colors.onPrimary }]}>
              Create Account
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signinLink}
          onPress={() => router.replace("/account/signin")}
        >
          <Text style={[styles.signinText, { color: colors.primary }]}>
            Already have an account? Sign in
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 28, paddingTop: 72, paddingBottom: 40 },
  title: { fontSize: 28, fontFamily: fonts.headlineBold, marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.bodyRegular,
    marginBottom: 32,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: fonts.bodyRegular,
  },
  dateBtn: { justifyContent: "center" },
  error: { fontSize: 13, fontFamily: fonts.bodyRegular, marginTop: 12 },
  btn: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  btnText: { fontSize: 16, fontFamily: fonts.headlineBold },
  signinLink: { alignItems: "center", marginTop: 20 },
  signinText: { fontSize: 14, fontFamily: fonts.bodyRegular },
});
