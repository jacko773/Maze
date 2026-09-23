import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Difficulty } from "../game/types";
import { Theme } from "../theme/colors";
import { useTheme, useThemedStyles } from "../theme/ThemeContext";
import { openStoreListing, shareApp } from "../utils/appLinks";

interface LevelCompleteModalProps {
  visible: boolean;
  level: number;
  difficulty: Difficulty;
  /** Stars earned out of `MAX_STARS`. */
  stars: number;
  mistakes: number;
  onNext: () => void;
  onRetry: () => void;
}

const MAX_STARS = 3;

/** End-of-level card. The stars pop in one after another so the score reads as a
 * small reward rather than a static label, and the card itself settles in with a
 * spring so it doesn't just appear. Everything uses the theme's ink and single
 * accent; unearned stars are drawn in the panel border colour so they recede. */
export default function LevelCompleteModal({
  visible,
  level,
  difficulty,
  stars,
  mistakes,
  onNext,
  onRetry,
}: LevelCompleteModalProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const starScales = useRef(
    Array.from({ length: MAX_STARS }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    if (!visible) {
      cardScale.setValue(0.92);
      starScales.forEach((scale) => scale.setValue(0));
      return;
    }
    const animation = Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.stagger(
        140,
        starScales.map((scale) =>
          Animated.spring(scale, {
            toValue: 1,
            friction: 5,
            tension: 140,
            useNativeDriver: true,
          }),
        ),
      ),
    ]);
    animation.start();
    return () => animation.stop();
  }, [visible, cardScale, starScales]);

  const perfect = stars >= MAX_STARS;
  const mistakeLabel =
    mistakes === 0
      ? "No mistakes"
      : mistakes === 1
        ? "1 mistake"
        : `${mistakes} mistakes`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.card, { transform: [{ scale: cardScale }] }]}
          accessibilityViewIsModal
        >
          <Text style={styles.eyebrow}>
            Level {level} {"·"} {difficulty}
          </Text>
          <Text style={styles.title}>
            {perfect ? "Perfect!" : "Level Complete"}
          </Text>

          <View
            style={styles.stars}
            accessibilityRole="text"
            accessibilityLabel={`${stars} of ${MAX_STARS} stars`}
          >
            {starScales.map((scale, index) => {
              const earned = index < stars;
              return (
                <Animated.View
                  key={index}
                  style={[
                    index === 1 && styles.starMiddle,
                    { transform: [{ scale }] },
                  ]}
                >
                  <Ionicons
                    name={earned ? "star" : "star-outline"}
                    size={40}
                    color={earned ? theme.accent : theme.panelBorder}
                  />
                </Animated.View>
              );
            })}
          </View>
          <Text style={styles.subtitle}>{mistakeLabel}</Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.primary}
              onPress={onNext}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>Next Level</Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={theme.onAccent}
              />
            </TouchableOpacity>
            {!perfect && (
              <TouchableOpacity
                style={styles.secondary}
                onPress={onRetry}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryText}>Retry for 3 stars</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.footerItem}
              onPress={shareApp}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel="Share Arrow Maze"
            >
              <Ionicons
                name="share-social-outline"
                size={16}
                color={theme.inkLight}
              />
              <Text style={styles.footerText}>Share</Text>
            </TouchableOpacity>
            <View style={styles.footerDivider} />
            <TouchableOpacity
              style={styles.footerItem}
              onPress={openStoreListing}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel="Rate Arrow Maze"
            >
              <Ionicons name="star-outline" size={16} color={theme.inkLight} />
              <Text style={styles.footerText}>Rate</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.overlay,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    card: {
      width: "100%",
      maxWidth: 360,
      backgroundColor: theme.white,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.panelBorder,
      paddingHorizontal: 24,
      paddingTop: 26,
      paddingBottom: 18,
      alignItems: "center",
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: theme.inkLight,
      marginBottom: 6,
    },
    title: {
      fontSize: 26,
      fontWeight: "800",
      color: theme.ink,
      marginBottom: 18,
    },
    stars: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      marginBottom: 14,
    },
    starMiddle: { marginBottom: 8 },
    subtitle: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.inkLight,
      marginBottom: 24,
    },
    buttons: { width: "100%", gap: 10 },
    primary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: theme.gold,
      paddingVertical: 14,
      borderRadius: 14,
    },
    primaryText: { fontSize: 16, fontWeight: "800", color: theme.onAccent },
    secondary: {
      alignItems: "center",
      backgroundColor: theme.panel,
      borderWidth: 1,
      borderColor: theme.panelBorder,
      paddingVertical: 13,
      borderRadius: 14,
    },
    secondaryText: { fontSize: 15, fontWeight: "700", color: theme.ink },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      width: "100%",
      marginTop: 18,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.panelBorder,
    },
    footerItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    footerText: { fontSize: 13, fontWeight: "700", color: theme.inkLight },
    footerDivider: {
      width: StyleSheet.hairlineWidth,
      height: 16,
      backgroundColor: theme.panelBorder,
    },
  });
