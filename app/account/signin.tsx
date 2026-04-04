import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { signIn } from "../../src/auth";
import { setAccountId } from "../../src/storage";
import { useTheme, fonts } from "../../src/theme";

export default function AccountSignIn() {
  const router = useRouter();
  const { colors } = useTheme();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await signIn(username.trim(), password);
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

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: colors.primary }]}>←</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.onSurface }]}>
          Sign In
        </Text>

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
          onChangeText={(t) => setUsername(t.toLowerCase())}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="your username"
          placeholderTextColor={colors.outlineVariant}
          returnKeyType="next"
        />

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
          placeholder="your password"
          placeholderTextColor={colors.outlineVariant}
          returnKeyType="done"
          onSubmitEditing={handleSignIn}
        />

        {error !== "" && (
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        )}

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={[styles.btnText, { color: colors.onPrimary }]}>
              Sign In
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.createLink}
          onPress={() => router.replace("/account/create")}
        >
          <Text style={[styles.createText, { color: colors.primary }]}>
            Don't have an account? Create one
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28, paddingTop: 56 },
  backBtn: { marginBottom: 24 },
  backText: { fontSize: 22, fontFamily: fonts.headlineBold },
  title: { fontSize: 28, fontFamily: fonts.headlineBold, marginBottom: 32 },
  label: { fontSize: 13, fontFamily: fonts.bodySemiBold, marginBottom: 6, marginTop: 16 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: fonts.bodyRegular,
  },
  error: { fontSize: 13, fontFamily: fonts.bodyRegular, marginTop: 12 },
  btn: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  btnText: { fontSize: 16, fontFamily: fonts.headlineBold },
  createLink: { alignItems: "center", marginTop: 20 },
  createText: { fontSize: 14, fontFamily: fonts.bodyRegular },
});
