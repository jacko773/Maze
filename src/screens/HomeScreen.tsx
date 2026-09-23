import React, { useEffect, useMemo, useState } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Theme } from "../theme/colors";
import { useTheme, useThemedStyles } from "../theme/ThemeContext";
import { shareApp } from "../utils/appLinks";
import { loadProgress, getNextLevelToPlay } from "../storage/progress";
import { getLevelConfig } from "../game/levels";
import { ProgressMap } from "../game/types";

interface HomeScreenProps {
  onPlay: (level: number) => void;
  onOpenSettings: () => void;
}

export default function HomeScreen({
  onPlay,
  onOpenSettings,
}: HomeScreenProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const nodePalette = useMemo(
    () => [theme.gold, theme.gold, theme.blocked, theme.gold],
    [theme],
  );
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
      <StatusBar barStyle={theme.statusBarStyle} />
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={onOpenSettings}
          hitSlop={10}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={22} color={theme.ink} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={shareApp}
          hitSlop={10}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Share Arrow Maze"
        >
          <Ionicons name="share-social-outline" size={22} color={theme.ink} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.arrowDeco}>{"\u27A4"}</Text>
        <Text style={styles.title}>Arrow Maze</Text>
        <Text style={styles.subtitle}>
          Tap arrows to clear the board.{"\n"}Only arrows with a clear path can
          be removed!
        </Text>

        {/* Rendered unconditionally so the centred column keeps its height while
            progress loads - only the progress-dependent contents wait. */}
        <View style={styles.pathRow}>
          {loaded && (
            <>
              <View style={styles.pathTrack} />
              <View style={[styles.node, styles.currentNode]}>
                <Text style={styles.currentNodeText}>{currentLevel}</Text>
              </View>
              {upcoming.map((lvl, i) => (
                <View
                  key={lvl}
                  style={[
                    styles.node,
                    { backgroundColor: nodePalette[i % nodePalette.length] },
                  ]}
                >
                  <Text style={styles.nodeText}>{lvl}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.playButton, !loaded && styles.playButtonPending]}
          onPress={() => onPlay(currentLevel)}
          activeOpacity={0.85}
          disabled={!loaded}
        >
          <Text style={styles.playButtonText}>{currentDifficulty}</Text>
          <Text style={styles.playButtonSubtext}>Level {currentLevel}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    topBar: {
      alignItems: "center",
      alignSelf: "flex-end",
      gap: 4,
      paddingHorizontal: 12,
      paddingTop: 4,
    },
    iconButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
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
      height: 64,
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
    nodeText: { color: theme.onAccent, fontSize: 16, fontWeight: "800" },
    currentNode: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.accent,
      zIndex: 1,
    },
    currentNodeText: { color: theme.onAccent, fontSize: 22, fontWeight: "800" },
    playButton: {
      paddingHorizontal: 40,
      paddingVertical: 12,
      backgroundColor: theme.accent,
      borderRadius: 16,
      alignItems: "center",
      marginTop: 16,
    },
    playButtonPending: { opacity: 0 },
    playButtonText: { fontSize: 18, fontWeight: "800", color: theme.onAccent },
    playButtonSubtext: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.onAccent,
      opacity: 0.75,
      marginTop: 2,
    },
  });
