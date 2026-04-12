import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { resendVerification } from "../src/auth";
import { supabase } from "../src/supabase";
import { setAccountId, setOnboarded } from "../src/storage";
import { useTheme, fonts } from "../src/theme";

export default function AccountVerify() {
  const router = useRouter();
  const { colors } = useTheme();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  // Listen for auth state changes (fires when email link is clicked and app reopens)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (
          (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
          session?.user
        ) {
          await setAccountId(session.user.id);
          await setOnboarded(true);
          router.replace("/home");
        }
      },
    );
    return () => sub.subscription.unsubscribe();
  }, [router]);

  // Also check session when app comes back to foreground (fallback)
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          await setAccountId(session.user.id);
          await setOnboarded(true);
          router.replace("/home");
        }
      }
    });
    return () => sub.remove();
  }, [router]);

  const handleResend = async () => {
    if (!email) return;
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const err = await resendVerification(email);
      if (err) {
        setError(err.message);
      } else {
        setInfo("Verification email resent!");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.content}>
        <Text style={[styles.icon]}>✉️</Text>
        <Text style={[styles.title, { color: colors.onSurface }]}>
          Check Your Email
        </Text>
        <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
          We sent a verification link to
        </Text>
        <Text style={[styles.email, { color: colors.primary }]}>
          {email ?? "your email"}
        </Text>
        <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
          Tap the link in the email to verify your account. The link expires in
          24 hours.
        </Text>
        <Text
          style={[
            styles.hint,
            { color: colors.onSurfaceVariant, opacity: 0.7 },
          ]}
        >
          Once verified, the app will automatically sign you in.
        </Text>

        {error !== "" && (
          <Text style={[styles.msg, { color: colors.error }]}>{error}</Text>
        )}
        {info !== "" && (
          <Text style={[styles.msg, { color: colors.primary }]}>{info}</Text>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={handleResend}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
              Resend Email
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.6}
        >
          <Text
            style={[styles.backBtnText, { color: colors.onSurfaceVariant }]}
          >
            ← Go Back
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },
  content: {
    paddingHorizontal: 32,
    alignItems: "center",
  },
  icon: {
    fontSize: 48,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.headlineBold,
    textAlign: "center",
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    fontFamily: fonts.bodyRegular,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 4,
  },
  email: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
    textAlign: "center",
    marginBottom: 12,
  },
  hint: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 16,
  },
  msg: {
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
    textAlign: "center",
    marginTop: 12,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    marginTop: 32,
    width: "100%",
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: fonts.headlineBold,
  },
  backBtn: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 8,
  },
  backBtnText: {
    fontSize: 15,
    fontFamily: fonts.bodyMedium,
  },
});
