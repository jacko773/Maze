import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";

/**
 * Real AdMob rewarded ad unit ID for the HINT reveal (Android). iOS doesn't have a real
 * AdMob app/ad unit set up yet, so it falls back to Google's public test ID until that's
 * created - swap it out once an iOS ad unit exists.
 */
const ANDROID_HINT_REWARDED_AD_UNIT_ID =
  "ca-app-pub-9695388811769495/7729662188";

/**
 * Rewarded ad unit ID for the CONTINUE (out-of-tries) reward. Kept separate from the hint
 * unit so the two placements can be tracked/optimized independently in AdMob.
 */
const ANDROID_CONTINUE_REWARDED_AD_UNIT_ID =
  "ca-app-pub-9695388811769495/4695945942";

export const HINT_REWARDED_AD_UNIT_ID = Platform.select({
  android: ANDROID_HINT_REWARDED_AD_UNIT_ID,
  default: TestIds.REWARDED,
});

export const CONTINUE_REWARDED_AD_UNIT_ID = Platform.select({
  android: ANDROID_CONTINUE_REWARDED_AD_UNIT_ID,
  default: TestIds.REWARDED,
});

/**
 * Interstitial ad shown when advancing to the next level (from level 11+). A separate format
 * from the rewarded ads above: it's a full-screen ad shown between levels with no reward, and
 * the game always continues to the next level whether or not it loads/shows.
 */
const ANDROID_INTERSTITIAL_AD_UNIT_ID =
  "ca-app-pub-9695388811769495/8193810009";

export const NEXT_LEVEL_INTERSTITIAL_AD_UNIT_ID = Platform.select({
  android: ANDROID_INTERSTITIAL_AD_UNIT_ID,
  default: TestIds.INTERSTITIAL,
});
