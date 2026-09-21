import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { isActiveSubscription } from "@/catalog";
import { useAuth } from "@/context/AuthContext";
import { colors, radii } from "@/theme";
import { RootStackParamList } from "@/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const status = user?.homeownerProfile?.subscriptionStatus;
  const subscribed = isActiveSubscription(status);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Name</Text>
      <Text style={styles.value}>{user?.name}</Text>

      <Text style={styles.label}>Email</Text>
      <Text style={styles.value}>{user?.email}</Text>

      {user?.phone && (
        <>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{user.phone}</Text>
        </>
      )}

      <Pressable style={styles.membershipCard} onPress={() => navigation.navigate("Subscription")}>
        <Text style={styles.membershipTitle}>
          {status === "trialing" ? "✓ Free trial active" : subscribed ? "✓ Monthly member" : "Become a monthly member"}
        </Text>
        <Text style={styles.membershipBody}>
          {subscribed
            ? "25% off every clean. Tap to manage."
            : "First month free, then $14.99/mo for 25% off every clean you book."}
        </Text>
      </Pressable>

      <Pressable style={styles.supportCard} onPress={() => navigation.navigate("Support")}>
        <Text style={styles.supportTitle}>Support</Text>
        <Text style={styles.supportBody}>Questions about a booking or payment? Get in touch.</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: colors.background },
  label: { fontSize: 12, color: colors.textMuted, textTransform: "uppercase", marginTop: 16 },
  value: { fontSize: 16, marginTop: 4, color: colors.text },
  membershipCard: {
    marginTop: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.md,
    padding: 16,
  },
  membershipTitle: { color: colors.primary, fontWeight: "700", fontSize: 16 },
  membershipBody: { color: colors.textMuted, marginTop: 4 },
  supportCard: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 16,
  },
  supportTitle: { color: colors.text, fontWeight: "700", fontSize: 16 },
  supportBody: { color: colors.textMuted, marginTop: 4 },
  button: {
    marginTop: 24,
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: radii.md,
    padding: 14,
    alignItems: "center",
  },
  buttonText: { color: colors.danger, fontWeight: "600" },
});
