import { ArrowCell, Cell, Difficulty, Direction } from "./types";
import { GeneratedLevelBoard } from "./boardGenerator";

export interface CustomArrowDefinition {
  row: number;
  col: number;
  direction: Direction;
  /**
   * The arrow's full path, head to tail-end, in the same order used everywhere else in
   * the app (index 0 = head, later indices extend further away from the head). The first
   * cell must equal `{ row, col }` above. Omit this (or leave it empty) for an arrow with
   * no tail at all.
   */
  tail?: Cell[];
}

export interface CustomLevelDefinition {
  rows: number;
  cols: number;
  arrows: CustomArrowDefinition[];
  /** Easy / Medium / Hard / Super Hard, shown on the home screen. If omitted, falls back
   * to the same level-number-based thresholds used for procedurally-generated levels. */
  difficulty?: Difficulty;
}

/**
 * Hand-authored level layouts, keyed by level number. Any level not listed here falls back
 * to the procedural generator (see `generateLevelBoard` in `boardGenerator.ts`). Use this
 * to design boards where the exact blocking relationships are guaranteed - e.g. a real
 * hand-built arrow maze like a puzzle book - instead of relying on procedural generation's
 * probabilistic approach.
 *
 * Example:
 * ```ts
 * export const CUSTOM_LEVELS: Record<number, CustomLevelDefinition> = {
 *   1: {
 *     rows: 6,
 *     cols: 6,
 *     arrows: [
 *       // A simple arrow at (0,0) pointing right, with a 2-cell tail going down from it.
 *       {
 *         row: 0,
 *         col: 0,
 *         direction: "right",
 *         tail: [
 *           { row: 0, col: 0 },
 *           { row: 1, col: 0 },
 *         ],
 *       },
 *       // An arrow with no tail at all - just a head.
 *       { row: 2, col: 3, direction: "down" },
 *     ],
 *   },
 * };
 * ```
 */
export const CUSTOM_LEVELS: Record<number, CustomLevelDefinition> = {
};

/** Returns the hand-authored definition for `level`, or `null` if it should fall back to
 * procedural generation. */
export function getCustomLevelConfig(
  level: number,
): CustomLevelDefinition | null {
  return CUSTOM_LEVELS[level] ?? null;
}

/**
 * Converts a hand-authored level definition into the same `{ arrows, tails }` shape the
 * procedural generator produces, so the rest of the app doesn't need to know the
 * difference between a hand-built and a procedurally-generated board.
 */
export function buildCustomLevelBoard(
  def: CustomLevelDefinition,
): GeneratedLevelBoard {
  const arrows: ArrowCell[] = [];
  const tails: Record<string, Cell[]> = {};

  def.arrows.forEach((a, i) => {
    const id = `custom-${i}-${a.row}-${a.col}`;
    arrows.push({ id, row: a.row, col: a.col, direction: a.direction });
    tails[id] =
      a.tail && a.tail.length > 0 ? a.tail : [{ row: a.row, col: a.col }];
  });

  return { arrows, tails };
}
