import { LevelConfig, Difficulty } from "./types";
import { getCustomLevelConfig } from "./levelConfigs";

const MIN_SIZE = 6;
const MAX_SIZE = 30; // was 25 - bumped so late-game boards can reach a dense puzzle-book
// aesthetic (many arrows tightly packed). Zoom/pan on the board keeps cells tappable at
// this size, and generation still stays fast (single-pass).
const LEVELS_PER_SIZE_STEP = 2;

const MIN_DENSITY = 1 / 7; // roughly one arrow per 7 cells, the original early-level feel
const MAX_DENSITY = 0.6; // was 0.4 - bumped so hard levels aim for a lot more arrow
// HEADS (dependency-chain complexity), not just longer tails. Placement is naturally
// capped by "each new head needs a clear exit path", so the actual head count on hard
// boards will settle somewhere below this target - but the higher ceiling means the
// loop keeps trying to add heads instead of giving up early at 40% coverage.
const DENSITY_RAMP_PER_LEVEL = 0.005; // was 0.001 - ramps ~5x faster so hard levels
// actually reach the density cap (previously it took ~200 levels to get close)

const MAX_TAIL_LENGTH_BIAS = 25; // was 15 - lets tails grow noticeably longer at the top
// end, so the board fills up with winding L/Z-shaped paths like a hand-drawn arrow maze
const LEVELS_PER_TAIL_BIAS_STEP = 2; // was 3 - +1 extra tail length every 2 levels

// Difficulty tiers (matches the Easy/Medium/Hard/Super Hard labels shown on the home
// screen). Each new arrow has this chance of being deliberately placed to block an
// existing solvable arrow (see `generateLevelBoard`'s `blockChance`) instead of landing
// randomly - so harder levels have noticeably more arrows that depend on something else
// being cleared first, rather than many independent arrows that all happen to work at
// once. This is a single fast generation pass (no retries), so it stays quick even at
// high levels.
const EASY_LEVEL_MAX = 10;
const MEDIUM_LEVEL_MAX = 20;
const HARD_LEVEL_MAX = 50;
const EASY_BLOCK_CHANCE = 0.3; // was 0.2 - a bit more chaining even on the intro levels
const MEDIUM_BLOCK_CHANCE = 0.75; // was 0.5 - most medium arrows now depend on another
const HARD_BLOCK_CHANCE = 0.95; // was 0.7 - almost every hard arrow blocks something
const SUPER_HARD_BLOCK_CHANCE = 1.0; // was 0.85 - every placement tries to block first,
// so the board reads as one big dependency chain instead of piles of independent arrows.
// The fallback to a random empty cell still fires when no open arrow can be targeted
// (i.e. everything currently placed is already blocked), so generation still terminates.

// Levels 1-20 felt too easy on their own difficulty curve, so every generation input
// (size/density/tailLengthBias/blockChance/difficulty label) is computed from
// `level + LEVEL_OFFSET` instead of the raw level number - i.e. level 1 now plays like
// the old level 21, level 2 like the old level 22, etc. The displayed `level` field
// itself is untouched (still starts at 1), only the difficulty curve is shifted.
const LEVEL_OFFSET = 20;

/** Easy (<=10) / Medium (<=20) / Hard (<=50) / Super Hard (50+), purely from the level
 * number. Used for any procedurally-generated level, and as the fallback for a
 * hand-authored one that doesn't specify its own `difficulty`. */
function deriveDifficultyFromLevel(level: number): Difficulty {
  if (level <= EASY_LEVEL_MAX) return "Easy";
  if (level <= MEDIUM_LEVEL_MAX) return "Medium";
  return "Hard";
}

/**
 * Deterministically derives a level's board size, arrow count and RNG seed from its
 * number. The grid grows from 6x6 up to 25x25 (capping there so boards stay playable and
 * cells stay big enough to tap comfortably), and arrow *density* (arrows per cell) keeps
 * climbing slowly forever - from ~1/7 of the board up toward ~1/3 - so levels keep
 * getting harder even indefinitely after the board size itself plateaus. Tails also get
 * longer and more convoluted as levels climb (`tailLengthBias`), so the board fills up
 * edge-to-edge with winding arrow paths rather than staying sparse. There is no upper
 * bound on `level`.
 *
 * If `level` has a hand-authored layout (see `levelConfigs.ts`), its board size and
 * arrow count are used instead - the actual board itself is built from that definition
 * later (see `getBoardForLevel` in `GameScreen.tsx`), this just keeps `rows`/`cols`
 * consistent everywhere else that reads `LevelConfig`.
 */
export function getLevelConfig(level: number): LevelConfig {
  const custom = getCustomLevelConfig(level);
  if (custom) {
    return {
      level,
      rows: custom.rows,
      cols: custom.cols,
      arrowCount: custom.arrows.length,
      seed: 0,
      tailLengthBias: 0,
      blockChance: 0,
      difficulty: custom.difficulty ?? deriveDifficultyFromLevel(level),
    };
  }

  const effectiveLevel = level + LEVEL_OFFSET;
  const size = Math.min(
    MIN_SIZE + Math.floor((effectiveLevel - 1) / LEVELS_PER_SIZE_STEP),
    MAX_SIZE,
  );
  const density = Math.min(
    MAX_DENSITY,
    MIN_DENSITY + (effectiveLevel - 1) * DENSITY_RAMP_PER_LEVEL,
  );
  const arrowCount = Math.max(5, Math.round(size * size * density));
  const tailLengthBias = Math.min(
    MAX_TAIL_LENGTH_BIAS,
    Math.floor((effectiveLevel - 1) / LEVELS_PER_TAIL_BIAS_STEP),
  );
  const blockChance =
    effectiveLevel <= EASY_LEVEL_MAX
      ? EASY_BLOCK_CHANCE
      : effectiveLevel <= MEDIUM_LEVEL_MAX
        ? MEDIUM_BLOCK_CHANCE
        : effectiveLevel <= HARD_LEVEL_MAX
          ? HARD_BLOCK_CHANCE
          : SUPER_HARD_BLOCK_CHANCE;

  return {
    level,
    rows: size,
    cols: size,
    arrowCount,
    seed: effectiveLevel * 7919 + 13,
    tailLengthBias,
    blockChance,
    difficulty: deriveDifficultyFromLevel(effectiveLevel),
  };
}
