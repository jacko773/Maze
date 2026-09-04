import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";

/**
 * Real AdMob rewarded ad unit ID (Android only so far - one shared unit used for both the
 * hint reveal and the continue-after-loss reward). iOS doesn't have a real AdMob app/ad unit
 * set up yet, so it falls back to Google's public test ID until that's created - swap it out
 * once an iOS ad unit exists.
 */
const ANDROID_REWARDED_AD_UNIT_ID = "ca-app-pub-9695388811769495/7729662188";

const REWARDED_AD_UNIT_ID = Platform.select({
  android: ANDROID_REWARDED_AD_UNIT_ID,
  default: TestIds.REWARDED,
});

export const HINT_REWARDED_AD_UNIT_ID = REWARDED_AD_UNIT_ID;
export const CONTINUE_REWARDED_AD_UNIT_ID = REWARDED_AD_UNIT_ID;
