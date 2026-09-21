import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { colors } from "@/theme";

const HOLES = [
  { cx: 22, cy: 20, r: 4 },
  { cx: 45, cy: 15, r: 3 },
  { cx: 65, cy: 28, r: 4.5 },
  { cx: 30, cy: 42, r: 3.5 },
  { cx: 55, cy: 48, r: 3 },
  { cx: 75, cy: 12, r: 2.5 },
];

/** A cute rounded sponge with a few "holes" for texture. Purely decorative. */
export function Sponge({ size = 90, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={style}>
      <Svg width={size} height={size * 0.62} viewBox="0 0 90 56">
        <Rect x={2} y={2} width={86} height={50} rx={16} fill={colors.sponge} />
        {HOLES.map((h, i) => (
          <Circle key={i} cx={h.cx} cy={h.cy} r={h.r} fill={colors.spongeHole} opacity={0.7} />
        ))}
      </Svg>
    </View>
  );
}
