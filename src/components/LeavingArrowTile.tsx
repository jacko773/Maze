import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { ArrowCell, Cell } from "../game/types";
import { theme } from "../theme/colors";
import AnimatedArrowFrames from "./AnimatedArrowFrames";
import { buildArrowFrames } from "./arrowFrames";

const SLIDE_DURATION = 900;

interface LeavingArrowTileProps {
  arrow: ArrowCell;
  size: number;
  left: number;
  top: number;
  tail: Cell[];
  travelDistance: number;
  onDone: (id: string) => void;
}

/**
 * Slides the whole arrow (head + tail) out along its own path, like a snake: every part of
 * the body follows the exact cells the head took, just delayed by however many cells it
 * sits behind it. The track continues straight past the head's original cell (in
 * `arrow.direction`) until everything has exited.
 */
export default function LeavingArrowTile({
  arrow,
  size,
  left,
  top,
  tail,
  travelDistance,
  onDone,
}: LeavingArrowTileProps) {
  const t = useRef(new Animated.Value(0)).current;
  const origin = useMemo(() => ({ row: arrow.row, col: arrow.col }), [arrow]);

  const { frames, tMax } = useMemo(() => {
    const extensionSteps = Math.max(1, Math.round(travelDistance / size));
    const framesLocal = buildArrowFrames(
      arrow,
      tail,
      tail.length - 1 + extensionSteps,
    );
    return { frames: framesLocal, tMax: framesLocal.length - 1 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Animated.timing(t, {
      toValue: tMax + 1,
      duration: SLIDE_DURATION,
      useNativeDriver: true,
    }).start(() => onDone(arrow.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      pointerEvents="none"
      style={[styles.wrapper, { width: size, height: size, left, top }]}
    >
      <AnimatedArrowFrames
        frames={frames}
        origin={origin}
        size={size}
        direction={arrow.direction}
        t={t}
        tailColor={theme.inkLight}
        headColor={theme.ink}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "absolute" },
});
