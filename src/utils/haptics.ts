import * as Haptics from "expo-haptics";

/** Thin wrappers around expo-haptics that swallow errors on platforms (e.g. web) without support. */
export const haptics = {
  tapSuccess() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  tapBlocked() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => {},
    );
  },
  win() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
  },
};
