import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BubbleLoader } from "@/components/BubbleLoader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { api, ApiError, Job } from "@/api/client";
import { DEEP_CLEAN_TASKS, EXTRAS, priceBreakdown, serviceLabel } from "@/catalog";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/theme";
import { RootStackParamList } from "@/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "JobDetail">;

type ChecklistGroup = { group: string; items: { key: string; label: string }[] };

function buildChecklist(job: Job): ChecklistGroup[] {
  const isDeepDetail = job.serviceType === "deep" || job.serviceType === "move_in" || job.serviceType === "move_out";
  if (!isDeepDetail) return [];

  const groups: ChecklistGroup[] = [
    { group: "Every room", items: DEEP_CLEAN_TASKS.general.map((label, i) => ({ key: `general-${i}`, label })) },
  ];

  const bedrooms = job.bedroomCount ?? 0;
  for (let i = 1; i <= Math.floor(bedrooms); i++) {
    groups.push({
      group: `Bedroom ${i}`,
      items: DEEP_CLEAN_TASKS.bedroom.map((label, j) => ({ key: `bedroom-${i}-${j}`, label })),
    });
  }

  const fullBaths = Math.floor(job.bathroomCount ?? 0);
  const hasHalfBath = (job.bathroomCount ?? 0) % 1 !== 0;
  for (let i = 1; i <= fullBaths; i++) {
    groups.push({
      group: `Bathroom ${i}`,
      items: DEEP_CLEAN_TASKS.bathroom.map((label, j) => ({ key: `bathroom-${i}-${j}`, label })),
    });
  }
  if (hasHalfBath) {
    groups.push({
      group: "Half bath",
      items: DEEP_CLEAN_TASKS.bathroom.map((label, j) => ({ key: `bathroom-half-${j}`, label })),
    });
  }

  const kitchens = job.kitchenCount ?? 0;
  for (let i = 1; i <= Math.floor(kitchens); i++) {
    groups.push({
      group: kitchens > 1 ? `Kitchen ${i}` : "Kitchen",
      items: DEEP_CLEAN_TASKS.kitchen.map((label, j) => ({ key: `kitchen-${i}-${j}`, label })),
    });
  }

  return groups;
}

export default function JobDetailScreen({ route, navigation }: Props) {
  const { jobId, source } = route.params;
  const { logout } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

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

  const checklist = useMemo(() => (job ? buildChecklist(job) : []), [job]);
  const totalTasks = checklist.reduce((sum, g) => sum + g.items.length, 0);

  function toggleTask(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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

  async function onStart() {
    if (!job) return;
    setBusy(true);
    try {
      const updated = await api.startJob(job.id);
      setJob(updated);
    } catch (err) {
      Alert.alert("Couldn't start", err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function onComplete() {
    if (!job) return;
    if (totalTasks > 0 && checked.size < totalTasks) {
      Alert.alert(
        "Checklist isn't done",
        `${totalTasks - checked.size} task(s) still unchecked. Mark complete anyway?`,
        [
          { text: "Keep working", style: "cancel" },
          { text: "Mark complete anyway", onPress: doComplete },
        ],
      );
      return;
    }
    doComplete();
  }

  function onCancelJob() {
    if (!job) return;
    const hoursUntil = (new Date(job.scheduledFor).getTime() - Date.now()) / (60 * 60 * 1000);
    const isLate = hoursUntil < 24;
    Alert.alert(
      "Cancel this job?",
      isLate
        ? "This is within 24 hours of the scheduled time — canceling now will disable your account. Only do this if you truly can't make it."
        : "The homeowner will be notified and the job reopened for another cleaner.",
      [
        { text: "Never mind", style: "cancel" },
        { text: "Cancel job", style: "destructive", onPress: doCancelJob },
      ],
    );
  }

  async function doCancelJob() {
    if (!job) return;
    setBusy(true);
    try {
      const result = await api.cleanerCancelJob(job.id);
      if (result.accountDisabled) {
        Alert.alert("Account disabled", result.message ?? "Your account has been disabled.", [
          { text: "OK", onPress: logout },
        ]);
      } else {
        Alert.alert("Job canceled", "The homeowner has been notified.");
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert("Couldn't cancel", err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function doComplete() {
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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <BubbleLoader />
      </View>
    );
  }

  const rooms =
    job.bedroomCount != null && job.bathroomCount != null && job.kitchenCount != null
      ? { bedroomCount: job.bedroomCount, bathroomCount: job.bathroomCount, kitchenCount: job.kitchenCount }
      : null;
  const breakdown = priceBreakdown(job.serviceType, job.squareFootage, rooms, job.extras);
  const onSiteView = source === "mine" && (job.status === "ACCEPTED" || job.status === "IN_PROGRESS");

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
        {job.address.notes && <Text style={styles.value}>Access notes: {job.address.notes}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Scheduled for</Text>
        <Text style={styles.value}>{new Date(job.scheduledFor).toLocaleString()}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>You'll earn (price breakdown)</Text>
        {breakdown.map((item, i) => (
          <View key={i} style={styles.priceRow}>
            <Text style={styles.priceRowLabel}>{item.label}</Text>
            <Text style={styles.priceRowValue}>${(item.amountCents / 100).toFixed(2)}</Text>
          </View>
        ))}
        <View style={[styles.priceRow, styles.priceTotalRow]}>
          <Text style={styles.priceTotalLabel}>Total (before platform fee)</Text>
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

      {checklist.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>
            {onSiteView ? `Checklist (${checked.size}/${totalTasks})` : "What's expected"}
          </Text>
          {checklist.map((g) => (
            <View key={g.group} style={styles.checklistGroupWrap}>
              <Text style={styles.checklistGroup}>{g.group}</Text>
              {g.items.map((item) =>
                onSiteView ? (
                  <Pressable key={item.key} style={styles.taskRow} onPress={() => toggleTask(item.key)}>
                    <View style={[styles.checkbox, checked.has(item.key) && styles.checkboxChecked]}>
                      {checked.has(item.key) && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={[styles.taskLabel, checked.has(item.key) && styles.taskLabelChecked]}>
                      {item.label}
                    </Text>
                  </Pressable>
                ) : (
                  <Text key={item.key} style={styles.checklistItem}>
                    • {item.label}
                  </Text>
                ),
              )}
            </View>
          ))}
        </View>
      )}

      {source === "feed" && job.status === "PENDING" && (
        <View style={styles.actions}>
          <PrimaryButton label="Decline" variant="outline" onPress={onDecline} disabled={busy} style={{ flex: 1 }} />
          <PrimaryButton label="Accept" onPress={onAccept} disabled={busy} style={{ flex: 1 }} />
        </View>
      )}

      {source === "mine" && job.status === "ACCEPTED" && (
        <PrimaryButton label="Start clean" onPress={onStart} loading={busy} style={{ marginTop: 24 }} />
      )}

      {source === "mine" && job.status === "IN_PROGRESS" && (
        <PrimaryButton label="Mark clean complete" onPress={onComplete} loading={busy} style={{ marginTop: 24 }} />
      )}

      {onSiteView && (
        <Pressable style={styles.cancelLink} onPress={onCancelJob} disabled={busy}>
          <Text style={styles.cancelLinkText}>Can't make this job? Cancel it</Text>
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
  priceTotalLabel: { color: colors.text, fontWeight: "700", fontSize: 15 },
  priceTotalValue: { color: colors.primary, fontWeight: "700", fontSize: 18 },
  checklistGroupWrap: { marginTop: 14 },
  checklistGroup: { color: colors.text, fontWeight: "700", marginBottom: 6 },
  checklistItem: { color: colors.textMuted, fontSize: 14, marginBottom: 2 },
  taskRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.onPrimary, fontSize: 14, fontWeight: "700" },
  taskLabel: { color: colors.text, fontSize: 14, flex: 1 },
  taskLabelChecked: { color: colors.textMuted, textDecorationLine: "line-through" },
  actions: { flexDirection: "row", gap: 10, marginTop: 28 },
  cancelLink: { alignItems: "center", marginTop: 16, padding: 12 },
  cancelLinkText: { color: colors.danger, fontWeight: "600", fontSize: 13 },
});
