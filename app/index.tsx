import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { getOnboarded, getAccountId } from "../src/storage";
import { supabase } from "../src/supabase";
import { useTheme } from "../src/theme";

export default function Index() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [destination, setDestination] = useState<string>("/onboarding");

  useEffect(() => {
    async function resolve() {
      const onboarded = await getOnboarded();
      if (!onboarded) {
        setDestination("/onboarding");
        setLoading(false);
        return;
      }
      // Check Supabase session first (survives clearAllLocalData)
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        // Restore accountId from session
        const { setAccountId } = await import("../src/storage");
        await setAccountId(session.user.id);
        setDestination("/home");
        setLoading(false);
        return;
      }
      const accountId = await getAccountId();
      if (!accountId) {
        setDestination("/account/signin");
      } else {
        setDestination("/home");
      }
      setLoading(false);
    }
    resolve();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <Redirect href={destination} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
