import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import Svg, { Path, Polygon } from "react-native-svg";
import { ArrowCell, Cell } from "../game/types";
import { theme } from "../theme/colors";
import { DIRECTION_OFFSET } from "../game/direction";
import { buildArrowShape } from "./arrowShape";
import AnimatedArrowFrames from "./AnimatedArrowFrames";
import {
  buildArrowFrames,
  buildPingPongFrames,
  capFrames,
} from "./arrowFrames";

interface ArrowTileProps {
  arrow: ArrowCell;
  size: number;
  left: number;
  top: number;
  tail: Cell[];
  blocked: boolean;
  hinted: boolean;
  extendTip: boolean;
  bumpNonce: number;
  bumpDistance: number;
  onPress: (arrow: ArrowCell) => void;
}

const BUMP_TRAVEL_DURATION = 200;
const BUMP_HOLD_DURATION = 250;
// A bump is a short there-and-back nudge; cap its frames so a bump toward a far-away
// blocker (many cells) doesn't render dozens of SVG shapes at once.
const MAX_BUMP_FRAMES = 12;

function ArrowTile({
  arrow,
  size,
  left,
  top,
  tail,
  blocked,
  hinted,
  extendTip,
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
      // Cap frames so a bump against a distant blocker doesn't mount dozens of SVG shapes.
      const forward = capFrames(
        buildArrowFrames(arrow, tail, bumpSteps),
        MAX_BUMP_FRAMES,
      );
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
    () => buildArrowShape(tail, arrow.direction, size, origin, extendTip),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tail, arrow.direction, size, arrow.row, arrow.col, extendTip],
  );

  // Asymmetric hitSlop that only grows the head cell's touch target in the direction
  // the arrow points, covering the tip region. When the head extends onto the next
  // (reserved, empty) cell the slop reaches into it so the tip stays tappable; when it
  // doesn't extend, no forward slop (avoids bleeding onto a neighbour or off the board).
  const [tipDx, tipDy] = DIRECTION_OFFSET[arrow.direction];
  const tipReach = extendTip ? size * 0.5 : 0;
  const headHitSlop = {
    left: tipDx < 0 ? tipReach : 0,
    right: tipDx > 0 ? tipReach : 0,
    top: tipDy < 0 ? tipReach : 0,
    bottom: tipDy > 0 ? tipReach : 0,
  };

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
    <>
      <Animated.View
        pointerEvents="none"
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
      </Animated.View>

      {/* Touch targets: one full-cell Pressable per grid cell the arrow occupies
          (head + tail), positioned directly in board coordinates as siblings of the
          visual layer. Because they are NOT nested inside the SVG bounding-box
          wrapper, they are never clipped by it (on Android a child spilling outside
          its parent's bounds stops receiving touches - which previously made
          short/no-tail arrows, whose bbox is smaller than a cell, unresponsive).
          Cells are grid-aligned and never overlap between arrows, so there's no
          hitSlop bleed or cross-triggering either. */}
      {tail.map((cell, i) => (
        <Pressable
          key={`touch-${i}`}
          onPress={() => onPress(arrow)}
          // The arrowhead's tip reaches the leading edge of the head cell, so aiming
          // at the tip tends to land just past it in the (usually empty) cell in
          // front. Extend ONLY the head cell (i === 0) ONLY on the side it points,
          // so the tip is comfortably tappable without widening the other three
          // sides into neighbours.
          hitSlop={i === 0 ? headHitSlop : undefined}
          style={{
            position: "absolute",
            left: left + (cell.col - arrow.col) * size,
            top: top + (cell.row - arrow.row) * size,
            width: size,
            height: size,
          }}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
  },
});

// Memoized: a board can hold hundreds of arrows, and GameScreen re-renders on every pan/
// zoom frame and every game-state change. Without this, all of them re-render each time
// (re-running their SVG geometry), which makes big boards mount in visible chunks and
// stutter while panning. With stable props (see `onPress` useCallback in GameScreen) each
// arrow only re-renders when its own props actually change.
export default React.memo(ArrowTile);
