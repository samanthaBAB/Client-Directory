import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { colors } from "@/theme";

const DOT_COLORS = [colors.primary, colors.bubbleLight, colors.primaryDark];

function Dot({ delay, color }: { delay: number; color: string }) {
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(bob, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(600 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, delay]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          backgroundColor: color,
          opacity: bob.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
          transform: [
            { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
            { scale: bob.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) },
          ],
        },
      ]}
    />
  );
}

/** A little trio of bouncing bubbles — replaces the default spinner everywhere. */
export function BubbleLoader({ size = "medium" }: { size?: "small" | "medium" }) {
  const scale = size === "small" ? 0.7 : 1;
  return (
    <View style={[styles.row, { transform: [{ scale }] }]}>
      <Dot delay={0} color={DOT_COLORS[0]} />
      <Dot delay={150} color={DOT_COLORS[1]} />
      <Dot delay={300} color={DOT_COLORS[2]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  dot: { width: 14, height: 14, borderRadius: 7 },
});
