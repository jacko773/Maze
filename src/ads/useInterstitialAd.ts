import { useCallback, useEffect, useRef, useState } from "react";
import { InterstitialAd, AdEventType } from "react-native-google-mobile-ads";

/**
 * Manages a single interstitial ad's lifecycle: preloads it, tracks whether it's ready, and
 * lets you show it with an `onClosed` callback that fires when the ad is dismissed. Unlike a
 * rewarded ad, an interstitial has no "earned reward" - it's a full-screen ad you show
 * between actions and then continue. Automatically preloads a fresh ad after each show (an
 * `InterstitialAd` instance can only be shown once) and retries loading with backoff on error.
 *
 * `show` returns false when no ad is ready, so the caller can proceed immediately instead of
 * blocking - important for flows (like advancing a level) that must ALWAYS continue even when
 * fill rate is low and nothing loads.
 */
export function useInterstitialAd(adUnitId: string) {
  const adRef = useRef<InterstitialAd | null>(null);
  const onClosedRef = useRef<(() => void) | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let detach: (() => void) | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 5000;

    function setup() {
      const ad = InterstitialAd.createForAdRequest(adUnitId);
      adRef.current = ad;
      setLoaded(false);

      const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        if (cancelled) return;
        retryDelay = 5000;
        setLoaded(true);
      });
      const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
        if (cancelled) return;
        console.warn(`[useInterstitialAd:${adUnitId}] load error`, error);
        setLoaded(false);
        unsubLoaded();
        unsubError();
        unsubClosed();
        // Retry with exponential backoff (capped) instead of giving up permanently or
        // hammering the ad server in a tight loop.
        retryTimeout = setTimeout(() => {
          if (!cancelled) setup();
        }, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 60000);
      });
      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        const onClosed = onClosedRef.current;
        onClosedRef.current = null;
        unsubLoaded();
        unsubError();
        unsubClosed();
        if (!cancelled) setup();
        onClosed?.();
      });

      detach = () => {
        unsubLoaded();
        unsubError();
        unsubClosed();
      };
      ad.load();
    }

    setup();

    return () => {
      cancelled = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      detach?.();
    };
  }, [adUnitId]);

  const show = useCallback(
    (onClosed: () => void) => {
      if (!loaded || !adRef.current) return false;
      onClosedRef.current = onClosed;
      adRef.current.show();
      return true;
    },
    [loaded],
  );

  return { loaded, show };
}
