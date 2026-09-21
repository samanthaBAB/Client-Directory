import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { colors, radii } from "@/theme";
import { MainTabScreenProps } from "@/navigation";

type Props = MainTabScreenProps<"Profile">;

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();

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

      <Pressable style={styles.supportCard} onPress={() => navigation.navigate("Support")}>
        <Text style={styles.supportTitle}>Support & policies</Text>
        <Text style={styles.supportBody}>Contact info and account rules — read before you accept a job.</Text>
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
  supportCard: {
    marginTop: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 16,
  },
  supportTitle: { color: colors.primary, fontWeight: "700", fontSize: 16 },
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
