import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useStripe } from "@stripe/stripe-react-native";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/PrimaryButton";
import { api, ApiError } from "@/api/client";
import { MONTHLY_SUBSCRIPTION_PRICE_CENTS, MONTHLY_SUBSCRIPTION_TRIAL_DAYS } from "@/catalog";
import { useAuth } from "@/context/AuthContext";
import { colors, radii } from "@/theme";
import { RootStackParamList } from "@/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Subscription">;

export default function SubscriptionScreen({}: Props) {
  const { user, refreshMe } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [busy, setBusy] = useState(false);

  const status = user?.homeownerProfile?.subscriptionStatus;
  const active = status === "active" || status === "trialing";

  async function onSubscribe() {
    setBusy(true);
    try {
      const { clientSecret, mode } = await api.startSubscription();
      const { error: initError } = await initPaymentSheet(
        mode === "setup"
          ? { merchantDisplayName: "Suds & Scrub", setupIntentClientSecret: clientSecret }
          : { merchantDisplayName: "Suds & Scrub", paymentIntentClientSecret: clientSecret },
      );
      if (initError) {
        Alert.alert("Couldn't start checkout", initError.message);
        return;
      }
      const { error } = await presentPaymentSheet();
      if (error) {
        if (error.code !== "Canceled") Alert.alert("Payment failed", error.message);
        return;
      }
      await refreshMe();
      Alert.alert(
        "You're in!",
        `Your first ${MONTHLY_SUBSCRIPTION_TRIAL_DAYS} days are free — 25% off every clean starting now.`,
      );
    } catch (err) {
      Alert.alert("Couldn't subscribe", err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function onCancel() {
    Alert.alert(
      "Cancel your membership?",
      "You'll keep your 25% discount through the end of the current billing period.",
      [
        { text: "Never mind", style: "cancel" },
        {
          text: "Cancel membership",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await api.cancelSubscription();
              await refreshMe();
              Alert.alert("Membership canceled", "It'll stay active until the end of this billing period.");
            } catch (err) {
              Alert.alert("Couldn't cancel", err instanceof ApiError ? err.message : "Something went wrong");
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.price}>${(MONTHLY_SUBSCRIPTION_PRICE_CENTS / 100).toFixed(2)}/mo</Text>
      <Text style={styles.subtitle}>
        First {MONTHLY_SUBSCRIPTION_TRIAL_DAYS} days free. Unlimited cleanings, 25% off every one — plus the cost of
        each clean.
      </Text>

      {active ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {status === "trialing" ? "✓ Free trial active" : "✓ You're subscribed"}
          </Text>
          <Text style={styles.cardBody}>
            {status === "trialing"
              ? `25% off every clean during your free trial. Your card won't be charged until it ends.`
              : "25% off every clean. Tap to manage."}
          </Text>
          <PrimaryButton label="Cancel membership" variant="outline" onPress={onCancel} loading={busy} style={{ marginTop: 16 }} />
        </View>
      ) : (
        <PrimaryButton label={`Start free ${MONTHLY_SUBSCRIPTION_TRIAL_DAYS}-day trial`} onPress={onSubscribe} loading={busy} style={{ marginTop: 24 }} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: colors.background, flexGrow: 1 },
  price: { fontSize: 40, fontWeight: "800", color: colors.primary, textAlign: "center", marginTop: 12 },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: "center", marginTop: 8, lineHeight: 22 },
  card: {
    marginTop: 28,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  cardTitle: { color: colors.primary, fontWeight: "700", fontSize: 16 },
  cardBody: { color: colors.textMuted, marginTop: 6, lineHeight: 20 },
});
