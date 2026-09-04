import AsyncStorage from "@react-native-async-storage/async-storage";
import { LevelProgress, ProgressMap } from "../game/types";

const STORAGE_KEY = "arrowgame:progress:v1";

export async function loadProgress(): Promise<ProgressMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProgressMap;
  } catch {
    return {};
  }
}

export async function saveLevelResult(
  level: number,
  mistakes: number,
): Promise<ProgressMap> {
  const progress = await loadProgress();
  const stars = starsForMistakes(mistakes);
  const existing = progress[level];

  progress[level] = {
    completed: true,
    stars: Math.max(stars, existing?.stars ?? 0),
    bestMistakes:
      existing?.bestMistakes !== undefined
        ? Math.min(existing.bestMistakes, mistakes)
        : mistakes,
  };

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore persistence failures; progress just won't be saved this session.
  }
  return progress;
}

export function starsForMistakes(mistakes: number): number {
  if (mistakes === 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

export function isLevelUnlocked(level: number, progress: ProgressMap): boolean {
  if (level <= 1) return true;
  return Boolean(progress[level - 1]?.completed);
}

export function getLevelProgress(
  level: number,
  progress: ProgressMap,
): LevelProgress | undefined {
  return progress[level];
}

/** Returns the next level the player should play: the first level (starting from 1)
 * that hasn't been completed yet. Since levels are infinite, this simply scans forward
 * until it finds a gap - it never has to fall back to a "last level" because there isn't
 * one. */
export function getNextLevelToPlay(progress: ProgressMap): number {
  let level = 1;
  while (progress[level]?.completed) {
    level++;
  }
  return level;
}
