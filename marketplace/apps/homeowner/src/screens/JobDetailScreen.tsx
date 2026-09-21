import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BubbleLoader } from "@/components/BubbleLoader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { api, ApiError, Job } from "@/api/client";
import { DEEP_CLEAN_TASKS, EXTRAS, priceBreakdown, serviceLabel } from "@/catalog";
import { colors } from "@/theme";
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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <BubbleLoader />
      </View>
    );
  }

  const needsPayment = job.status === "ACCEPTED" && (!job.payment || job.payment.status !== "SUCCEEDED");
  const rooms =
    job.bedroomCount != null && job.bathroomCount != null && job.kitchenCount != null
      ? { bedroomCount: job.bedroomCount, bathroomCount: job.bathroomCount, kitchenCount: job.kitchenCount }
      : null;
  const breakdown = priceBreakdown(job.serviceType, job.squareFootage, rooms, job.extras);
  const isDeepDetail = job.serviceType === "deep" || job.serviceType === "move_in" || job.serviceType === "move_out";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{serviceLabel(job.serviceType)}</Text>
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
        <Text style={styles.label}>Price breakdown</Text>
        {breakdown.map((item, i) => (
          <View key={i} style={styles.priceRow}>
            <Text style={styles.priceRowLabel}>{item.label}</Text>
            <Text style={styles.priceRowValue}>${(item.amountCents / 100).toFixed(2)}</Text>
          </View>
        ))}
        <View style={[styles.priceRow, styles.priceTotalRow]}>
          <Text style={styles.priceTotalLabel}>Total</Text>
          <Text style={styles.priceTotalValue}>${(job.priceCents / 100).toFixed(2)}</Text>
        </View>
      </View>

      {job.extras.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Extras</Text>
          <Text style={styles.value}>
            {job.extras.map((id) => EXTRAS.find((e) => e.id === id)?.label ?? id).join(", ")}
          </Text>
        </View>
      )}

      {isDeepDetail && (
        <View style={styles.section}>
          <Text style={styles.label}>What's included</Text>
          <Text style={styles.checklistGroup}>Every room</Text>
          {DEEP_CLEAN_TASKS.general.map((t, i) => (
            <Text key={i} style={styles.checklistItem}>• {t}</Text>
          ))}
          <Text style={styles.checklistGroup}>Each bedroom</Text>
          {DEEP_CLEAN_TASKS.bedroom.map((t, i) => (
            <Text key={i} style={styles.checklistItem}>• {t}</Text>
          ))}
          <Text style={styles.checklistGroup}>Each bathroom</Text>
          {DEEP_CLEAN_TASKS.bathroom.map((t, i) => (
            <Text key={i} style={styles.checklistItem}>• {t}</Text>
          ))}
          <Text style={styles.checklistGroup}>Kitchen</Text>
          {DEEP_CLEAN_TASKS.kitchen.map((t, i) => (
            <Text key={i} style={styles.checklistItem}>• {t}</Text>
          ))}
        </View>
      )}

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
        <PrimaryButton label="Pay now" onPress={() => navigation.navigate("Payment", { job })} style={{ marginTop: 28 }} />
      )}

      {(job.status === "PENDING" || job.status === "ACCEPTED") && (
        <Pressable style={styles.dangerLink} onPress={onCancel} disabled={busy}>
          <Text style={styles.dangerLinkText}>{busy ? "Canceling…" : "Cancel booking"}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: colors.background, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  status: { fontSize: 14, color: colors.primary, fontWeight: "600", marginTop: 4, textTransform: "capitalize" },
  section: { marginTop: 20 },
  label: { fontSize: 12, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  value: { fontSize: 16, marginTop: 4, color: colors.text },
  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  priceRowLabel: { color: colors.textMuted, fontSize: 14 },
  priceRowValue: { color: colors.text, fontSize: 14 },
  priceTotalRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6, paddingTop: 8 },
  priceTotalLabel: { color: colors.text, fontWeight: "700", fontSize: 16 },
  priceTotalValue: { color: colors.primary, fontWeight: "700", fontSize: 18 },
  checklistGroup: { color: colors.text, fontWeight: "600", marginTop: 10, marginBottom: 4 },
  checklistItem: { color: colors.textMuted, fontSize: 14, marginBottom: 2 },
  dangerLink: { alignItems: "center", marginTop: 20, padding: 12 },
  dangerLinkText: { color: colors.danger, fontWeight: "600" },
});
