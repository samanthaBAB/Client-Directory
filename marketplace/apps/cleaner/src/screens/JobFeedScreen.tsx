import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { BubbleLoader } from "@/components/BubbleLoader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { api, ApiError, Job } from "@/api/client";
import { serviceLabel } from "@/catalog";
import { useAuth } from "@/context/AuthContext";
import { colors, radii } from "@/theme";
import { MainTabScreenProps } from "@/navigation";

type Props = MainTabScreenProps<"JobFeed">;

export default function JobFeedScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setJobs(await api.availableJobs());
    } finally {
      setRefreshing(false);
      setLoading(false);
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

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <BubbleLoader />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16 }}
      data={jobs}
      keyExtractor={(j) => j.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
      ListEmptyComponent={<Text style={styles.empty}>No open jobs right now — check back soon.</Text>}
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => navigation.navigate("JobDetail", { jobId: item.id, source: "feed" })}>
          <Text style={styles.cardTitle}>{serviceLabel(item.serviceType)}</Text>
          <Text style={styles.address}>
            {item.address.city}, {item.address.state}
          </Text>
          <Text style={styles.meta}>{new Date(item.scheduledFor).toLocaleString()}</Text>
          <Text style={styles.meta}>{item.squareFootage.toLocaleString()} sq ft</Text>
          <Text style={styles.price}>${(item.priceCents / 100).toFixed(2)}</Text>

          <View style={styles.actions}>
            <PrimaryButton
              label="Decline"
              variant="outline"
              onPress={() => onDecline(item)}
              disabled={busyId === item.id}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label="Accept"
              onPress={() => onAccept(item)}
              disabled={busyId === item.id}
              style={{ flex: 1 }}
            />
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  address: { color: colors.textMuted, marginTop: 6 },
  meta: { color: colors.textMuted, marginTop: 2, fontSize: 13 },
  price: { marginTop: 8, fontWeight: "700", fontSize: 16, color: colors.primary },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
});
