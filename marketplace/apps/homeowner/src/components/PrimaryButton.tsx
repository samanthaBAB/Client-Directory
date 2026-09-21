import React, { useState } from "react";
import { Animated, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, radii } from "@/theme";
import { BubbleLoader } from "./BubbleLoader";

type Variant = "primary" | "outline" | "danger";

type Particle = {
  id: number;
  x: number;
  size: number;
  rise: number;
  color: string;
  anim: Animated.Value;
};

let particleId = 0;
const BUBBLE_COLORS = [colors.primary, colors.bubbleLight, "#FFFFFF"];

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
}) {
  const [particles, setParticles] = useState<Particle[]>([]);

  function popBubbles() {
    const next: Particle[] = Array.from({ length: 6 }).map(() => ({
      id: particleId++,
      x: (Math.random() - 0.5) * 70,
      size: 6 + Math.random() * 8,
      rise: 55 + Math.random() * 25,
      color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
      anim: new Animated.Value(0),
    }));
    setParticles((prev) => [...prev, ...next]);
    next.forEach((p) => {
      Animated.timing(p.anim, { toValue: 1, duration: 700, useNativeDriver: true }).start(() => {
        setParticles((prev) => prev.filter((q) => q.id !== p.id));
      });
    });
  }

  function handlePress() {
    if (disabled || loading) return;
    popBubbles();
    onPress();
  }

  const isOutline = variant === "outline";
  const isDanger = variant === "danger";

  return (
    <View style={[styles.wrap, style]}>
      {particles.map((p) => (
        <Animated.View
          key={p.id}
          pointerEvents="none"
          style={[
            styles.particle,
            {
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.color,
              marginLeft: p.x - p.size / 2,
              opacity: p.anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.9, 0.7, 0] }),
              transform: [
                { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -p.rise] }) },
                { scale: p.anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1, 0.8] }) },
              ],
            },
          ]}
        />
      ))}
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.button,
          isOutline ? styles.outline : isDanger ? styles.dangerButton : styles.primaryButton,
          (disabled || loading) && styles.disabled,
          pressed && !disabled && !loading && styles.pressed,
        ]}
      >
        {loading ? (
          <BubbleLoader size="small" />
        ) : (
          <Text style={[styles.text, isOutline ? styles.outlineText : isDanger ? styles.dangerText : styles.primaryText]}>
            {label}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative" },
  particle: { position: "absolute", bottom: 4, left: "50%" },
  button: {
    borderRadius: radii.md,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: { backgroundColor: colors.primary },
  outline: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: "transparent" },
  dangerButton: { borderWidth: 1.5, borderColor: colors.danger, backgroundColor: "transparent" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  text: { fontSize: 16, fontWeight: "700" },
  primaryText: { color: colors.onPrimary },
  outlineText: { color: colors.primary },
  dangerText: { color: colors.danger },
});
