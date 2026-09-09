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

/** An axis-aligned rectangle (in grid cells) covering one straight run of an arrow. */
interface CellRun {
  minRow: number;
  minCol: number;
  maxRow: number;
  maxCol: number;
}

/**
 * Collapses an arrow's ordered path cells (head -> ... -> tail tip) into the fewest
 * axis-aligned rectangles: each maximal straight run of cells becomes one rectangle. A
 * straight-tailed arrow of N cells becomes a SINGLE rectangle; an L/Z-shaped one becomes 2-3.
 * On dense high-level boards this turns thousands of per-cell touch views into a few hundred,
 * which is the main cost behind the post-tap commit lag. The runs only ever cover the arrow's
 * own (exclusively occupied) cells, so they never overlap another arrow. The corner cell is
 * shared by both adjoining runs, which is harmless (same arrow, same handler).
 */
function mergeCellRuns(cells: Cell[]): CellRun[] {
  if (cells.length === 0) return [];
  const rectFrom = (a: number, b: number): CellRun => {
    let minRow = cells[a].row;
    let maxRow = cells[a].row;
    let minCol = cells[a].col;
    let maxCol = cells[a].col;
    for (let i = a + 1; i <= b; i++) {
      minRow = Math.min(minRow, cells[i].row);
      maxRow = Math.max(maxRow, cells[i].row);
      minCol = Math.min(minCol, cells[i].col);
      maxCol = Math.max(maxCol, cells[i].col);
    }
    return { minRow, minCol, maxRow, maxCol };
  };

  const runs: CellRun[] = [];
  let startIdx = 0;
  for (let i = 2; i < cells.length; i++) {
    const prevDr = cells[i - 1].row - cells[i - 2].row;
    const prevDc = cells[i - 1].col - cells[i - 2].col;
    const curDr = cells[i].row - cells[i - 1].row;
    const curDc = cells[i].col - cells[i - 1].col;
    if (curDr !== prevDr || curDc !== prevDc) {
      runs.push(rectFrom(startIdx, i - 1));
      startIdx = i - 1; // corner cell is shared with the next run
    }
  }
  runs.push(rectFrom(startIdx, cells.length - 1));
  return runs;
}

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

  // Touch targets as merged straight-run rectangles (see `mergeCellRuns`) instead of one per
  // cell - far fewer native views on dense boards. Run 0 always contains the head (cells[0]).
  const touchRuns = useMemo(() => mergeCellRuns(tail), [tail]);

  // Asymmetric hitSlop that only grows the head cell's touch target in the direction
  // the arrow points, covering the tip region. When the head extends onto the next
  // (reserved, empty) cell its arrowhead is drawn a FULL cell forward, so the slop
  // reaches a full cell too - otherwise the outer/upper half of the arrowhead (the part
  // sitting in the next cell) isn't tappable and taps there do nothing. That forward cell
  // is guaranteed empty whenever `extendTip` is true, so a full-cell reach can't bleed
  // onto a neighbour. When it doesn't extend, no forward slop.
  const [tipDx, tipDy] = DIRECTION_OFFSET[arrow.direction];
  const tipReach = extendTip ? size : 0;
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

      {/* Touch targets: one Pressable per straight RUN of cells the arrow occupies (see
          `mergeCellRuns`), positioned directly in board coordinates as siblings of the
          visual layer. Kept OUT of the SVG bounding-box wrapper so they are never clipped
          by it (on Android a child spilling outside its parent's bounds stops receiving
          touches). Runs only cover the arrow's own grid cells and never overlap another
          arrow, so there's no cross-triggering. */}
      {touchRuns.map((run, i) => (
        <Pressable
          key={`touch-${i}`}
          onPress={() => onPress(arrow)}
          style={{
            position: "absolute",
            left: left + (run.minCol - arrow.col) * size,
            top: top + (run.minRow - arrow.row) * size,
            width: (run.maxCol - run.minCol + 1) * size,
            height: (run.maxRow - run.minRow + 1) * size,
          }}
        />
      ))}

      {/* Tip extension: when the head reaches onto the (reserved, empty) cell in front, the
          runs above only cover the head's own cell, so add a single head-cell Pressable
          whose forward hitSlop makes that protruding arrowhead tip tappable. Applied to a
          1-cell base (not a run) so the slop only ever grows straight ahead of the head - a
          run can be perpendicular/multi-cell, and slopping its whole forward edge would bleed
          onto neighbours. Only rendered when the head actually extends. */}
      {extendTip && (
        <Pressable
          key="touch-tip"
          onPress={() => onPress(arrow)}
          hitSlop={headHitSlop}
          style={{
            position: "absolute",
            left,
            top,
            width: size,
            height: size,
          }}
        />
      )}
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
