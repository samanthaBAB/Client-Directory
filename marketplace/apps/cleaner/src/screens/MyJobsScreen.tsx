import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { api, Job, JobStatus } from "@/api/client";
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
  PENDING: "#B8860B",
  ACCEPTED: "#1565C0",
  IN_PROGRESS: "#1565C0",
  COMPLETED: "#2E7D32",
  CANCELED: "#B00020",
};

export default function MyJobsScreen({ navigation }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setJobs(await api.myJobs());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ padding: 16 }}
      data={jobs}
      keyExtractor={(j) => j.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      ListEmptyComponent={<Text style={styles.empty}>You haven't accepted any jobs yet.</Text>}
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => navigation.navigate("JobDetail", { jobId: item.id, source: "mine" })}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={styles.cardTitle}>{item.serviceType.replace("-", " ")} clean</Text>
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
  empty: { textAlign: "center", color: "#888", marginTop: 40 },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", textTransform: "capitalize" },
  status: { fontSize: 12, fontWeight: "700" },
  address: { color: "#444", marginTop: 6 },
  meta: { color: "#888", marginTop: 2, fontSize: 13 },
  price: { marginTop: 8, fontWeight: "700" },
});
