/**
 * In-memory frequency cap for the between-levels interstitial ad. Kept at module scope (not
 * React state) on purpose: `GameScreen` is keyed by level and remounts on every level change,
 * so component state wouldn't persist between levels. This resets on app restart, which is
 * fine for a soft UX cap.
 *
 * An interstitial is only allowed when ALL of these hold:
 *   - the level is past the intro levels (>= MIN_LEVEL),
 *   - at least MIN_LEVEL_GAP levels have passed since the last shown ad, AND
 *   - at least MIN_TIME_GAP_MS have passed since the last shown ad.
 * Both gaps together keep ads from feeling frequent whether the player is slow or fast.
 */
const MIN_LEVEL = 11; // never before level 11 (i.e. only when level > 10)
const MIN_LEVEL_GAP = 3; // at least this many levels between interstitials
const MIN_TIME_GAP_MS = 60_000; // and at least this long since the last one

let lastShownLevel = -Infinity;
let lastShownAtMs = -Infinity;

/** Whether an interstitial may be shown when advancing from `level`. */
export function canShowInterstitial(level: number): boolean {
  if (level < MIN_LEVEL) return false;
  if (level - lastShownLevel < MIN_LEVEL_GAP) return false;
  if (Date.now() - lastShownAtMs < MIN_TIME_GAP_MS) return false;
  return true;
}

/** Record that an interstitial was actually shown at `level` (call only on a real show). */
export function markInterstitialShown(level: number): void {
  lastShownLevel = level;
  lastShownAtMs = Date.now();
}
