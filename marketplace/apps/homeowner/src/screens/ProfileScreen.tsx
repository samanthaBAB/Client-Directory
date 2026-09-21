import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";

export default function ProfileScreen() {
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

      <Pressable style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  label: { fontSize: 12, color: "#888", textTransform: "uppercase", marginTop: 16 },
  value: { fontSize: 16, marginTop: 4 },
  button: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: "#B00020",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  buttonText: { color: "#B00020", fontWeight: "600" },
});
