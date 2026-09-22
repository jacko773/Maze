import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import mobileAds from "react-native-google-mobile-ads";
import HomeScreen from "./src/screens/HomeScreen";
import GameScreen from "./src/screens/GameScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import {
  ThemeProvider,
  useTheme,
  useThemeSettings,
} from "./src/theme/ThemeContext";

type Screen = "home" | "game" | "settings";

function Root() {
  const [screen, setScreen] = useState<Screen>("home");
  const [level, setLevel] = useState(1);
  const theme = useTheme();
  const { ready } = useThemeSettings();

  useEffect(() => {
    mobileAds()
      .initialize()
      .catch(() => {
        // Ads simply won't be available this session; hint/continue buttons already
        // handle the "not loaded" case gracefully.
      });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Held back until the stored theme preference has been read, so a player on
          dark mode never sees a frame of the light palette. */}
      {ready && (
        <>
          {screen === "home" && (
            <HomeScreen
              onPlay={(selected) => {
                setLevel(selected);
                setScreen("game");
              }}
              onOpenSettings={() => setScreen("settings")}
            />
          )}
          {screen === "game" && (
            <GameScreen
              key={level}
              level={level}
              onExit={() => setScreen("home")}
              onNextLevel={(nextLevel) => setLevel(nextLevel)}
            />
          )}
          {screen === "settings" && (
            <SettingsScreen onBack={() => setScreen("home")} />
          )}
        </>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
