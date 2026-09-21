import { NativeStackScreenProps } from "@react-navigation/native-stack";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api, ApiError, Job } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { RootStackParamList } from "@/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const SERVICE_TYPES: { value: Job["serviceType"]; label: string; blurb: string }[] = [
  { value: "standard", label: "Standard clean", blurb: "Kitchen, bathrooms, floors, dusting" },
  { value: "deep", label: "Deep clean", blurb: "Standard plus baseboards, inside appliances, more time" },
  { value: "move-out", label: "Move-out clean", blurb: "Empty home, top-to-bottom, ready for the next tenant" },
];

export default function HomeScreen({ navigation }: Props) {
  const { logout } = useAuth();
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [serviceType, setServiceType] = useState<Job["serviceType"]>("standard");
  const [estimatedHours, setEstimatedHours] = useState("2");
  const [scheduledFor, setScheduledFor] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [showPicker, setShowPicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (!line1.trim() || !city.trim() || !state.trim() || !zip.trim()) {
      Alert.alert("Missing address", "Please fill in your full address.");
      return;
    }
    const hours = Number(estimatedHours);
    if (!hours || hours < 0.5 || hours > 12) {
      Alert.alert("Invalid hours", "Estimated hours should be between 0.5 and 12.");
      return;
    }

    setSubmitting(true);
    try {
      await api.createJob({
        address: { line1: line1.trim(), line2: line2.trim() || undefined, city: city.trim(), state: state.trim(), zip: zip.trim() },
        serviceType,
        scheduledFor: scheduledFor.toISOString(),
        estimatedHours: hours,
        notes: notes.trim() || undefined,
      });
      Alert.alert("Request sent", "We'll notify you as soon as a cleaner accepts.", [
        { text: "View my bookings", onPress: () => navigation.navigate("Bookings") },
      ]);
      setLine1("");
      setLine2("");
      setCity("");
      setState("");
      setZip("");
      setNotes("");
    } catch (err) {
      Alert.alert("Couldn't request a cleaning", err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.navigate("Bookings")}>
          <Text style={styles.topLink}>My bookings</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Profile")}>
          <Text style={styles.topLink}>Profile</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>What kind of clean?</Text>
      {SERVICE_TYPES.map((s) => (
        <Pressable
          key={s.value}
          style={[styles.serviceOption, serviceType === s.value && styles.serviceOptionSelected]}
          onPress={() => setServiceType(s.value)}
        >
          <Text style={styles.serviceLabel}>{s.label}</Text>
          <Text style={styles.serviceBlurb}>{s.blurb}</Text>
        </Pressable>
      ))}

      <Text style={styles.sectionTitle}>Address</Text>
      <TextInput style={styles.input} placeholder="Street address" value={line1} onChangeText={setLine1} />
      <TextInput style={styles.input} placeholder="Apt / unit (optional)" value={line2} onChangeText={setLine2} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <TextInput style={[styles.input, { flex: 2 }]} placeholder="City" value={city} onChangeText={setCity} />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="State" value={state} onChangeText={setState} />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="ZIP" keyboardType="number-pad" value={zip} onChangeText={setZip} />
      </View>

      <Text style={styles.sectionTitle}>When</Text>
      <Pressable style={styles.input} onPress={() => setShowPicker(true)}>
        <Text>{scheduledFor.toLocaleString()}</Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={scheduledFor}
          mode="datetime"
          minimumDate={new Date()}
          onChange={(_, date) => {
            setShowPicker(Platform.OS === "ios");
            if (date) setScheduledFor(date);
          }}
        />
      )}

      <Text style={styles.sectionTitle}>Estimated hours</Text>
      <TextInput style={styles.input} keyboardType="decimal-pad" value={estimatedHours} onChangeText={setEstimatedHours} />

      <Text style={styles.sectionTitle}>Notes for your cleaner (optional)</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Gate code, pets, areas to focus on…"
        multiline
        value={notes}
        onChangeText={setNotes}
      />

      <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "Requesting…" : "Request a cleaning"}</Text>
      </Pressable>

      <Pressable onPress={logout} style={{ marginTop: 24, marginBottom: 40 }}>
        <Text style={{ color: "#999", textAlign: "center" }}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  topRow: { flexDirection: "row", justifyContent: "flex-end", gap: 20, marginBottom: 16 },
  topLink: { color: "#2E7D32", fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 20, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    fontSize: 16,
    justifyContent: "center",
  },
  serviceOption: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  serviceOptionSelected: { borderColor: "#2E7D32", backgroundColor: "#EAF5EB" },
  serviceLabel: { fontSize: 16, fontWeight: "600" },
  serviceBlurb: { fontSize: 13, color: "#666", marginTop: 2 },
  button: {
    backgroundColor: "#2E7D32",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
