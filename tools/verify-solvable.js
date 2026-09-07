// Solvability verification for the forward-cell-collision change.
// Compiles src/game to a temp dir, generates boards for a range of levels, and greedily
// simulates removal under the SAME findBlockerWithDistance the game uses (which now treats
// each arrow's forward extension cell as a blocker). If every arrow can be removed, the
// board is solvable. Reports any level that gets stuck.
//
// Usage: node tools/verify-solvable.js
const { execSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

const repo = path.resolve(__dirname, "..");
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "arrow-verify-"));

execSync(
  `npx --no-install tsc src/game/*.ts --outDir "${outDir}" --rootDir src/game ` +
    `--module commonjs --target es2019 --skipLibCheck --esModuleInterop --strict false`,
  { cwd: repo, stdio: "inherit" },
);

const { generateLevelBoard, findBlockerWithDistance } = require(
  path.join(outDir, "boardGenerator.js"),
);
const { getLevelConfig } = require(path.join(outDir, "levels.js"));

function isSolvable(board, rows, cols) {
  let arrows = board.arrows.slice();
  const tails = board.tails;
  let progress = true;
  while (arrows.length > 0 && progress) {
    progress = false;
    for (let i = 0; i < arrows.length; i++) {
      const { blocker } = findBlockerWithDistance(
        arrows[i],
        arrows,
        tails,
        rows,
        cols,
      );
      if (!blocker) {
        arrows.splice(i, 1);
        progress = true;
        break;
      }
    }
  }
  return { solved: arrows.length === 0, stuck: arrows.length };
}

let failures = 0;
const levels = [1, 2, 3, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

for (const lvl of levels) {
  const cfg = getLevelConfig(lvl);
  const board = generateLevelBoard(
    cfg.rows,
    cfg.cols,
    cfg.arrowCount,
    cfg.seed,
    cfg.tailLengthBias,
    cfg.blockChance,
  );
  const { solved, stuck } = isSolvable(board, cfg.rows, cfg.cols);
  const heads = board.arrows.length;
  const cells = cfg.rows * cfg.cols;
  const density = ((heads / cells) * 100).toFixed(0);
  // Visual fill = every cell covered by a head, a tail, or a head's forward extension.
  const filled = new Set();
  for (const a of board.arrows) {
    const t = board.tails[a.id] ?? [{ row: a.row, col: a.col }];
    for (const c of t) filled.add(`${c.row},${c.col}`);
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[
      a.direction
    ];
    const fr = a.row + d[1];
    const fc = a.col + d[0];
    if (fr >= 0 && fr < cfg.rows && fc >= 0 && fc < cfg.cols)
      filled.add(`${fr},${fc}`);
  }
  const visual = ((filled.size / cells) * 100).toFixed(0);
  if (!solved) {
    failures++;
    console.log(
      `UNSOLVABLE level ${lvl} (${cfg.rows}x${cfg.cols}) heads=${heads} stuck=${stuck}`,
    );
  } else if (lvl % 10 === 0 || lvl <= 5) {
    console.log(
      `ok level ${lvl} (${cfg.rows}x${cfg.cols}) heads=${heads} headDensity=${density}% visualFill=${visual}%`,
    );
  }
}

console.log(
  failures === 0
    ? `\nALL ${levels.length} levels solvable under forward-cell collision.`
    : `\n${failures} UNSOLVABLE level(s) found.`,
);
process.exit(failures === 0 ? 0 : 1);
