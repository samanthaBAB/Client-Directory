import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useStripe } from "@stripe/stripe-react-native";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { BubbleLoader } from "@/components/BubbleLoader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { api, ApiError } from "@/api/client";
import { serviceLabel } from "@/catalog";
import { colors } from "@/theme";
import { RootStackParamList } from "@/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Payment">;

export default function PaymentScreen({ route, navigation }: Props) {
  const { job } = route.params;
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { clientSecret, error } = await api.createPaymentIntent(job.id);
        if (!clientSecret) {
          Alert.alert("Can't take payment yet", error ?? "Please try again shortly.");
          navigation.goBack();
          return;
        }
        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: "Suds & Scrub",
          paymentIntentClientSecret: clientSecret,
        });
        if (initError) {
          Alert.alert("Payment setup failed", initError.message);
          navigation.goBack();
          return;
        }
        setReady(true);
      } catch (err) {
        Alert.alert("Payment setup failed", err instanceof ApiError ? err.message : "Something went wrong");
        navigation.goBack();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  async function onPay() {
    setPaying(true);
    const { error } = await presentPaymentSheet();
    setPaying(false);
    if (error) {
      if (error.code !== "Canceled") Alert.alert("Payment failed", error.message);
      return;
    }
    Alert.alert("Payment successful", "Your cleaner will see the payment is confirmed.", [
      { text: "OK", onPress: () => navigation.navigate("Bookings") },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{serviceLabel(job.serviceType)}</Text>
      <Text style={styles.price}>${(job.priceCents / 100).toFixed(2)}</Text>

      {!ready ? (
        <BubbleLoader />
      ) : (
        <PrimaryButton label={paying ? "Processing…" : "Pay"} onPress={onPay} loading={paying} style={{ minWidth: 200 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  price: { fontSize: 40, fontWeight: "800", marginTop: 12, marginBottom: 32, color: colors.primary },
});
