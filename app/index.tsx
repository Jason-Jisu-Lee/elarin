import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { getOnboarded } from "../src/storage";
import { colors } from "../src/constants";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    getOnboarded().then((val) => {
      setOnboarded(val);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return <Redirect href={onboarded ? "/home" : "/onboarding"} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
  },
});
