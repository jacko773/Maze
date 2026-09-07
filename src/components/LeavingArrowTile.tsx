import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { ArrowCell, Cell } from "../game/types";
import { theme } from "../theme/colors";
import AnimatedArrowFrames from "./AnimatedArrowFrames";
import { buildArrowFrames, capFrames } from "./arrowFrames";

// The leave animation advances one whole-cell frame at a time, each rendered as its own SVG.
// On big high-level boards a slide can span 100+ frames, which (a) lags when they all mount
// at once and (b) gets crammed into too little time so the arrow flickers away. So the frame
// count is capped (capFrames) and the duration scales with the (capped) frame count, clamped
// so short arrows aren't sluggish and long ones stay smooth and visible.
const MAX_LEAVE_FRAMES = 36;
const MS_PER_FRAME = 50;
const MIN_SLIDE_DURATION = 400;
const MAX_SLIDE_DURATION = 1800;

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
    const full = buildArrowFrames(
      arrow,
      tail,
      tail.length - 1 + extensionSteps,
    );
    const framesLocal = capFrames(full, MAX_LEAVE_FRAMES);
    return { frames: framesLocal, tMax: framesLocal.length - 1 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const duration = Math.min(
      MAX_SLIDE_DURATION,
      Math.max(MIN_SLIDE_DURATION, (tMax + 1) * MS_PER_FRAME),
    );
    Animated.timing(t, {
      toValue: tMax + 1,
      duration,
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
