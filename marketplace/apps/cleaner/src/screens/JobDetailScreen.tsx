import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, ApiError, Job } from "@/api/client";
import { RootStackParamList } from "@/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "JobDetail">;

export default function JobDetailScreen({ route, navigation }: Props) {
  const { jobId, source } = route.params;
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

  async function onAccept() {
    if (!job) return;
    setBusy(true);
    try {
      await api.acceptJob(job.id);
      Alert.alert("Job accepted", "It's now on your My Jobs tab.");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Couldn't accept", err instanceof ApiError ? err.message : "Something went wrong");
      load();
    } finally {
      setBusy(false);
    }
  }

  async function onDecline() {
    if (!job) return;
    setBusy(true);
    try {
      await api.declineJob(job.id);
      navigation.goBack();
    } catch (err) {
      Alert.alert("Couldn't decline", err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function onComplete() {
    if (!job) return;
    setBusy(true);
    try {
      const updated = await api.completeJob(job.id);
      setJob(updated);
      Alert.alert("Marked complete", "The homeowner can now leave a review.");
    } catch (err) {
      Alert.alert("Couldn't mark complete", err instanceof ApiError ? err.message : "Something went wrong");
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
        {job.address.notes && <Text style={styles.value}>Access notes: {job.address.notes}</Text>}
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
        <Text style={styles.label}>You'll earn</Text>
        <Text style={styles.value}>${(job.priceCents / 100).toFixed(2)} (minus platform fee)</Text>
      </View>

      {job.homeowner && (
        <View style={styles.section}>
          <Text style={styles.label}>Homeowner</Text>
          <Text style={styles.value}>{job.homeowner.user.name}</Text>
        </View>
      )}

      {job.notes && (
        <View style={styles.section}>
          <Text style={styles.label}>Homeowner's notes</Text>
          <Text style={styles.value}>{job.notes}</Text>
        </View>
      )}

      {source === "feed" && job.status === "PENDING" && (
        <View style={styles.actions}>
          <Pressable style={[styles.button, styles.declineButton]} onPress={onDecline} disabled={busy}>
            <Text style={styles.declineText}>Decline</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.acceptButton]} onPress={onAccept} disabled={busy}>
            <Text style={styles.acceptText}>Accept</Text>
          </Pressable>
        </View>
      )}

      {source === "mine" && (job.status === "ACCEPTED" || job.status === "IN_PROGRESS") && (
        <Pressable style={[styles.button, styles.acceptButton, { marginTop: 24 }]} onPress={onComplete} disabled={busy}>
          <Text style={styles.acceptText}>{busy ? "Saving…" : "Mark clean complete"}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: "700", textTransform: "capitalize" },
  status: { fontSize: 14, color: "#1565C0", fontWeight: "600", marginTop: 4, textTransform: "capitalize" },
  section: { marginTop: 20 },
  label: { fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: 16, marginTop: 4 },
  actions: { flexDirection: "row", gap: 10, marginTop: 28 },
  button: { flex: 1, borderRadius: 10, padding: 16, alignItems: "center" },
  declineButton: { borderWidth: 1, borderColor: "#B00020" },
  declineText: { color: "#B00020", fontWeight: "600" },
  acceptButton: { backgroundColor: "#1565C0" },
  acceptText: { color: "#fff", fontWeight: "600" },
});
