import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import * as SystemUI from "expo-system-ui";
import { darkTheme, lightTheme, Theme } from "./colors";
import {
  loadThemePreference,
  saveThemePreference,
  ThemePreference,
} from "../storage/settings";

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** False until the stored preference has been read, so the first paint can be
   * held back instead of flashing the wrong palette. */
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  isDark: false,
  preference: "system",
  setPreference: () => {},
  ready: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadThemePreference().then((stored) => {
      setPreferenceState(stored);
      setReady(true);
    });
  }, []);

  const isDark =
    preference === "system" ? systemScheme === "dark" : preference === "dark";
  const theme = isDark ? darkTheme : lightTheme;

  // Paints the native root view too, so the window behind the React tree matches
  // during rotation, keyboard insets and the brief gap before the first frame.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.background).catch(() => {
      // Cosmetic only; the React-side background already covers the screen.
    });
  }, [theme.background]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    saveThemePreference(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, isDark, preference, setPreference, ready }),
    [theme, isDark, preference, setPreference, ready],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useThemeSettings(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Memoises a `StyleSheet.create` factory against the active palette so screens
 * keep module-level style objects instead of rebuilding them on every render. */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
