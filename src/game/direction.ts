import { Direction } from "./types";

export const ROTATION: Record<Direction, string> = {
  right: "0deg",
  down: "90deg",
  left: "180deg",
  up: "270deg",
};

/** Per-direction unit offset used to translate an arrow along the way it's pointing. */
export const DIRECTION_OFFSET: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
