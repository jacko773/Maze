import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import mobileAds from "react-native-google-mobile-ads";
import HomeScreen from "./src/screens/HomeScreen";
import GameScreen from "./src/screens/GameScreen";

type Screen = "home" | "game";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [level, setLevel] = useState(1);

  useEffect(() => {
    mobileAds()
      .initialize()
      .catch(() => {
        // Ads simply won't be available this session; hint/continue buttons already
        // handle the "not loaded" case gracefully.
      });
  }, []);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <View style={styles.container}>
        {screen === "home" && (
          <HomeScreen
            onPlay={(selected) => {
              setLevel(selected);
              setScreen("game");
            }}
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
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
