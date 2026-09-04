import React, { useEffect, useMemo, useState } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme/colors";
import { loadProgress, getNextLevelToPlay } from "../storage/progress";
import { getLevelConfig } from "../game/levels";
import { ProgressMap } from "../game/types";

interface HomeScreenProps {
  onPlay: (level: number) => void;
}

const NODE_PALETTE = [theme.gold, theme.gold, theme.blocked, theme.gold];

export default function HomeScreen({ onPlay }: HomeScreenProps) {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadProgress().then((p) => {
      setProgress(p);
      setLoaded(true);
    });
  }, []);

  const currentLevel = useMemo(() => getNextLevelToPlay(progress), [progress]);
  const upcoming = Array.from({ length: 4 }, (_, i) => currentLevel + i + 1);
  const currentDifficulty = useMemo(
    () => getLevelConfig(currentLevel).difficulty,
    [currentLevel],
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <Text style={styles.arrowDeco}>{"\u27A4"}</Text>
        <Text style={styles.title}>Arrow Maze</Text>
        <Text style={styles.subtitle}>
          Tap arrows to clear the board.{"\n"}Only arrows with a clear path can
          be removed!
        </Text>

        {loaded && (
          <>
            <View style={styles.pathRow}>
              <View style={styles.pathTrack} />
              <View style={[styles.node, styles.currentNode]}>
                <Text style={styles.currentNodeText}>{currentLevel}</Text>
              </View>
              {upcoming.map((lvl, i) => (
                <View
                  key={lvl}
                  style={[
                    styles.node,
                    { backgroundColor: NODE_PALETTE[i % NODE_PALETTE.length] },
                  ]}
                >
                  <Text style={styles.nodeText}>{lvl}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.playButton}
          onPress={() => onPlay(currentLevel)}
          activeOpacity={0.85}
        >
          <Text style={styles.playButtonText}>
            {currentLevel < 20
              ? "Easy"
              : currentLevel < 100
                ? "Medium"
                : "Hard"}
          </Text>
          <Text style={styles.playButtonSubtext}>Level {currentLevel}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  arrowDeco: {
    fontSize: 56,
    color: theme.ink,
    marginBottom: 4,
    transform: [{ rotate: "90deg" }],
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: theme.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: theme.inkLight,
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  pathRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 20,
  },
  pathTrack: {
    position: "absolute",
    left: 30,
    right: 30,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.panel,
  },
  node: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: -4,
    borderWidth: 3,
    borderColor: theme.background,
  },
  nodeText: { color: theme.white, fontSize: 16, fontWeight: "800" },
  currentNode: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.accent,
    zIndex: 1,
  },
  currentNodeText: { color: theme.white, fontSize: 22, fontWeight: "800" },
  playButton: {
    paddingHorizontal: 40,
    paddingVertical: 12,
    backgroundColor: theme.accent,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
  },
  playButtonText: { fontSize: 18, fontWeight: "800", color: theme.white },
  playButtonSubtext: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.white,
    opacity: 0.75,
    marginTop: 2,
  },
});
