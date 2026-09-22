import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemePreference = "system" | "light" | "dark";

const THEME_KEY = "arrowgame:themePreference:v1";
const REVIEW_KEY = "arrowgame:reviewPrompted:v1";

export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    const raw = await AsyncStorage.getItem(THEME_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // Fall through to the default below.
  }
  return "system";
}

export async function saveThemePreference(
  preference: ThemePreference,
): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_KEY, preference);
  } catch {
    // Preference just won't survive this session.
  }
}

/** The in-app review flow is quota-limited by the store, so we only ever ask
 * once and remember that we did. */
export async function hasPromptedForReview(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(REVIEW_KEY)) === "1";
  } catch {
    return true;
  }
}

export async function markReviewPrompted(): Promise<void> {
  try {
    await AsyncStorage.setItem(REVIEW_KEY, "1");
  } catch {
    // Ignore.
  }
}
