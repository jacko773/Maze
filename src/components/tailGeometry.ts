import { Cell } from "../game/types";

export interface TailSegmentStyle {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius: number;
}

/**
 * Converts a path of grid cells into a flat list of rounded-rect segment styles (straight
 * bars between consecutive cell centers, plus circular joints at every cell to smooth
 * corners). Positions are relative to `origin` so this can be used both in board-absolute
 * coordinates (origin = {0,0}) and inside a single arrow's own small wrapper (origin = the
 * arrow's own cell, so children can be positioned relative to it).
 */
export function buildTailSegments(
  path: Cell[],
  cellSize: number,
  thicknessRatio: number,
  origin: Cell = { row: 0, col: 0 },
): TailSegmentStyle[] {
  const thickness = cellSize * thicknessRatio;
  const segments: TailSegmentStyle[] = [];
  const centerX = (cell: Cell) =>
    (cell.col - origin.col) * cellSize + cellSize / 2;
  const centerY = (cell: Cell) =>
    (cell.row - origin.row) * cellSize + cellSize / 2;

  path.forEach((cell, i) => {
    segments.push({
      key: `joint-${i}`,
      left: centerX(cell) - thickness / 2,
      top: centerY(cell) - thickness / 2,
      width: thickness,
      height: thickness,
      borderRadius: thickness / 2,
    });
  });

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (a.row === b.row) {
      segments.push({
        key: `bar-${i}`,
        left: Math.min(centerX(a), centerX(b)),
        top: centerY(a) - thickness / 2,
        width: Math.abs(centerX(b) - centerX(a)),
        height: thickness,
        borderRadius: thickness / 2,
      });
    } else {
      segments.push({
        key: `bar-${i}`,
        left: centerX(a) - thickness / 2,
        top: Math.min(centerY(a), centerY(b)),
        width: thickness,
        height: Math.abs(centerY(b) - centerY(a)),
        borderRadius: thickness / 2,
      });
    }
  }

  return segments;
}
