import { Cell, Direction } from "../game/types";
import { DIRECTION_OFFSET } from "../game/direction";

export interface ArrowShapeGeometry {
  /** Bounding-box size (in pixels) big enough to contain the whole tail + arrowhead. */
  width: number;
  height: number;
  /**
   * Where this bounding box starts, relative to `origin` cell's own top-left corner.
   * Usually negative (the tail commonly extends up/left of the head).
   */
  offsetLeft: number;
  offsetTop: number;
  /** SVG path `d` for the tail's centerline, already shifted into this bbox's local space. */
  tailPathD: string;
  /** SVG polygon `points` for the arrowhead triangle, in the same local space. */
  headPoints: string;
  thickness: number;
}

const HEAD_WIDTH_RATIO = 0.12;
const HEAD_HALF_RATIO = 0.065;
const THICKNESS_RATIO = 0.045;
const PADDING_RATIO = 0.1;
// On dense, high-level boards `cellSize` shrinks small enough that the ratio-based
// thickness/head size above round to near-invisible hairlines. Below this cellSize
// (roughly level ~45+, where boards are 28+ cols), a boosted ratio (with its own floor)
// is used instead so arrows stay legible. Boards above the threshold (lower levels, big
// cells) are completely unaffected - they keep using the normal ratios above.
const SMALL_CELL_THRESHOLD_PX = 13;
const SMALL_CELL_THICKNESS_RATIO = 0.065;
const SMALL_CELL_HEAD_HALF_RATIO = 0.085;
const MIN_THICKNESS_PX = 1.3;
const MIN_HEAD_HALF_PX = 2.2;

/**
 * Builds a single smooth vector shape for one arrow: a continuous centerline running from
 * the farthest tail cell, through every cell in `path`, into the head cell, and finally out
 * to the tip (half a cell further, in `direction`) - plus an arrowhead triangle at that tip.
 *
 * Because the tail and the head->tip leg are one continuous polyline, a stroke with round
 * joins/caps smooths every corner (including the tail-to-head transition) automatically and
 * uniformly - there's no separate per-joint math that can drift out of sync and look thicker
 * or misaligned at any one spot.
 */
export function buildArrowShape(
  path: Cell[], // index 0 = head, ascending index = farther away (matches the `tail` prop order)
  direction: Direction,
  cellSize: number,
  origin: Cell,
  // When true the tip reaches a full cell forward, landing on the NEXT cell's maze point,
  // so the head spans point-to-point (head dot -> next dot). The board generator reserves
  // that forward cell (keeps it empty) and Board only passes true when it is genuinely
  // free, so this never overlaps another arrow. When false (edge arrows, or a contested
  // cell already claimed by another head) the tip stops at this cell's leading edge.
  extendToNextDot: boolean = false,
): ArrowShapeGeometry {
  const thickness =
    cellSize < SMALL_CELL_THRESHOLD_PX
      ? Math.max(cellSize * SMALL_CELL_THICKNESS_RATIO, MIN_THICKNESS_PX)
      : cellSize * THICKNESS_RATIO;
  const headHalf =
    cellSize < SMALL_CELL_THRESHOLD_PX
      ? Math.max(cellSize * SMALL_CELL_HEAD_HALF_RATIO, MIN_HEAD_HALF_PX)
      : cellSize * HEAD_HALF_RATIO;
  const pad = cellSize * PADDING_RATIO;

  const centerX = (cell: Cell) =>
    (cell.col - origin.col) * cellSize + cellSize / 2;
  const centerY = (cell: Cell) =>
    (cell.row - origin.row) * cellSize + cellSize / 2;

  const headX = centerX(path[0]);
  const headY = centerY(path[0]);
  const [dx, dy] = DIRECTION_OFFSET[direction];
  // Reach the next cell's maze point when that cell is reserved/free (extendToNextDot),
  // so the head connects head dot -> next dot. Otherwise stop at this cell's leading
  // edge so the head stays inside its own cell.
  const headReach = extendToNextDot ? cellSize : cellSize * 0.5;
  const tipX = headX + dx * headReach;
  const tipY = headY + dy * headReach;

  // Perpendicular unit vector to `direction`, used to spread the arrowhead's two wings.
  const px = -dy;
  const py = dx;
  const wingA = { x: headX + px * headHalf, y: headY + py * headHalf };
  const wingB = { x: headX - px * headHalf, y: headY - py * headHalf };

  // Farthest tail cell -> ... -> head -> tip. The head->tip leg is always included, so
  // every arrow shows a short shaft even when it has no grown tail cells at all.
  const linePoints = [...path]
    .reverse()
    .map((cell) => ({ x: centerX(cell), y: centerY(cell) }));
  linePoints.push({ x: tipX, y: tipY });

  const allX = [...linePoints.map((p) => p.x), wingA.x, wingB.x];
  const allY = [...linePoints.map((p) => p.y), wingA.y, wingB.y];
  const minX = Math.min(...allX) - pad;
  const maxX = Math.max(...allX) + pad;
  const minY = Math.min(...allY) - pad;
  const maxY = Math.max(...allY) + pad;

  const toLocalX = (x: number) => x - minX;
  const toLocalY = (y: number) => y - minY;

  const tailPathD = linePoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${toLocalX(p.x)} ${toLocalY(p.y)}`)
    .join(" ");

  const headPoints = [{ x: tipX, y: tipY }, wingA, wingB]
    .map((p) => `${toLocalX(p.x)},${toLocalY(p.y)}`)
    .join(" ");

  return {
    width: maxX - minX,
    height: maxY - minY,
    offsetLeft: minX,
    offsetTop: minY,
    tailPathD,
    headPoints,
    thickness,
  };
}
