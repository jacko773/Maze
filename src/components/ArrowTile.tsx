import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import Svg, { Path, Polygon } from "react-native-svg";
import { ArrowCell, Cell } from "../game/types";
import { theme } from "../theme/colors";
import { buildTailSegments } from "./tailGeometry";
import { buildArrowShape } from "./arrowShape";
import AnimatedArrowFrames from "./AnimatedArrowFrames";
import { buildArrowFrames, buildPingPongFrames } from "./arrowFrames";

interface ArrowTileProps {
  arrow: ArrowCell;
  size: number;
  left: number;
  top: number;
  tail: Cell[];
  blocked: boolean;
  hinted: boolean;
  bumpNonce: number;
  bumpDistance: number;
  onPress: (arrow: ArrowCell) => void;
}

const BUMP_TRAVEL_DURATION = 200;
const BUMP_HOLD_DURATION = 250;
const TOUCH_THICKNESS_RATIO = 0.045;

export default function ArrowTile({
  arrow,
  size,
  left,
  top,
  tail,
  blocked,
  hinted,
  bumpNonce,
  bumpDistance,
  onPress,
}: ArrowTileProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bumpT = useRef(new Animated.Value(0)).current;
  const prevBumpNonce = useRef(bumpNonce);
  const [bumpFrames, setBumpFrames] = useState<Cell[][] | null>(null);

  useEffect(() => {
    if (bumpNonce !== prevBumpNonce.current) {
      prevBumpNonce.current = bumpNonce;
      const bumpSteps = Math.max(0, Math.round(bumpDistance / size));
      const forward = buildArrowFrames(arrow, tail, bumpSteps);
      const pingPong = buildPingPongFrames(forward);
      const peakIndex = forward.length - 1;
      const endIndex = pingPong.length - 1;

      bumpT.setValue(0);
      setBumpFrames(pingPong);

      Animated.sequence([
        Animated.timing(bumpT, {
          toValue: peakIndex,
          duration: BUMP_TRAVEL_DURATION,
          useNativeDriver: true,
        }),
        Animated.delay(BUMP_HOLD_DURATION),
        Animated.timing(bumpT, {
          toValue: endIndex,
          duration: BUMP_TRAVEL_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => setBumpFrames(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bumpNonce]);

  useEffect(() => {
    if (hinted) {
      // Pulse twice to draw the eye, then stop. The green tint (`theme.hint` /
      // `theme.hintLight`) stays applied via `color`/`tailColor` below, so the arrow
      // remains visually marked even after the pulse ends.
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.18,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 },
      );
      loop.start();
      return () => loop.stop();
    }
    pulseAnim.setValue(1);
  }, [hinted, pulseAnim]);

  const color = blocked ? theme.blocked : hinted ? theme.hint : theme.ink;
  const tailColor = blocked
    ? theme.blocked
    : hinted
      ? theme.hintLight
      : theme.inkLight;
  const origin = { row: arrow.row, col: arrow.col };

  const geometry = useMemo(
    () => buildArrowShape(tail, arrow.direction, size, origin),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tail, arrow.direction, size, arrow.row, arrow.col],
  );

  if (bumpFrames) {
    return (
      <Animated.View
        style={[
          styles.wrapper,
          {
            width: size,
            height: size,
            left,
            top,
            transform: [{ scale: pulseAnim }],
          },
        ]}
        pointerEvents="none"
      >
        <AnimatedArrowFrames
          frames={bumpFrames}
          origin={origin}
          size={size}
          direction={arrow.direction}
          t={bumpT}
          tailColor={tailColor}
          headColor={color}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          left: left + geometry.offsetLeft,
          top: top + geometry.offsetTop,
          width: geometry.width,
          height: geometry.height,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <Svg
        width={geometry.width}
        height={geometry.height}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Path
          d={geometry.tailPathD}
          stroke={tailColor}
          strokeWidth={geometry.thickness}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Polygon points={geometry.headPoints} fill={color} />
      </Svg>

      {/* Invisible touch targets, positioned back in the arrow's own origin-relative
          coordinate space (undoing the bbox shift above) so tapping anywhere along the
          tail or the head moves the arrow, same as before. */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: -geometry.offsetLeft,
          top: -geometry.offsetTop,
          width: size,
          height: size,
        }}
      >
        {tail.length >= 2 &&
          buildTailSegments(tail, size, TOUCH_THICKNESS_RATIO, origin).map(
            (seg) => (
              <Pressable
                key={seg.key}
                onPress={() => onPress(arrow)}
                hitSlop={size * 0.25}
                style={{
                  position: "absolute",
                  left: seg.left,
                  top: seg.top,
                  width: seg.width,
                  height: seg.height,
                }}
              />
            ),
          )}
        <Pressable
          onPress={() => onPress(arrow)}
          hitSlop={10}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: size,
            height: size,
          }}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
  },
});
