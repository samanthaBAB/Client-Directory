import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api, ApiError } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { MainTabScreenProps } from "@/navigation";

type Props = MainTabScreenProps<"Payouts">;

export default function StripeOnboardingScreen({}: Props) {
  const { user, refreshMe } = useAuth();
  const [checking, setChecking] = useState(true);
  const [starting, setStarting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [radiusInput, setRadiusInput] = useState(String(user?.cleanerProfile?.serviceRadiusMi ?? 15));

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

  async function onSetBaseLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location permission needed", "Enable location access so we can show you jobs near you.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      await api.updateCleanerProfile({ baseLat: position.coords.latitude, baseLng: position.coords.longitude });
      await refreshMe();
      Alert.alert("Location updated", "You'll now only see jobs within your service radius.");
    } catch (err) {
      Alert.alert("Couldn't update location", err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLocating(false);
    }
  }

  async function onSaveRadius() {
    const radius = Number(radiusInput);
    if (!radius || radius < 1 || radius > 100) {
      Alert.alert("Invalid radius", "Enter a number of miles between 1 and 100.");
      return;
    }
    try {
      await api.updateCleanerProfile({ serviceRadiusMi: radius });
      await refreshMe();
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  const onboarded = user?.cleanerProfile?.stripeOnboarded;
  const hasBaseLocation = user?.cleanerProfile?.baseLat != null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
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

      <View style={styles.divider} />

      <Text style={styles.title}>Service area</Text>
      <Text style={styles.body}>
        {hasBaseLocation
          ? "Your job feed only shows jobs within your radius of this location."
          : "Set your base location so your job feed can be filtered to jobs near you. Without it, you'll see every open job regardless of distance."}
      </Text>
      <Pressable style={[styles.button, styles.secondaryButton]} onPress={onSetBaseLocation} disabled={locating}>
        <Text style={styles.secondaryButtonText}>
          {locating ? "Getting your location…" : hasBaseLocation ? "Update my location" : "Use my current location"}
        </Text>
      </Pressable>

      <Text style={[styles.label, { marginTop: 20 }]}>Radius (miles)</Text>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          keyboardType="number-pad"
          value={radiusInput}
          onChangeText={setRadiusInput}
        />
        <Pressable style={[styles.button, styles.secondaryButton, { flex: 1, marginTop: 0 }]} onPress={onSaveRadius}>
          <Text style={styles.secondaryButtonText}>Save</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: "#fff" },
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
  secondaryButton: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#1565C0" },
  secondaryButtonText: { color: "#1565C0", fontSize: 16, fontWeight: "600" },
  statsRow: { marginTop: 20 },
  stat: { fontSize: 16, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 32 },
  label: { fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
});
