// Drives a level on a connected Android phone over adb by tapping arrows in a valid
// removal order, so gameplay can be screen-recorded without a human playing.
//
// It compiles src/game, generates the same board the app will show for the level, runs the
// greedy solver from tools/verify-solvable.js, maps each arrow's cell to screen pixels and
// pushes a tap script to the phone.
//
// Screen geometry defaults match a 1080x2400 @480dpi phone (OnePlus 8). GameScreen sizes the
// board as min(windowWidth - 2*24dp, 420dp) wide and lays it out flex-start under the header,
// so the board's left edge is 24dp and its top was measured at 430px on that device. Pass
// --top / --left (px) to override for another phone.
//
// Usage:
//   node tools/autoplay-level.js --level 5 [--serial 192.168.1.2:43335] [--delay 0.55]
//                                [--top 430] [--left 72] [--density 3] [--dry-run]
//
// The app must be on the game screen for that level (or pass --launch to open it from Home,
// which assumes the Home Play button sits at 540,1774 and the level shown is `--level`).
const { execSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, arr) =>
    a.startsWith("--") ? [a.slice(2), arr[i + 1]?.startsWith("--") || arr[i + 1] === undefined ? true : arr[i + 1]] : [],
  ).filter((p) => p.length),
);
const level = Number(args.level ?? 1);
const serial = args.serial ? `-s ${args.serial}` : "";
const delay = Number(args.delay ?? 0.55);
const density = Number(args.density ?? 3); // px per dp
const HORIZONTAL_PADDING = 24; // keep in sync with GameScreen.tsx
const left = Number(args.left ?? HORIZONTAL_PADDING * density);
const top = Number(args.top ?? 430);

const repo = path.resolve(__dirname, "..");
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "arrow-autoplay-"));
execSync(
  `npx --no-install tsc src/game/*.ts --outDir "${outDir}" --rootDir src/game ` +
    `--module commonjs --target es2019 --skipLibCheck --esModuleInterop --strict false`,
  { cwd: repo, stdio: "inherit" },
);
const { generateLevelBoard, findBlockerWithDistance } = require(path.join(outDir, "boardGenerator.js"));
const { getLevelConfig } = require(path.join(outDir, "levels.js"));

const cfg = getLevelConfig(level);
const board = generateLevelBoard(cfg.rows, cfg.cols, cfg.arrowCount, cfg.seed, cfg.tailLengthBias, cfg.blockChance);

// Greedy: repeatedly remove any arrow with a clear path. Same rule the app applies on tap.
let arrows = board.arrows.slice();
const order = [];
let progress = true;
while (arrows.length && progress) {
  progress = false;
  for (let i = 0; i < arrows.length; i++) {
    const { blocker } = findBlockerWithDistance(arrows[i], arrows, board.tails, cfg.rows, cfg.cols);
    if (!blocker) {
      order.push(arrows[i]);
      arrows.splice(i, 1);
      progress = true;
      break;
    }
  }
}
if (arrows.length) {
  console.error(`Level ${level}: solver got stuck with ${arrows.length} arrows left.`);
  process.exit(1);
}

const windowWidthDp = 1080 / density;
const boardSizeDp = Math.min(windowWidthDp - HORIZONTAL_PADDING * 2, 420);
const cellPx = (boardSizeDp / cfg.cols) * density;
const taps = order.map((a) => {
  const x = Math.round(left + (a.col + 0.5) * cellPx);
  const y = Math.round(top + (a.row + 0.5) * cellPx);
  return `input tap ${x} ${y}; sleep ${delay}`;
});
const script = taps.join("\n") + "\n";
console.log(`Level ${level}: ${cfg.rows}x${cfg.cols}, ${order.length} arrows, cell ${cellPx.toFixed(1)}px`);

if (args["dry-run"]) {
  console.log(script);
  process.exit(0);
}
const local = path.join(outDir, "taps.sh");
fs.writeFileSync(local, script);
const adb = (cmd) => execSync(`adb ${serial} ${cmd}`, { stdio: "inherit" });
if (args.launch) {
  adb("shell am force-stop com.jacko.arrowmaze");
  adb("shell monkey -p com.jacko.arrowmaze -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1");
  execSync("sleep 6");
  adb("shell input tap 540 1774");
  execSync("sleep 5");
}
adb(`push "${local}" /data/local/tmp/taps.sh`);
adb("shell sh /data/local/tmp/taps.sh");
console.log("done");
