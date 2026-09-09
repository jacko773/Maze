import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import { ArrowCell, Cell } from "../game/types";
import { DIRECTION_OFFSET } from "../game/direction";
import { theme } from "../theme/colors";
import AnimatedArrowFrames from "./AnimatedArrowFrames";
import { buildArrowFrames, capFrames } from "./arrowFrames";

// The arrow leaves like a snake: the body follows the head's own track. That snake motion
// only *morphs* the shape while the tail is still rounding the head's path - i.e. during the
// first `tailLength` cells (the "unwind"). Once the tail has passed the head's starting cell
// the whole arrow is a rigid straight shape that just glides on in `arrow.direction`.
//
// The two phases run back-to-back (Animated.sequence):
//   Phase A (unwind): the snake unwinds, rendered as its ~tailLength one-cell frames, cross-
//     faded (frames one cell apart => smooth, no ghosting). Capped so a very long tail can't
//     mount too many SVGs.
//   Phase B (glide):  the straightened arrow, translated with a native transform (cheap +
//     smooth however far it travels), fading out at the very end.
// Both phases run at ONE constant pixel speed, so the arrow never looks faster or slower with
// tail length or level. The total time is just (total distance / speed), and when that gets
// clamped at the extremes the clamp scales BOTH phases equally, so the speed stays uniform
// within any single slide.
const MAX_MORPH_FRAMES = 20;
const SPEED_PX_PER_MS = 0.45; // ~450 px/sec, constant across the whole leave

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
 * Slides the whole arrow (head + tail) out along its own path like a snake, then keeps
 * gliding straight in `arrow.direction` until it has left the board, fading out at the end.
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
  // Phase A drives `morph` (0..last morph frame); Phase B drives `glide` (0..1).
  const morph = useRef(new Animated.Value(0)).current;
  const glide = useRef(new Animated.Value(0)).current;
  const origin = useMemo(
    () => ({ row: arrow.row, col: arrow.col }),
    [arrow.row, arrow.col],
  );

  const [dx, dy] = DIRECTION_OFFSET[arrow.direction];

  const { morphFrames, morphMax, morphPx, glidePx } = useMemo(() => {
    const headIndex = tail.length - 1; // tail cells behind the head (0 = no tail)
    // Frames 0..headIndex: the snake unwinds; the last is the fully-straightened arrow the
    // glide then carries off. Capped so a very long tail can't mount too many SVGs.
    const frames = capFrames(
      buildArrowFrames(arrow, tail, headIndex),
      MAX_MORPH_FRAMES,
    );
    // Straight run (in cells) for the head to leave, plus the tail length so the whole body
    // clears before it fades. Converted to pixels for a constant on-screen glide speed.
    const glideCells =
      Math.max(1, Math.round(travelDistance / size)) + tail.length;
    return {
      morphFrames: frames,
      morphMax: frames.length - 1,
      // Forward distance (px) the head covers while the tail unwinds - it advances one cell
      // per tail cell, so exactly `headIndex` cells over the unwind.
      morphPx: headIndex * size,
      glidePx: glideCells * size,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const totalPx = morphPx + glidePx;
    // One constant speed for the whole leave: time is purely distance / speed (no clamping),
    // so every arrow moves at exactly the same pixels/second regardless of tail length.
    const totalDuration = totalPx / SPEED_PX_PER_MS;
    // Split the time in proportion to each phase's distance, so the unwind and the glide move
    // at the exact same pixels/second.
    const morphDuration = totalPx > 0 ? totalDuration * (morphPx / totalPx) : 0;
    const glideDuration = totalDuration - morphDuration;

    const phases: Animated.CompositeAnimation[] = [];
    if (morphMax > 0 && morphDuration > 0) {
      phases.push(
        Animated.timing(morph, {
          toValue: morphMax,
          duration: morphDuration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
    }
    phases.push(
      Animated.timing(glide, {
        toValue: 1,
        duration: glideDuration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    Animated.sequence(phases).start(() => onDone(arrow.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Straight glide: translate the remaining distance; no movement during the unwind.
  const translateX = glide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dx * glidePx],
  });
  const translateY = glide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dy * glidePx],
  });
  // Stay fully opaque through the slide, then fade out over the very end of the glide.
  const opacity = glide.interpolate({
    inputRange: [0, 0.85, 1],
    outputRange: [1, 1, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrapper,
        {
          width: size,
          height: size,
          left,
          top,
          opacity,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    >
      <AnimatedArrowFrames
        frames={morphFrames}
        origin={origin}
        size={size}
        direction={arrow.direction}
        t={morph}
        tailColor={theme.inkLight}
        headColor={theme.ink}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "absolute" },
});
