import { Linking, Platform, Share } from "react-native";
import * as StoreReview from "expo-store-review";
import { hasPromptedForReview, markReviewPrompted } from "../storage/settings";

export const ANDROID_PACKAGE = "com.jacko.arrowmaze";

export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
export const PRIVACY_POLICY_URL =
  "https://jacko773.github.io/Maze/privacy-policy.html";
export const TERMS_URL = "https://jacko773.github.io/Maze/terms.html";

/** The store page to send a player to when they explicitly ask to rate or share.
 * `StoreReview.storeUrl()` resolves from the app config, which is the right answer
 * on iOS; Android always has the Play listing derived from the package name. */
function storeListingUrl(): string {
  if (Platform.OS === "android") return PLAY_STORE_URL;
  return StoreReview.storeUrl() ?? PLAY_STORE_URL;
}

export async function openUrl(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/** Opens the store listing. Deliberately *not* the native in-app review sheet:
 * the store rate-limits that flow and silently no-ops when the quota is spent,
 * which would leave a tapped button doing nothing. */
export async function openStoreListing(): Promise<boolean> {
  return openUrl(storeListingUrl());
}

export async function shareApp(): Promise<void> {
  const url = storeListingUrl();
  try {
    await Share.share(
      {
        message: `I'm playing Arrow Maze - tap arrows to clear the board, but only the ones with a clear path can escape. See how far you get!\n\n${url}`,
        // iOS shows `url` as a rich preview alongside the message; Android folds
        // the link into `message` above.
        ...(Platform.OS === "ios" ? { url } : null),
      },
      { dialogTitle: "Share Arrow Maze" },
    );
  } catch {
    // The user dismissed the sheet, or no share targets exist.
  }
}

/** Asks the store for a native review prompt after a genuine moment of success.
 * Expo's guidance is to never wire this to a button, so it is called from level
 * completion and only once per install. */
export async function requestReviewAfterMilestone(): Promise<void> {
  if (await hasPromptedForReview()) return;
  try {
    if (!(await StoreReview.hasAction())) return;
    await markReviewPrompted();
    await StoreReview.requestReview();
  } catch {
    // Review flow unavailable on this device/build; nothing to do.
  }
}
