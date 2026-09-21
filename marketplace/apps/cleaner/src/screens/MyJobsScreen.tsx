import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { BubbleLoader } from "@/components/BubbleLoader";
import { api, Job, JobStatus } from "@/api/client";
import { serviceLabel } from "@/catalog";
import { colors, radii } from "@/theme";
import { MainTabScreenProps } from "@/navigation";

type Props = MainTabScreenProps<"MyJobs">;

const STATUS_LABEL: Record<JobStatus, string> = {
  PENDING: "Open",
  ACCEPTED: "Accepted",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELED: "Canceled",
};

const STATUS_COLOR: Record<JobStatus, string> = {
  PENDING: "#FFC078",
  ACCEPTED: colors.primary,
  IN_PROGRESS: "#74C0FC",
  COMPLETED: colors.textMuted,
  CANCELED: colors.danger,
};

export default function MyJobsScreen({ navigation }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setJobs(await api.myJobs());
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
      ListEmptyComponent={<Text style={styles.empty}>You haven't accepted any jobs yet.</Text>}
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => navigation.navigate("JobDetail", { jobId: item.id, source: "mine" })}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={styles.cardTitle}>{serviceLabel(item.serviceType)}</Text>
            <Text style={[styles.status, { color: STATUS_COLOR[item.status] }]}>{STATUS_LABEL[item.status]}</Text>
          </View>
          <Text style={styles.address}>
            {item.address.line1}, {item.address.city}
          </Text>
          <Text style={styles.meta}>{new Date(item.scheduledFor).toLocaleString()}</Text>
          <Text style={styles.price}>${(item.priceCents / 100).toFixed(2)}</Text>
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
  status: { fontSize: 12, fontWeight: "700" },
  address: { color: colors.textMuted, marginTop: 6 },
  meta: { color: colors.textMuted, marginTop: 2, fontSize: 13 },
  price: { marginTop: 8, fontWeight: "700", color: colors.primary },
});
