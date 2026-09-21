import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { api, ApiError, Job } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { MainTabScreenProps } from "@/navigation";

type Props = MainTabScreenProps<"JobFeed">;

export default function JobFeedScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setJobs(await api.availableJobs());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onAccept(job: Job) {
    if (!user?.cleanerProfile?.stripeOnboarded) {
      Alert.alert(
        "Finish payout setup first",
        "You need to complete Stripe payout setup in the Payouts tab before accepting jobs.",
      );
      return;
    }
    setBusyId(job.id);
    try {
      await api.acceptJob(job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      Alert.alert("Job accepted", "It's now on your My Jobs tab.");
    } catch (err) {
      Alert.alert("Couldn't accept", err instanceof ApiError ? err.message : "Something went wrong");
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function onDecline(job: Job) {
    setBusyId(job.id);
    try {
      await api.declineJob(job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch (err) {
      Alert.alert("Couldn't decline", err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ padding: 16 }}
      data={jobs}
      keyExtractor={(j) => j.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      ListEmptyComponent={<Text style={styles.empty}>No open jobs right now — check back soon.</Text>}
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => navigation.navigate("JobDetail", { jobId: item.id, source: "feed" })}>
          <Text style={styles.cardTitle}>{item.serviceType.replace("-", " ")} clean</Text>
          <Text style={styles.address}>
            {item.address.city}, {item.address.state}
          </Text>
          <Text style={styles.meta}>{new Date(item.scheduledFor).toLocaleString()}</Text>
          <Text style={styles.meta}>{item.estimatedHours} hrs estimated</Text>
          <Text style={styles.price}>${(item.priceCents / 100).toFixed(2)}</Text>

          <View style={styles.actions}>
            <Pressable
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => onDecline(item)}
              disabled={busyId === item.id}
            >
              <Text style={styles.declineText}>Decline</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => onAccept(item)}
              disabled={busyId === item.id}
            >
              <Text style={styles.acceptText}>Accept</Text>
            </Pressable>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: "center", color: "#888", marginTop: 40 },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", textTransform: "capitalize" },
  address: { color: "#444", marginTop: 6 },
  meta: { color: "#888", marginTop: 2, fontSize: 13 },
  price: { marginTop: 8, fontWeight: "700", fontSize: 16 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionButton: { flex: 1, borderRadius: 8, padding: 12, alignItems: "center" },
  declineButton: { borderWidth: 1, borderColor: "#B00020" },
  declineText: { color: "#B00020", fontWeight: "600" },
  acceptButton: { backgroundColor: "#1565C0" },
  acceptText: { color: "#fff", fontWeight: "600" },
});
