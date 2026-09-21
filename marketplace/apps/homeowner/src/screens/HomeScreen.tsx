import { NativeStackScreenProps } from "@react-navigation/native-stack";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import React, { useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Bubbles } from "@/components/Bubbles";
import { PrimaryButton } from "@/components/PrimaryButton";
import { api, ApiError } from "@/api/client";
import {
  availableExtras,
  computeDiscount,
  ExtraId,
  isActiveSubscription,
  isRoomPriced,
  priceBreakdown,
  RoomCounts,
  SERVICE_TYPES,
  ServiceTypeId,
} from "@/catalog";
import { useAuth } from "@/context/AuthContext";
import { colors, radii } from "@/theme";
import { RootStackParamList } from "@/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 20,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          style={styles.stepperButton}
          onPress={() => onChange(Math.max(min, Math.round((value - step) * 10) / 10))}
        >
          <Text style={styles.stepperButtonText}>–</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          style={styles.stepperButton}
          onPress={() => onChange(Math.min(max, Math.round((value + step) * 10) / 10))}
        >
          <Text style={styles.stepperButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [serviceType, setServiceType] = useState<ServiceTypeId>("residential");
  const [squareFootage, setSquareFootage] = useState("1500");
  const [bedroomCount, setBedroomCount] = useState(3);
  const [bathroomCount, setBathroomCount] = useState(2);
  const [kitchenCount, setKitchenCount] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<ExtraId[]>([]);
  const [scheduledFor, setScheduledFor] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [showPicker, setShowPicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const roomsPriced = isRoomPriced(serviceType);
  const sqft = Number(squareFootage) || 0;
  const extrasForType = useMemo(() => availableExtras(serviceType), [serviceType]);

  const rooms: RoomCounts | null = roomsPriced ? { bedroomCount, bathroomCount, kitchenCount } : null;

  const isFirstClean = user?.homeownerProfile?.hasBookedBefore === false;
  const isSubscribed = isActiveSubscription(user?.homeownerProfile?.subscriptionStatus);

  const breakdown = useMemo(() => {
    if (sqft < 100) return [];
    try {
      const items = priceBreakdown(serviceType, sqft, rooms, selectedExtras);
      const subtotal = items.reduce((sum, item) => sum + item.amountCents, 0);
      const discount = computeDiscount(subtotal, { serviceType, isFirstClean, isSubscribed });
      return discount ? [...items, { label: discount.label, amountCents: -discount.amountCents }] : items;
    } catch {
      return [];
    }
  }, [serviceType, sqft, rooms, selectedExtras, isFirstClean, isSubscribed]);

  const total = breakdown.reduce((sum, item) => sum + item.amountCents, 0);

  function onSelectServiceType(id: ServiceTypeId) {
    setServiceType(id);
    // Drop any selected extra that's no longer offered for this service
    // type (e.g. "inside fridge" is bundled into a deep clean's kitchen
    // price, so it disappears as a separate paid option).
    const stillAvailable = new Set(availableExtras(id).map((e) => e.id));
    setSelectedExtras((prev) => prev.filter((e) => stillAvailable.has(e)));
  }

  function toggleExtra(id: ExtraId) {
    setSelectedExtras((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  }

  async function onUseCurrentLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location permission needed", "Enable location access to share your home's location with cleaners.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
      Alert.alert("Location saved", "This helps nearby cleaners see your job first.");
    } catch {
      Alert.alert("Couldn't get your location", "Please try again, or continue without it.");
    } finally {
      setLocating(false);
    }
  }

  async function onSubmit() {
    if (!line1.trim() || !city.trim() || !state.trim() || !zip.trim()) {
      Alert.alert("Missing address", "Please fill in your full address.");
      return;
    }
    if (sqft < 100) {
      Alert.alert("Missing square footage", "Enter the approximate square footage to clean.");
      return;
    }

    setSubmitting(true);
    try {
      await api.createJob({
        address: {
          line1: line1.trim(),
          line2: line2.trim() || undefined,
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim(),
          lat: coords?.lat,
          lng: coords?.lng,
        },
        serviceType,
        squareFootage: sqft,
        bedroomCount: roomsPriced ? bedroomCount : undefined,
        bathroomCount: roomsPriced ? bathroomCount : undefined,
        kitchenCount: roomsPriced ? kitchenCount : undefined,
        extras: selectedExtras,
        scheduledFor: scheduledFor.toISOString(),
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
      setCoords(null);
      setSelectedExtras([]);
    } catch (err) {
      Alert.alert("Couldn't request a cleaning", err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Bubbles style={styles.bubbles} width={375} height={110} />

      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.navigate("Bookings")}>
          <Text style={styles.topLink}>My bookings</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Profile")}>
          <Text style={styles.topLink}>Profile</Text>
        </Pressable>
      </View>

      <View style={styles.serviceAreaBanner}>
        <Text style={styles.serviceAreaText}>
          🫧 Currently serving Acadiana: Lafayette, Vermilion, Iberia, Acadia, St. Martin & St. Landry Parishes
        </Text>
      </View>

      <Text style={styles.sectionTitle}>What kind of clean?</Text>
      {SERVICE_TYPES.map((s) => (
        <Pressable
          key={s.id}
          style={[styles.serviceOption, serviceType === s.id && styles.serviceOptionSelected]}
          onPress={() => onSelectServiceType(s.id)}
        >
          <Text style={styles.serviceLabel}>{s.label}</Text>
          <Text style={styles.serviceBlurb}>{s.blurb}</Text>
        </Pressable>
      ))}

      <Text style={styles.sectionTitle}>Square footage</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        placeholder="e.g. 1500"
        placeholderTextColor={colors.textMuted}
        value={squareFootage}
        onChangeText={setSquareFootage}
      />

      {roomsPriced && (
        <>
          <Text style={styles.sectionTitle}>Rooms</Text>
          <View style={styles.card}>
            <Stepper label="Bedrooms" value={bedroomCount} onChange={setBedroomCount} />
            <Stepper label="Bathrooms" value={bathroomCount} onChange={setBathroomCount} step={0.5} />
            <Stepper label="Kitchens" value={kitchenCount} onChange={setKitchenCount} max={3} />
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Add anything extra?</Text>
      <View style={styles.chipRow}>
        {extrasForType.map((extra) => {
          const selected = selectedExtras.includes(extra.id);
          return (
            <Pressable
              key={extra.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => toggleExtra(extra.id)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {extra.label} +${(extra.priceCents / 100).toFixed(0)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Address</Text>
      <TextInput style={styles.input} placeholder="Street address" placeholderTextColor={colors.textMuted} value={line1} onChangeText={setLine1} />
      <TextInput style={styles.input} placeholder="Apt / unit (optional)" placeholderTextColor={colors.textMuted} value={line2} onChangeText={setLine2} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <TextInput style={[styles.input, { flex: 2 }]} placeholder="City" placeholderTextColor={colors.textMuted} value={city} onChangeText={setCity} />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="State" placeholderTextColor={colors.textMuted} value={state} onChangeText={setState} />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="ZIP" placeholderTextColor={colors.textMuted} keyboardType="number-pad" value={zip} onChangeText={setZip} />
      </View>
      <Pressable onPress={onUseCurrentLocation} disabled={locating}>
        <Text style={styles.locationLink}>
          {locating ? "Getting your location…" : coords ? "✓ Location shared with nearby cleaners" : "Use my current location"}
        </Text>
      </Pressable>

      <Text style={styles.sectionTitle}>When</Text>
      <Pressable style={styles.input} onPress={() => setShowPicker(true)}>
        <Text style={styles.inputText}>{scheduledFor.toLocaleString()}</Text>
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

      <Text style={styles.sectionTitle}>Notes for your cleaner (optional)</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Gate code, pets, areas to focus on…"
        placeholderTextColor={colors.textMuted}
        multiline
        value={notes}
        onChangeText={setNotes}
      />

      {breakdown.length > 0 && (
        <View style={styles.priceCard}>
          <Text style={styles.priceCardTitle}>Estimated price</Text>
          {breakdown.map((item, i) => (
            <View key={i} style={styles.priceRow}>
              <Text style={styles.priceRowLabel}>{item.label}</Text>
              <Text style={styles.priceRowValue}>${(item.amountCents / 100).toFixed(2)}</Text>
            </View>
          ))}
          <View style={[styles.priceRow, styles.priceTotalRow]}>
            <Text style={styles.priceTotalLabel}>Total</Text>
            <Text style={styles.priceTotalValue}>${(total / 100).toFixed(2)}</Text>
          </View>
        </View>
      )}

      <PrimaryButton
        label="Request a cleaning"
        onPress={onSubmit}
        loading={submitting}
        style={{ marginTop: 20 }}
      />

      <Pressable onPress={logout} style={{ marginTop: 24, marginBottom: 20 }}>
        <Text style={{ color: colors.textMuted, textAlign: "center" }}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bubbles: { position: "absolute", top: 0, left: 0, right: 0 },
  topRow: { flexDirection: "row", justifyContent: "flex-end", gap: 20, marginBottom: 16 },
  topLink: { color: colors.primary, fontWeight: "600" },
  serviceAreaBanner: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 8,
  },
  serviceAreaText: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 20, marginBottom: 10, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 10,
    fontSize: 16,
    justifyContent: "center",
    color: colors.text,
  },
  inputText: { color: colors.text, fontSize: 16 },
  locationLink: { color: colors.primary, fontWeight: "600", marginBottom: 4 },
  serviceOption: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 8,
  },
  serviceOptionSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  serviceLabel: { fontSize: 16, fontWeight: "600", color: colors.text },
  serviceBlurb: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
  },
  stepperRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  stepperLabel: { color: colors.text, fontSize: 15 },
  stepperControls: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonText: { color: colors.primary, fontSize: 18, fontWeight: "700" },
  stepperValue: { color: colors.text, fontSize: 16, fontWeight: "600", minWidth: 24, textAlign: "center" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  chipText: { color: colors.textMuted, fontSize: 13 },
  chipTextSelected: { color: colors.primary, fontWeight: "600" },
  priceCard: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceCardTitle: { color: colors.text, fontWeight: "700", fontSize: 16, marginBottom: 10 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  priceRowLabel: { color: colors.textMuted, fontSize: 14, textTransform: "capitalize" },
  priceRowValue: { color: colors.text, fontSize: 14 },
  priceTotalRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 10 },
  priceTotalLabel: { color: colors.text, fontWeight: "700", fontSize: 16 },
  priceTotalValue: { color: colors.primary, fontWeight: "700", fontSize: 18 },
});
