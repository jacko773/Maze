export type Direction = "up" | "down" | "left" | "right";

export type Difficulty = "Easy" | "Medium" | "Hard" | "Super Hard";

export interface Cell {
  row: number;
  col: number;
}

export interface ArrowCell {
  id: string;
  row: number;
  col: number;
  direction: Direction;
}

export interface LevelConfig {
  level: number;
  rows: number;
  cols: number;
  arrowCount: number;
  seed: number;
  /** Extra length added to each arrow's zig-zagging tail as levels get harder (see `getLevelConfig`). */
  tailLengthBias: number;
  /** Probability (0-1) that a new arrow is deliberately placed to block an existing,
   * currently-solvable arrow rather than landing wherever random chance puts it (see
   * `getLevelConfig`). */
  blockChance: number;
  /** Easy / Medium / Hard / Super Hard - shown on the home screen and usable anywhere
   * else difficulty-specific behavior is needed (see `getLevelConfig`). */
  difficulty: Difficulty;
}

export interface LevelProgress {
  completed: boolean;
  stars: number;
  bestMistakes: number;
}

export type ProgressMap = Record<number, LevelProgress>;
