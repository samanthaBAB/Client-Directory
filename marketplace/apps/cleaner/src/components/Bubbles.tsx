import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "@/theme";

type BubbleSpec = { cx: number; cy: number; r: number; fill: string };

// A cute glossy bubble: a flat circle plus a small offset highlight, the
// classic "soap bubble" illustration trick.
function Bubble({ cx, cy, r, fill }: BubbleSpec) {
  return (
    <>
      <Circle cx={cx} cy={cy} r={r} fill={fill} opacity={0.9} />
      <Circle cx={cx - r * 0.35} cy={cy - r * 0.35} r={r * 0.28} fill={colors.bubbleHighlight} />
    </>
  );
}

const DEFAULT_BUBBLES: BubbleSpec[] = [
  { cx: 40, cy: 60, r: 26, fill: colors.primary },
  { cx: 130, cy: 30, r: 16, fill: colors.bubbleLight },
  { cx: 300, cy: 50, r: 34, fill: colors.primary },
  { cx: 355, cy: 130, r: 18, fill: colors.bubbleLight },
  { cx: 20, cy: 150, r: 14, fill: colors.bubbleLight },
  { cx: 200, cy: 15, r: 12, fill: colors.primaryDark },
];

/**
 * Decorative scattered bubbles, meant to sit behind screen content as a
 * background flourish (absolutely positioned, non-interactive). Not a
 * pixel-perfect illustration — a handful of glossy circles reads as
 * "bubbles" at a glance, which is the goal.
 */
export function Bubbles({
  style,
  width = 375,
  height = 180,
  bubbles = DEFAULT_BUBBLES,
}: {
  style?: StyleProp<ViewStyle>;
  width?: number;
  height?: number;
  bubbles?: BubbleSpec[];
}) {
  return (
    <View pointerEvents="none" style={style}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {bubbles.map((b, i) => (
          <Bubble key={i} {...b} />
        ))}
      </Svg>
    </View>
  );
}
