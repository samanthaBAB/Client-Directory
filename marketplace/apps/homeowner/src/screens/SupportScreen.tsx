import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SUPPORT_CONTACT } from "@/catalog";
import { colors, radii } from "@/theme";

export default function SupportScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Contact support</Text>
      <Pressable style={styles.contactRow} onPress={() => Linking.openURL(`tel:${SUPPORT_CONTACT.phone}`)}>
        <Text style={styles.contactLabel}>Call</Text>
        <Text style={styles.contactValue}>{SUPPORT_CONTACT.phoneDisplay}</Text>
      </Pressable>
      <Pressable style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${SUPPORT_CONTACT.email}`)}>
        <Text style={styles.contactLabel}>Email</Text>
        <Text style={styles.contactValue}>{SUPPORT_CONTACT.email}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: colors.background, flexGrow: 1 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", marginTop: 20, marginBottom: 10 },
  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 10,
  },
  contactLabel: { color: colors.textMuted },
  contactValue: { color: colors.primary, fontWeight: "600" },
});
