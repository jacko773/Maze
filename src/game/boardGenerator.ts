import { ArrowCell, Cell, Direction } from "./types";

const ALL_DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const PERPENDICULAR: Record<Direction, Direction[]> = {
  up: ["left", "right"],
  down: ["left", "right"],
  left: ["up", "down"],
  right: ["up", "down"],
};

/** Deterministic seeded PRNG (mulberry32) so a level always generates the same board. */
export function createRng(seed: number): () => number {
  let state = seed | 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Returns the list of [row, col] cells strictly between the arrow and the edge of the board, in its direction. */
export function pathCells(
  row: number,
  col: number,
  direction: Direction,
  rows: number,
  cols: number,
): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  let r = row;
  let c = col;
  while (true) {
    if (direction === "up") r -= 1;
    else if (direction === "down") r += 1;
    else if (direction === "left") c -= 1;
    else c += 1;

    if (r < 0 || r >= rows || c < 0 || c >= cols) break;
    cells.push([r, c]);
  }
  return cells;
}

/** Checks whether an arrow's path to the edge of the board is clear of every other arrow currently on the board (including their tails). */
export function isRemovable(
  arrow: ArrowCell,
  board: ArrowCell[],
  tails: Record<string, Cell[]>,
  rows: number,
  cols: number,
): boolean {
  return findBlocker(arrow, board, tails, rows, cols) === null;
}

/** Returns the first arrow blocking `arrow`'s path to the edge, or null if the path is clear. */
export function findBlocker(
  arrow: ArrowCell,
  board: ArrowCell[],
  tails: Record<string, Cell[]>,
  rows: number,
  cols: number,
): ArrowCell | null {
  return findBlockerWithDistance(arrow, board, tails, rows, cols).blocker;
}

export interface BlockResult {
  /** The first arrow in the way, or null if the path to the edge is clear. */
  blocker: ArrowCell | null;
  /**
   * Number of empty cells `arrow` can travel before hitting `blocker` (or, if `blocker` is
   * null, the total number of empty cells to the edge of the board).
   */
  distanceCells: number;
}

/**
 * Walks `arrow`'s straight path toward the edge of the board, reporting how far it can
 * travel before hitting another arrow's head OR any part of its tail (if any). Used both to
 * decide whether a move is valid and to animate the arrow sliding until it collides (or
 * exits the board).
 */
export function findBlockerWithDistance(
  arrow: ArrowCell,
  board: ArrowCell[],
  tails: Record<string, Cell[]>,
  rows: number,
  cols: number,
): BlockResult {
  const others = board.filter((a) => a.id !== arrow.id);
  const byCell = new Map<string, ArrowCell>();
  for (const other of others) {
    const cells = tails[other.id] ?? [{ row: other.row, col: other.col }];
    for (const cell of cells) {
      byCell.set(`${cell.row},${cell.col}`, other);
    }
    // The arrowhead visually extends one cell forward onto the next maze point, so that
    // cell is a solid obstacle too - a sliding arrow must collide with it rather than
    // pass through another arrow's head. (Off-board forward cells - edge arrows - don't
    // extend, so they add nothing.)
    const fwd = stepCell({ row: other.row, col: other.col }, other.direction);
    if (fwd.row >= 0 && fwd.row < rows && fwd.col >= 0 && fwd.col < cols) {
      const fk = `${fwd.row},${fwd.col}`;
      if (!byCell.has(fk)) byCell.set(fk, other);
    }
  }
  const path = pathCells(arrow.row, arrow.col, arrow.direction, rows, cols);
  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i];
    const blocker = byCell.get(`${r},${c}`);
    if (blocker) return { blocker, distanceCells: i };
  }
  return { blocker: null, distanceCells: path.length };
}

function stepCell(cell: Cell, direction: Direction): Cell {
  switch (direction) {
    case "up":
      return { row: cell.row - 1, col: cell.col };
    case "down":
      return { row: cell.row + 1, col: cell.col };
    case "left":
      return { row: cell.row, col: cell.col - 1 };
    case "right":
      return { row: cell.row, col: cell.col + 1 };
  }
}

/**
 * Picks the order of directions to try when extending a maze tail. Normally perpendicular
 * turns are preferred (to create a zig-zag look), then continuing straight, then doubling
 * back as a last resort. When `preferStraight` is true (the tail has already used up its
 * turn budget), continuing straight is tried first so long tails don't keep zig-zagging
 * every cell.
 */
function candidateDirections(
  prevDirection: Direction | null,
  rand: () => number,
  preferStraight: boolean,
): Direction[] {
  if (!prevDirection) return shuffle(ALL_DIRECTIONS, rand);
  const perpendicular = shuffle(PERPENDICULAR[prevDirection], rand);
  if (preferStraight) {
    return [prevDirection, ...perpendicular, OPPOSITE[prevDirection]];
  }
  return [...perpendicular, prevDirection, OPPOSITE[prevDirection]];
}

/**
 * Grows a long, zig-zagging tail of cells behind an arrow's head, starting from
 * `occupied` (which already contains every cell used by earlier arrows) so the tail never
 * overlaps anything already placed. The tail also never grows into any cell along the
 * arrow's own straight exit line, so the head never visually points into its own tail.
 * Every cell it claims is added to `occupied` (keyed by the arrow's id) as it goes.
 *
 * `tailLengthBias` (0 by default) shifts both the minimum and the random range upward,
 * so harder levels grow noticeably longer, more convoluted tails instead of the same
 * fixed 3-9 cell range every time.
 *
 * `gateTargets`, if provided, is a set of cells that lie along the exit line of some
 * other arrow that's *currently* solvable on its own. Whenever a valid next step would
 * land on one of these cells, it's preferred over the normal zig-zag choice - deliberately
 * blocking that other arrow so it stops being simultaneously solvable. This is how harder
 * levels are built as a dependency chain instead of a pile of mostly-independent arrows.
 *
 * `reserved` holds cells kept empty in front of other arrows' heads (their arrowhead
 * extends into that cell visually), so the tail must never grow into one.
 */
function growTail(
  arrow: ArrowCell,
  occupied: Map<string, string>,
  rows: number,
  cols: number,
  rand: () => number,
  tailLengthBias: number,
  gateTargets: Set<string> | null,
  reserved: Map<string, string>,
): Cell[] {
  const exitCells = new Set(
    pathCells(arrow.row, arrow.col, arrow.direction, rows, cols).map(
      ([r, c]) => `${r},${c}`,
    ),
  );
  const path: Cell[] = [{ row: arrow.row, col: arrow.col }];
  // Sample a size class per arrow so every board has a mix of short, medium and long
  // arrows. Medium and long buckets scale with `tailLengthBias` so hard levels get
  // visibly long, winding tails right from placement (the "hand-drawn arrow maze"
  // aesthetic). Remaining empty cells that the placement loop can't turn into heads
  // are filled with extra head-only arrows in a post-pass (see `fillWithMoreHeads`).
  const sizeRoll = rand();
  let cap: number;
  if (sizeRoll < 0.2) {
    // Small: head + 1-2 tail cells.
    cap = 1 + Math.floor(rand() * 2);
  } else if (sizeRoll < 0.5) {
    // Medium: 3-5 tail cells at bias 0, up to ~15-30 at max bias.
    const mediumBias = Math.floor(tailLengthBias / 2);
    cap = 3 + mediumBias + Math.floor(rand() * (3 + mediumBias));
  } else {
    // Long: 5-10 tail cells at bias 0, up to ~30-60 at max bias.
    cap = 5 + tailLengthBias + Math.floor(rand() * (5 + tailLengthBias));
  }
  // Cap how many times the tail is allowed to change direction. Without this, long tails
  // (higher levels with bigger `tailLengthBias`) turn on almost every cell and read as
  // pure noise; a small per-tail budget (2-4 turns) keeps them recognizably
  // arrow-shaped with a few deliberate bends.
  const maxDirectionChanges = 2 + Math.floor(rand() * 3);
  let directionChanges = 0;
  let lastDirection: Direction | null = null;

  while (path.length - 1 < cap) {
    const current = path[path.length - 1];
    const preferStraight = directionChanges >= maxDirectionChanges;
    const dirs = candidateDirections(lastDirection, rand, preferStraight);
    let moved = false;

    // First pass: prefer any direction that lands on another open arrow's exit line, to
    // actively close it down.
    if (gateTargets && gateTargets.size > 0) {
      for (const dir of dirs) {
        const next = stepCell(current, dir);
        if (
          next.row < 0 ||
          next.row >= rows ||
          next.col < 0 ||
          next.col >= cols
        )
          continue;
        const key = `${next.row},${next.col}`;
        if (occupied.has(key)) continue;
        if (reserved.has(key)) continue;
        if (exitCells.has(key)) continue;
        if (!gateTargets.has(key)) continue;

        occupied.set(key, arrow.id);
        path.push(next);
        if (lastDirection !== null && dir !== lastDirection) {
          directionChanges++;
        }
        lastDirection = dir;
        moved = true;
        gateTargets.delete(key);
        break;
      }
    }

    // Fallback: normal zig-zag-preferring growth.
    if (!moved) {
      for (const dir of dirs) {
        const next = stepCell(current, dir);
        if (
          next.row < 0 ||
          next.row >= rows ||
          next.col < 0 ||
          next.col >= cols
        )
          continue;
        const key = `${next.row},${next.col}`;
        if (occupied.has(key)) continue;
        if (reserved.has(key)) continue;
        if (exitCells.has(key)) continue;

        occupied.set(key, arrow.id);
        path.push(next);
        if (lastDirection !== null && dir !== lastDirection) {
          directionChanges++;
        }
        lastDirection = dir;
        moved = true;
        break;
      }
    }

    if (!moved) break;
  }

  return path;
}

/**
 * Returns every currently-unoccupied cell that lies along the straight exit path of an
 * arrow which is *presently* solvable on its own (its whole path to the edge is clear),
 * mapped to how many *different* open arrows' lines pass through that cell. A cell with
 * count > 1 is an intersection point where a single new arrow can close down several
 * open arrows at once, instead of just one - important because closing exactly one open
 * arrow per new arrow still leaves the open count growing over time (the new arrow
 * itself starts open too), so multi-closes are what actually keep the board tight.
 */
function computeOpenExitCellCounts(
  arrows: ArrowCell[],
  occupied: Map<string, string>,
  reserved: Map<string, string>,
  rows: number,
  cols: number,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const arrow of arrows) {
    const path = pathCells(arrow.row, arrow.col, arrow.direction, rows, cols);
    // An arrow is solvable now only if its whole path is clear of other arrows' heads,
    // tails (occupied) AND their forward extension cells (reserved). Its OWN forward cell
    // (reserved to itself, always path[0]) never blocks it, so exclude self.
    const isOpen = path.every(([r, c]) => {
      const key = `${r},${c}`;
      if (occupied.has(key)) return false;
      const owner = reserved.get(key);
      return owner === undefined || owner === arrow.id;
    });
    if (!isOpen) continue;
    for (const [r, c] of path) {
      const key = `${r},${c}`;
      result.set(key, (result.get(key) ?? 0) + 1);
    }
  }
  return result;
}

export interface GeneratedLevelBoard {
  arrows: ArrowCell[];
  tails: Record<string, Cell[]>;
}

/**
 * Generates a guaranteed-solvable board with decorative zig-zag maze tails. Arrows (plus
 * their tails) are added one at a time: each new arrow's straight exit path must be clear
 * of every cell already claimed by earlier arrows - their heads AND their tails - before its
 * own tail is grown (which also claims cells, so later arrows correctly treat it as an
 * obstacle too). Because of this, removing the arrows in the reverse of their generation
 * order is always a valid solution (though other valid orders may also exist).
 *
 * `blockChance` (0-1) is the probability that a new arrow deliberately targets an
 * existing, currently-solvable arrow: its own head gets placed directly on that arrow's
 * exit line (blocking it immediately, prioritizing intersection cells that close several
 * open arrows at once), and its tail is also biased to cross any other open exit lines it
 * runs into along the way. When the roll misses (or there's nothing open yet to target),
 * the arrow is placed normally at a random empty cell, same as before.
 */
function generateSingleLevelBoard(
  rows: number,
  cols: number,
  arrowCount: number,
  seed: number,
  tailLengthBias: number,
  blockChance: number,
): GeneratedLevelBoard {
  const rand = createRng(seed);
  const occupied = new Map<string, string>();
  const arrows: ArrowCell[] = [];
  const tails: Record<string, Cell[]> = {};
  // Cells kept empty directly in front of each placed head, so its arrowhead can extend
  // one cell forward (head dot -> next dot). Mapped cell -> owning arrow id. Reserved
  // cells are solid obstacles for OTHER arrows (their exit path must avoid them, matching
  // the runtime collision), but never block their own owner. They are NOT added to
  // `occupied`, so head/tail placement bookkeeping stays separate. This is what makes
  // boards sparser and keeps every level solvable under forward-cell collision.
  const reserved = new Map<string, string>();
  const maxArrows = Math.min(arrowCount, rows * cols);
  const maxAttempts = maxArrows * 300;
  let attempts = 0;

  while (arrows.length < maxArrows && attempts < maxAttempts) {
    attempts++;

    let row: number | null = null;
    let col: number | null = null;
    let chosenDir: Direction | null = null;

    // Roll to decide whether this arrow should deliberately block an existing open
    // arrow, rather than just landing wherever random chance puts it. Candidates are
    // tried in order of how many different open arrows they'd close at once (highest
    // first), so a single new arrow can take out several open arrows in one shot
    // instead of just one - otherwise the newly-placed arrow itself starts open too and
    // the total open count only ever grows over time.
    if (arrows.length > 0 && rand() < blockChance) {
      const openExitCellCounts = computeOpenExitCellCounts(
        arrows,
        occupied,
        reserved,
        rows,
        cols,
      );
      const candidates = shuffle([...openExitCellCounts.entries()], rand).sort(
        (a, b) => b[1] - a[1],
      );
      for (const [key] of candidates) {
        const [rStr, cStr] = key.split(",");
        const r = Number(rStr);
        const c = Number(cStr);
        // Never put a head on a cell reserved for another arrow's forward extension.
        if (reserved.has(key)) continue;
        // Prefer the direction whose exit path has the longest clear stretch - that's
        // the direction pointing "inward" (away from the nearest edge). Pointing outward
        // gives a very short exit path that barely blocks anything and gets solved
        // instantly, which is what made most arrows read as "independent". Longer paths
        // cross more of the board -> more chance to block others / be blocked itself.
        const dirs = shuffle(ALL_DIRECTIONS, rand)
          .map((dir) => ({
            dir,
            path: pathCells(r, c, dir, rows, cols),
          }))
          .filter(
            ({ path }) =>
              // Must have at least one on-board cell in front (so the arrowhead has a
              // next maze point to reach), and the WHOLE path must be clear of other
              // arrows' heads/tails (occupied) AND their forward extension cells
              // (reserved). Clearing reserved cells too is what keeps the board solvable
              // once forward cells collide at runtime. The head's own forward cell isn't
              // reserved yet, so this also guarantees a free cell to reserve for it.
              path.length >= 1 &&
              !path.some(([pr, pc]) => {
                const k = `${pr},${pc}`;
                return occupied.has(k) || reserved.has(k);
              }),
          )
          .sort((a, b) => b.path.length - a.path.length);
        if (dirs.length > 0) {
          row = r;
          col = c;
          chosenDir = dirs[0].dir;
          break;
        }
      }
    }

    // Fallback (and the only path for the very first arrow, or when the block-roll
    // path found no candidates): scan every empty cell in a shuffled order and pick the
    // first one that has any legal direction. Previously this picked a single random
    // empty cell per attempt and gave up on it if no direction had a fully-clear exit
    // path, which on a dense board wasted almost every attempt (most random cells were
    // occupied, and even the empty ones were often surrounded). Doing a full sweep here
    // means once this branch fails, the board is genuinely full and we should stop
    // trying to add more arrows.
    if (chosenDir === null) {
      const emptyCells: Array<[number, number]> = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const k = `${r},${c}`;
          if (!occupied.has(k) && !reserved.has(k)) emptyCells.push([r, c]);
        }
      }
      if (emptyCells.length === 0) break;
      const shuffledEmpty = shuffle(emptyCells, rand);
      let placedRowLocal: number | null = null;
      let placedColLocal: number | null = null;
      for (const [er, ec] of shuffledEmpty) {
        // Same "prefer longest / inward-pointing" bias as the block-roll branch above,
        // so even randomly-placed arrows point deep into the board instead of straight
        // off the nearest edge.
        const dirs = shuffle(ALL_DIRECTIONS, rand)
          .map((dir) => ({
            dir,
            path: pathCells(er, ec, dir, rows, cols),
          }))
          .filter(
            ({ path }) =>
              // Same rule as the block-roll branch: an on-board forward cell, and the
              // whole path clear of others' heads/tails (occupied) AND forward cells
              // (reserved), so it can extend dot-to-dot and the board stays solvable.
              path.length >= 1 &&
              !path.some(([r, c]) => {
                const k = `${r},${c}`;
                return occupied.has(k) || reserved.has(k);
              }),
          )
          .sort((a, b) => b.path.length - a.path.length);
        if (dirs.length > 0) {
          chosenDir = dirs[0].dir;
          placedRowLocal = er;
          placedColLocal = ec;
          break;
        }
      }
      if (chosenDir === null) break;
      row = placedRowLocal;
      col = placedColLocal;
    }

    const placedRow = row as number;
    const placedCol = col as number;
    const key = `${placedRow},${placedCol}`;
    const arrow: ArrowCell = {
      id: `${placedRow}-${placedCol}-${arrows.length}`,
      row: placedRow,
      col: placedCol,
      direction: chosenDir,
    };
    occupied.set(key, arrow.id);
    arrows.push(arrow);
    // Every tail (not just the ones whose head was deliberately targeted) opportunistically
    // closes any other currently-open arrow's exit line it happens to cross while growing.
    // Without this, arrows placed by the random fallback path never helped block anything
    // via their tail, which left far more arrows simultaneously open at the start than the
    // blockChance percentage alone would suggest.
    const gateTargets = new Set(
      computeOpenExitCellCounts(arrows, occupied, reserved, rows, cols).keys(),
    );
    tails[arrow.id] = growTail(
      arrow,
      occupied,
      rows,
      cols,
      rand,
      tailLengthBias,
      gateTargets,
      reserved,
    );
    // Reserve the cell directly in front of this head so its arrowhead can extend onto
    // the next maze point. Only when that cell is on the board and not already used by an
    // arrow (heads/tails). Off-board (edge) arrows simply keep their in-cell tip.
    const fwd = stepCell({ row: placedRow, col: placedCol }, chosenDir);
    if (fwd.row >= 0 && fwd.row < rows && fwd.col >= 0 && fwd.col < cols) {
      const fwdKey = `${fwd.row},${fwd.col}`;
      if (!occupied.has(fwdKey)) reserved.set(fwdKey, arrow.id);
    }
  }

  fillWithMoreHeads(arrows, tails, occupied, reserved, rows, cols, rand);

  return { arrows, tails };
}

/**
 * After the main placement loop stops, remaining empty cells typically can't host new
 * heads via the main loop's rule (which requires the head's entire exit path to be clear
 * of ALL existing heads and tails). This second pass relaxes that: an extra head can be
 * added on an empty cell even if its exit path crosses existing tails/heads, as long as
 * the resulting "who-blocks-whom" graph is still a DAG (i.e. some valid removal order
 * still exists).
 *
 * How it works: each arrow gets a "removal position" - a number where SMALLER = removed
 * EARLIER. For arrows placed by the main loop, the reverse-placement order is a valid
 * removal order, so we assign position `n-1-i` to the arrow at index `i`. When trying to
 * insert a new head with head cell (r,c) and direction `dir`:
 *   - P = existing arrows whose head/tail sits on the new head's exit path (they block
 *     the new arrow -> must be removed BEFORE it -> pos(P) < pos(new)).
 *   - S = existing arrows whose exit path passes through (r,c) (the new head sits on
 *     their exit line, so it blocks them -> must be removed AFTER them -> pos(new) <
 *     pos(S)).
 *   - Feasible iff max(pos(P)) < min(pos(S)). If so, the new arrow gets any position
 *     strictly between those bounds (fractional is fine - future insertions just need
 *     the same inequality to hold, which continuous numbers preserve).
 *
 * After a head is placed, a short 2-5 cell tail is grown too. Each tail cell must not
 * lie on an existing arrow's exit path where that arrow's position is <= newPos -
 * otherwise the tail would block an arrow that needs to be removed BEFORE the new one,
 * creating a cycle. Growth stops as soon as no valid next cell exists, so some new
 * arrows end up head-only (in tight spots) and others get short tails.
 */
function fillWithMoreHeads(
  arrows: ArrowCell[],
  tails: Record<string, Cell[]>,
  occupied: Map<string, string>,
  reserved: Map<string, string>,
  rows: number,
  cols: number,
  rand: () => number,
): void {
  const positions = new Map<string, number>();
  for (let i = 0; i < arrows.length; i++) {
    positions.set(arrows[i].id, arrows.length - 1 - i);
  }

  // cell key -> list of arrow ids whose exit path passes through that cell.
  const exitPathIndex = new Map<string, string[]>();
  for (const arrow of arrows) {
    for (const [r, c] of pathCells(
      arrow.row,
      arrow.col,
      arrow.direction,
      rows,
      cols,
    )) {
      const key = `${r},${c}`;
      const list = exitPathIndex.get(key);
      if (list) list.push(arrow.id);
      else exitPathIndex.set(key, [arrow.id]);
    }
  }

  const emptyCells: Array<[number, number]> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = `${r},${c}`;
      if (!occupied.has(k) && !reserved.has(k)) emptyCells.push([r, c]);
    }
  }
  const shuffledEmpty = shuffle(emptyCells, rand);

  for (const [r, c] of shuffledEmpty) {
    // A previous iteration in this same pass may have placed a head here already.
    if (occupied.has(`${r},${c}`)) continue;
    // Or reserved as another arrow's forward extension cell.
    if (reserved.has(`${r},${c}`)) continue;

    for (const dir of shuffle(ALL_DIRECTIONS, rand)) {
      const exit = pathCells(r, c, dir, rows, cols);
      // An arrow needs at least one cell in front to slide off the board.
      if (exit.length === 0) continue;
      // The immediate forward cell must be free (not another arrow's head/tail, not
      // already reserved) so this fill head gets its own reserved cell and can extend
      // its arrowhead dot-to-dot like every other head.
      const [e0r, e0c] = exit[0];
      const e0Key = `${e0r},${e0c}`;
      if (occupied.has(e0Key) || reserved.has(e0Key)) continue;

      // Blockers of the candidate: existing arrows whose head/tail (occupied) OR forward
      // extension cell (reserved) sits on its exit path. They must be removed BEFORE the
      // candidate.
      let maxBlockerPos = -Infinity;
      for (const [pr, pc] of exit) {
        const pk = `${pr},${pc}`;
        const blockerId = occupied.get(pk) ?? reserved.get(pk);
        if (blockerId) {
          const pos = positions.get(blockerId);
          if (pos !== undefined && pos > maxBlockerPos) maxBlockerPos = pos;
        }
      }

      // Successors of the candidate: existing arrows whose exit path passes through
      // (r,c). The candidate's head sits on their exit line, so it blocks them - they
      // must be removed AFTER the candidate.
      let minSuccessorPos = Infinity;
      // Arrows the candidate blocks: those whose exit path passes through its head cell
      // (r,c) OR through its forward extension cell exit[0] (the arrowhead reaches there
      // and blocks them). Both make them successors -> removed AFTER the candidate.
      for (const succKey of [`${r},${c}`, e0Key]) {
        const succIds = exitPathIndex.get(succKey);
        if (!succIds) continue;
        for (const sid of succIds) {
          const pos = positions.get(sid);
          if (pos !== undefined && pos < minSuccessorPos) minSuccessorPos = pos;
        }
      }

      if (maxBlockerPos < minSuccessorPos) {
        // Pick a position strictly between the bounds. Fall back to sensible defaults
        // when one side is unbounded.
        let newPos: number;
        if (maxBlockerPos === -Infinity && minSuccessorPos === Infinity) {
          newPos = arrows.length;
        } else if (maxBlockerPos === -Infinity) {
          newPos = minSuccessorPos - 0.5;
        } else if (minSuccessorPos === Infinity) {
          newPos = maxBlockerPos + 0.5;
        } else {
          newPos = (maxBlockerPos + minSuccessorPos) / 2;
        }

        const newArrow: ArrowCell = {
          id: `${r}-${c}-${arrows.length}`,
          row: r,
          col: c,
          direction: dir,
        };
        arrows.push(newArrow);
        const newTail: Cell[] = [{ row: r, col: c }];
        tails[newArrow.id] = newTail;
        occupied.set(`${r},${c}`, newArrow.id);
        positions.set(newArrow.id, newPos);
        for (const [pr, pc] of exit) {
          const key = `${pr},${pc}`;
          const list = exitPathIndex.get(key);
          if (list) list.push(newArrow.id);
          else exitPathIndex.set(key, [newArrow.id]);
        }
        // Reserve the cell in front of this fill head so its arrowhead can extend onto
        // the next maze point (exit[0] is guaranteed on-board and free - checked above).
        reserved.set(e0Key, newArrow.id);

        // Grow a short tail for the new arrow. Each candidate tail cell must:
        //   - Not already be occupied.
        //   - Not lie on the new arrow's own exit path (would trap it against its own
        //     tail when it tries to slide off).
        //   - Not lie on any existing arrow's exit path where that existing arrow's
        //     removal position is <= newPos (would create a cycle: the tail would
        //     block an arrow that needs to be removed BEFORE the new arrow).
        // We reuse `candidateDirections` / `preferStraight` from `growTail` so the
        // extension still reads as arrow-shaped.
        const ownExitSet = new Set(exit.map(([pr, pc]) => `${pr},${pc}`));
        const tailCap = 2 + Math.floor(rand() * 8); // 2-5 tail cells
        const maxDirChanges = 2 + Math.floor(rand() * 3);
        let dirChanges = 0;
        let lastDir: Direction | null = null;
        while (newTail.length - 1 < tailCap) {
          const current = newTail[newTail.length - 1];
          const preferStraight = dirChanges >= maxDirChanges;
          const dirs = candidateDirections(lastDir, rand, preferStraight);
          let moved = false;
          for (const d of dirs) {
            const next = stepCell(current, d);
            if (
              next.row < 0 ||
              next.row >= rows ||
              next.col < 0 ||
              next.col >= cols
            )
              continue;
            const key = `${next.row},${next.col}`;
            if (occupied.has(key)) continue;
            if (reserved.has(key)) continue;
            if (ownExitSet.has(key)) continue;
            // Any existing arrow whose exit path passes through this cell becomes a
            // successor of the new arrow. That requires newPos < pos(succ) for every
            // such successor. Reject if any violates.
            const succHere = exitPathIndex.get(key);
            let ok = true;
            if (succHere) {
              for (const sid of succHere) {
                if (sid === newArrow.id) continue;
                const p = positions.get(sid);
                if (p !== undefined && p <= newPos) {
                  ok = false;
                  break;
                }
              }
            }
            if (!ok) continue;

            newTail.push(next);
            occupied.set(key, newArrow.id);
            if (lastDir !== null && d !== lastDir) dirChanges++;
            lastDir = d;
            moved = true;
            break;
          }
          if (!moved) break;
        }

        break;
      }
    }
  }
}

/** How many arrows are solvable right now, with nothing removed yet - i.e. exactly what
 * the player sees the moment a level loads. Cheap (O(arrows^2)), unlike simulating the
 * whole removal sequence, so it's safe to run a handful of times per level load. */
function countOpenAtFullBoard(
  arrows: ArrowCell[],
  tails: Record<string, Cell[]>,
  rows: number,
  cols: number,
): number {
  let count = 0;
  for (const arrow of arrows) {
    if (
      findBlockerWithDistance(arrow, arrows, tails, rows, cols).blocker === null
    ) {
      count++;
    }
  }
  return count;
}

const LIGHT_RETRY_ATTEMPTS = 1;

/**
 * Generates a level board (see `generateSingleLevelBoard`). When `blockChance` is above 0,
 * this also tries a small, fixed number of alternate seeds and keeps whichever attempt
 * leaves the fewest arrows solvable right at the start - a cheap, bounded nudge (not an
 * expensive full-removal simulation) so it stays fast even at high levels.
 *
 * Real phones run this several times slower than a dev machine, so `LIGHT_RETRY_ATTEMPTS`
 * is deliberately kept at 1 (i.e. no retrying) - the extra attempts only nudged the
 * open-at-start percentage down modestly but multiplied load time, which was showing up
 * as several *seconds* of visible delay tapping into a level on device.
 */
export function generateLevelBoard(
  rows: number,
  cols: number,
  arrowCount: number,
  seed: number,
  tailLengthBias = 0,
  blockChance = 0,
): GeneratedLevelBoard {
  if (blockChance <= 0 || LIGHT_RETRY_ATTEMPTS <= 1) {
    return generateSingleLevelBoard(
      rows,
      cols,
      arrowCount,
      seed,
      tailLengthBias,
      blockChance,
    );
  }

  let best: GeneratedLevelBoard | null = null;
  let bestOpenCount = Infinity;

  for (let attempt = 0; attempt < LIGHT_RETRY_ATTEMPTS; attempt++) {
    const attemptSeed = seed + attempt * 104729;
    const board = generateSingleLevelBoard(
      rows,
      cols,
      arrowCount,
      attemptSeed,
      tailLengthBias,
      blockChance,
    );
    const openCount = countOpenAtFullBoard(
      board.arrows,
      board.tails,
      rows,
      cols,
    );
    if (openCount < bestOpenCount) {
      bestOpenCount = openCount;
      best = board;
    }
    if (openCount <= 1) break;
  }

  return best as GeneratedLevelBoard;
}
