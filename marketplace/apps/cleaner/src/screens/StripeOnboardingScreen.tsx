import { useFocusEffect } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { api, ApiError } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { MainTabScreenProps } from "@/navigation";

type Props = MainTabScreenProps<"Payouts">;

export default function StripeOnboardingScreen({}: Props) {
  const { user, refreshMe } = useAuth();
  const [checking, setChecking] = useState(true);
  const [starting, setStarting] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      await api.stripeStatus();
      await refreshMe();
    } finally {
      setChecking(false);
    }
  }, [refreshMe]);

  useFocusEffect(
    useCallback(() => {
      check();
    }, [check]),
  );

  async function onStartOnboarding() {
    setStarting(true);
    try {
      const { url } = await api.stripeOnboardingUrl();
      await WebBrowser.openAuthSessionAsync(url, "cleanerapp://stripe-onboarding-complete");
      await check();
    } catch (err) {
      Alert.alert("Couldn't start payout setup", err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setStarting(false);
    }
  }

  const onboarded = user?.cleanerProfile?.stripeOnboarded;

  return (
    <View style={styles.container}>
      {checking ? (
        <ActivityIndicator />
      ) : onboarded ? (
        <>
          <Text style={styles.title}>You're all set up</Text>
          <Text style={styles.body}>
            Payouts go to your connected bank account after each job's payment clears. You can accept jobs from the
            Available Jobs tab.
          </Text>
          {user?.cleanerProfile && (
            <View style={styles.statsRow}>
              <Text style={styles.stat}>
                {user.cleanerProfile.ratingAvg ? user.cleanerProfile.ratingAvg.toFixed(1) : "—"} ★ (
                {user.cleanerProfile.ratingCount} reviews)
              </Text>
            </View>
          )}
        </>
      ) : (
        <>
          <Text style={styles.title}>Set up payouts</Text>
          <Text style={styles.body}>
            Before you can accept jobs, Stripe needs a few details (identity, bank account) so we can pay you after
            each job. This opens a secure Stripe page — nothing is shared with us directly.
          </Text>
          <Pressable style={styles.button} onPress={onStartOnboarding} disabled={starting}>
            <Text style={styles.buttonText}>{starting ? "Opening…" : "Set up payouts with Stripe"}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700", marginTop: 20 },
  body: { fontSize: 15, color: "#555", marginTop: 12, lineHeight: 22 },
  button: {
    backgroundColor: "#1565C0",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  statsRow: { marginTop: 20 },
  stat: { fontSize: 16, fontWeight: "600" },
});
