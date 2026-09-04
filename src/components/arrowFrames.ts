import { ArrowCell, Cell } from "../game/types";
import { DIRECTION_OFFSET } from "../game/direction";

/**
 * Builds a sequence of whole-cell "frames" for an arrow sliding along its own path: frame 0
 * is the arrow at rest, and each subsequent frame shifts every point (head + tail) one cell
 * further along the same track the head takes - continuing straight in `arrow.direction`
 * once a point moves past where the head started. Each frame is a plain `Cell[]` (index 0 =
 * head, following indices = tail, in original order) so it can be rendered with the exact
 * same static geometry used at rest - no shape gets stretched or interpolated mid-frame.
 */
export function buildArrowFrames(
  arrow: ArrowCell,
  tail: Cell[],
  maxSteps: number,
): Cell[][] {
  const headIndex = tail.length - 1;
  const reversed = [...tail].reverse(); // 0 = farthest tail cell ... headIndex = head
  const [dx, dy] = DIRECTION_OFFSET[arrow.direction];

  function trackCell(k: number): Cell {
    if (k <= headIndex) {
      const clamped = Math.max(0, Math.min(headIndex, k));
      return reversed[clamped];
    }
    const extra = k - headIndex;
    return { row: arrow.row + dy * extra, col: arrow.col + dx * extra };
  }

  const frames: Cell[][] = [];
  for (let step = 0; step <= maxSteps; step++) {
    const points: Cell[] = [];
    for (let i = 0; i <= headIndex; i++) {
      points.push(trackCell(headIndex - i + step));
    }
    frames.push(points);
  }
  return frames;
}

/** Turns a one-way frame sequence into a there-and-back "ping-pong" sequence. */
export function buildPingPongFrames(frames: Cell[][]): Cell[][] {
  if (frames.length <= 1) return frames;
  return [...frames, ...frames.slice(0, -1).reverse()];
}
