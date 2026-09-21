import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, ApiError, Job } from "@/api/client";
import { RootStackParamList } from "@/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "JobDetail">;

export default function JobDetailScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setJob(await api.job(jobId));
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function onCancel() {
    if (!job) return;
    const alreadyPaid = job.payment?.status === "SUCCEEDED";
    Alert.alert(
      "Cancel this booking?",
      alreadyPaid ? "You'll be refunded in full." : "This can't be undone.",
      [
        { text: "Never mind", style: "cancel" },
        { text: "Cancel booking", style: "destructive", onPress: doCancel },
      ],
    );
  }

  async function doCancel() {
    if (!job) return;
    setBusy(true);
    try {
      const updated = await api.cancelJob(job.id);
      setJob(updated);
    } catch (err) {
      Alert.alert("Couldn't cancel", err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !job) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  const needsPayment = job.status === "ACCEPTED" && (!job.payment || job.payment.status !== "SUCCEEDED");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{job.serviceType.replace("-", " ")} clean</Text>
      <Text style={styles.status}>{job.status.replace("_", " ")}</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Address</Text>
        <Text style={styles.value}>
          {job.address.line1}
          {job.address.line2 ? `, ${job.address.line2}` : ""}
        </Text>
        <Text style={styles.value}>
          {job.address.city}, {job.address.state} {job.address.zip}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Scheduled for</Text>
        <Text style={styles.value}>{new Date(job.scheduledFor).toLocaleString()}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Estimated hours</Text>
        <Text style={styles.value}>{job.estimatedHours}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Price</Text>
        <Text style={styles.value}>${(job.priceCents / 100).toFixed(2)}</Text>
      </View>

      {job.cleaner && (
        <View style={styles.section}>
          <Text style={styles.label}>Your cleaner</Text>
          <Text style={styles.value}>{job.cleaner.user.name}</Text>
          {job.cleaner.user.phone && <Text style={styles.value}>{job.cleaner.user.phone}</Text>}
        </View>
      )}

      {job.notes && (
        <View style={styles.section}>
          <Text style={styles.label}>Your notes</Text>
          <Text style={styles.value}>{job.notes}</Text>
        </View>
      )}

      {needsPayment && (
        <Pressable style={styles.button} onPress={() => navigation.navigate("Payment", { job })}>
          <Text style={styles.buttonText}>Pay now</Text>
        </Pressable>
      )}

      {(job.status === "PENDING" || job.status === "ACCEPTED") && (
        <Pressable style={styles.dangerButton} onPress={onCancel} disabled={busy}>
          <Text style={styles.dangerButtonText}>{busy ? "Canceling…" : "Cancel booking"}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: "700", textTransform: "capitalize" },
  status: { fontSize: 14, color: "#2E7D32", fontWeight: "600", marginTop: 4, textTransform: "capitalize" },
  section: { marginTop: 20 },
  label: { fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: 16, marginTop: 4 },
  button: {
    backgroundColor: "#2E7D32",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 28,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  dangerButton: { alignItems: "center", marginTop: 16, padding: 12 },
  dangerButtonText: { color: "#B00020", fontWeight: "600" },
});
