import { useCallback, useEffect, useRef, useState } from "react";
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from "react-native-google-mobile-ads";

/**
 * Manages a single rewarded ad's lifecycle: preloads it, tracks whether it's ready, and
 * lets you show it with a callback that only fires if the user actually earned the reward
 * (i.e. watched it through, not just dismissed it). Automatically preloads a fresh ad after
 * each show, since a `RewardedAd` instance can only be shown once.
 */
export function useRewardedAd(adUnitId: string) {
  const adRef = useRef<RewardedAd | null>(null);
  const onEarnedRef = useRef<(() => void) | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let detach: (() => void) | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 5000;

    function setup() {
      const ad = RewardedAd.createForAdRequest(adUnitId);
      adRef.current = ad;
      setLoaded(false);

      const unsubLoaded = ad.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          if (cancelled) return;
          retryDelay = 5000;
          setLoaded(true);
        },
      );
      const unsubEarned = ad.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          onEarnedRef.current?.();
        },
      );
      const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
        if (cancelled) return;
        console.warn(`[useRewardedAd:${adUnitId}] load error`, error);
        setLoaded(false);
        unsubLoaded();
        unsubEarned();
        unsubError();
        unsubClosed();
        // Retry with exponential backoff (capped) instead of giving up
        // permanently or hammering the ad server in a tight loop.
        retryTimeout = setTimeout(() => {
          if (!cancelled) setup();
        }, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 60000);
      });
      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        onEarnedRef.current = null;
        unsubLoaded();
        unsubEarned();
        unsubError();
        unsubClosed();
        if (!cancelled) setup();
      });

      detach = () => {
        unsubLoaded();
        unsubEarned();
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
    (onEarned: () => void) => {
      if (!loaded || !adRef.current) return false;
      onEarnedRef.current = onEarned;
      adRef.current.show();
      return true;
    },
    [loaded],
  );

  return { loaded, show };
}
