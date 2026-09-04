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
): ArrowShapeGeometry {
  const thickness = cellSize * THICKNESS_RATIO;
  const headHalf = cellSize * HEAD_HALF_RATIO;
  const pad = cellSize * PADDING_RATIO;

  const centerX = (cell: Cell) =>
    (cell.col - origin.col) * cellSize + cellSize / 2;
  const centerY = (cell: Cell) =>
    (cell.row - origin.row) * cellSize + cellSize / 2;

  const headX = centerX(path[0]);
  const headY = centerY(path[0]);
  const [dx, dy] = DIRECTION_OFFSET[direction];
  const tipX = headX + dx * (cellSize * 0.5);
  const tipY = headY + dy * (cellSize * 0.5);

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
