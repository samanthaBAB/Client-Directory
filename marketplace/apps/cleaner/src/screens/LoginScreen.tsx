import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Bubbles } from "@/components/Bubbles";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Sponge } from "@/components/Sponge";
import { ApiError } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { colors, radii } from "@/theme";
import { RootStackParamList } from "@/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      Alert.alert("Couldn't sign in", err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Bubbles style={styles.bubbles} width={375} height={150} />
      <Sponge size={70} style={styles.sponge} />

      <Text style={styles.title}>Suds & Scrub Pro</Text>
      <Text style={styles.subtitle}>Find cleaning jobs near you</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <PrimaryButton label="Sign in" onPress={onSubmit} loading={submitting} style={{ marginTop: 8 }} />

      <Pressable onPress={() => navigation.navigate("Register")}>
        <Text style={styles.link}>New here? Apply to become a cleaner</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.background },
  bubbles: { position: "absolute", top: 0, left: 0, right: 0 },
  sponge: { alignSelf: "center", marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginTop: 8, marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    color: colors.text,
  },
  link: { color: colors.primary, textAlign: "center", marginTop: 20 },
});
