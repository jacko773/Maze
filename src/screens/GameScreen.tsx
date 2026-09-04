import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  PanResponder,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Board from "../components/Board";
import {
  findBlockerWithDistance,
  generateLevelBoard,
  GeneratedLevelBoard,
} from "../game/boardGenerator";
import { getLevelConfig } from "../game/levels";
import {
  getCustomLevelConfig,
  buildCustomLevelBoard,
} from "../game/levelConfigs";
import { ArrowCell, Cell, LevelConfig } from "../game/types";
import { saveLevelResult, starsForMistakes } from "../storage/progress";
import { haptics } from "../utils/haptics";
import { theme } from "../theme/colors";
import { useRewardedAd } from "../ads/useRewardedAd";
import {
  CONTINUE_REWARDED_AD_UNIT_ID,
  HINT_REWARDED_AD_UNIT_ID,
} from "../ads/adUnitIds";

interface GameScreenProps {
  level: number;
  onExit: () => void;
  onNextLevel: (level: number) => void;
}

const HORIZONTAL_PADDING = 24;
const MAX_LIVES = 3;
const MIN_ZOOM = 1;
const MAX_ZOOM = 1.8;
const PAN_ACTIVATION_THRESHOLD = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getTouchDistance(
  a: { pageX: number; pageY: number },
  b: { pageX: number; pageY: number },
) {
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

function getTouchMidpoint(
  a: { pageX: number; pageY: number },
  b: { pageX: number; pageY: number },
) {
  return { x: (a.pageX + b.pageX) / 2, y: (a.pageY + b.pageY) / 2 };
}

/** Uses a hand-authored layout for this level if one exists (see `levelConfigs.ts`),
 * otherwise falls back to the procedural generator. */
function getBoardForLevel(
  level: number,
  config: LevelConfig,
): GeneratedLevelBoard {
  const custom = getCustomLevelConfig(level);
  if (custom) return buildCustomLevelBoard(custom);
  return generateLevelBoard(
    config.rows,
    config.cols,
    config.arrowCount,
    config.seed,
    config.tailLengthBias,
    config.blockChance,
  );
}

interface GestureBaseline {
  mode: "idle" | "pinch" | "pan";
  startDistance: number;
  startZoom: number;
  startOffset: { x: number; y: number };
  startX: number;
  startY: number;
}

const IDLE_GESTURE: GestureBaseline = {
  mode: "idle",
  startDistance: 0,
  startZoom: 1,
  startOffset: { x: 0, y: 0 },
  startX: 0,
  startY: 0,
};

export default function GameScreen({
  level,
  onExit,
  onNextLevel,
}: GameScreenProps) {
  const config = useMemo(() => getLevelConfig(level), [level]);
  const initialBoard = useMemo(
    () => getBoardForLevel(level, config),
    [level, config],
  );

  const [arrows, setArrows] = useState<ArrowCell[]>(initialBoard.arrows);
  const [tails, setTails] = useState<Record<string, Cell[]>>(
    initialBoard.tails,
  );
  const [leaving, setLeaving] = useState<ArrowCell[]>([]);
  const [travelDistances, setTravelDistances] = useState<
    Record<string, number>
  >({});
  const [mistakes, setMistakes] = useState(0);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [blockerFlashIds, setBlockerFlashIds] = useState<Set<string>>(
    new Set(),
  );
  const [bumps, setBumps] = useState<
    Record<string, { nonce: number; distance: number }>
  >({});
  const [showWin, setShowWin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [livesRemaining, setLivesRemaining] = useState(MAX_LIVES);
  const [showOutOfTries, setShowOutOfTries] = useState(false);
  const [showAdUnavailable, setShowAdUnavailable] = useState(false);
  const [hintId, setHintId] = useState<string | null>(null);
  const zoomRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const gestureRef = useRef<GestureBaseline>(IDLE_GESTURE);
  const winTriggeredRef = useRef(false);
  const blockerFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintAd = useRewardedAd(HINT_REWARDED_AD_UNIT_ID);
  const continueAd = useRewardedAd(CONTINUE_REWARDED_AD_UNIT_ID);

  useEffect(() => {
    return () => {
      if (blockerFlashTimeoutRef.current)
        clearTimeout(blockerFlashTimeoutRef.current);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (
      !winTriggeredRef.current &&
      arrows.length === 0 &&
      leaving.length === 0
    ) {
      winTriggeredRef.current = true;
      haptics.win();
      saveLevelResult(level, mistakes).then(() => setShowWin(true));
    }
  }, [arrows.length, leaving.length, level, mistakes]);

  const windowWidth = Dimensions.get("window").width;
  const boardSize = Math.min(windowWidth - HORIZONTAL_PADDING * 2, 420);
  const cellSize = boardSize / Math.max(config.rows, config.cols);

  // Once any arrow's board position changes (something got removed), re-check every
  // persistently-flagged (red) arrow: if its path is clear now, move it automatically -
  // no extra tap needed. This can cascade (freeing one arrow may free another).
  useEffect(() => {
    if (flaggedIds.size === 0) return;

    let nextArrows = arrows;
    const stillFlagged = new Set<string>();
    const autoLeaving: ArrowCell[] = [];
    const newTravelDistances: Record<string, number> = {};

    for (const id of flaggedIds) {
      const arrow = nextArrows.find((a) => a.id === id);
      if (!arrow) continue;
      const { blocker, distanceCells } = findBlockerWithDistance(
        arrow,
        nextArrows,
        tails,
        config.rows,
        config.cols,
      );
      if (blocker === null) {
        nextArrows = nextArrows.filter((a) => a.id !== id);
        autoLeaving.push(arrow);
        newTravelDistances[id] = (distanceCells + 1) * cellSize;
      } else {
        stillFlagged.add(id);
      }
    }

    if (autoLeaving.length > 0) {
      haptics.tapSuccess();
      setArrows(nextArrows);
      setLeaving((prev) => [...prev, ...autoLeaving]);
      setTravelDistances((prev) => ({ ...prev, ...newTravelDistances }));
      setFlaggedIds(stillFlagged);
    }
  }, [arrows, flaggedIds, tails, config, cellSize]);

  function handlePress(arrow: ArrowCell) {
    if (showWin || showOutOfTries) return;
    const { blocker, distanceCells } = findBlockerWithDistance(
      arrow,
      arrows,
      tails,
      config.rows,
      config.cols,
    );

    if (!blocker) {
      haptics.tapSuccess();
      setArrows((prev) => prev.filter((a) => a.id !== arrow.id));
      setTravelDistances((prev) => ({
        ...prev,
        [arrow.id]: (distanceCells + 1) * cellSize,
      }));
      setLeaving((prev) => [...prev, arrow]);
      if (hintId === arrow.id) setHintId(null);
      return;
    }

    haptics.tapBlocked();
    setMistakes((m) => m + 1);
    setFlaggedIds((prev) => new Set(prev).add(arrow.id));
    setBlockerFlashIds(new Set([blocker.id]));
    setBumps((prev) => ({
      ...prev,
      [arrow.id]: {
        nonce: (prev[arrow.id]?.nonce ?? 0) + 1,
        distance: distanceCells * cellSize,
      },
    }));
    if (blockerFlashTimeoutRef.current)
      clearTimeout(blockerFlashTimeoutRef.current);
    blockerFlashTimeoutRef.current = setTimeout(
      () => setBlockerFlashIds(new Set()),
      500,
    );

    setLivesRemaining((lives) => {
      const next = lives - 1;
      if (next <= 0) setShowOutOfTries(true);
      return next;
    });
  }

  function handleLeaveComplete(id: string) {
    setLeaving((prev) => prev.filter((a) => a.id !== id));
    setTravelDistances((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function handleRestart() {
    winTriggeredRef.current = false;
    const board = getBoardForLevel(level, config);
    setArrows(board.arrows);
    setTails(board.tails);
    setLeaving([]);
    setTravelDistances({});
    setMistakes(0);
    setFlaggedIds(new Set());
    setBlockerFlashIds(new Set());
    setBumps({});
    setShowWin(false);
    setShowSettings(false);
    setLivesRemaining(MAX_LIVES);
    setShowOutOfTries(false);
    setHintId(null);
  }

  function handleHint() {
    if (showWin || showOutOfTries) return;
    const solvable = arrows.find(
      (a) =>
        findBlockerWithDistance(a, arrows, tails, config.rows, config.cols)
          .blocker === null,
    );
    if (!solvable) return;
    const shown = hintAd.show(() => {
      setHintId(solvable.id);
      // Hint stays green until the player actually taps/removes the arrow (cleared in
      // `handleArrowPress` when the hinted arrow leaves the board), or until the level
      // resets. Previously it auto-cleared after 1.5s, but that made the hint feel like
      // it "disappeared" before the player could act on it.
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
        hintTimeoutRef.current = null;
      }
    });
    if (!shown) {
      setShowAdUnavailable(true);
    }
  }

  function handleWatchAdToContinue() {
    const shown = continueAd.show(() => {
      setLivesRemaining(1);
      setShowOutOfTries(false);
    });
    if (!shown) {
      setShowAdUnavailable(true);
    }
  }

  const stars = starsForMistakes(mistakes);
  const hasNextLevel = true;

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  const boardZoomResponder = useMemo(
    () =>
      PanResponder.create({
        // Only steal the gesture up front for a genuine pinch (2 fingers). A single
        // finger touch is left alone at start so taps on arrows still reach the
        // Pressable underneath - we only take over mid-gesture once it's clearly a
        // drag (movement past a small threshold) while zoomed in.
        onStartShouldSetPanResponderCapture: (_, gestureState) =>
          gestureState.numberActiveTouches >= 2,
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          if (gestureState.numberActiveTouches >= 2) return true;
          if (zoomRef.current <= 1) return false;
          return (
            Math.abs(gestureState.dx) > PAN_ACTIVATION_THRESHOLD ||
            Math.abs(gestureState.dy) > PAN_ACTIVATION_THRESHOLD
          );
        },
        onPanResponderGrant: () => {
          gestureRef.current = IDLE_GESTURE;
        },
        onPanResponderMove: (event) => {
          const touches = event.nativeEvent.touches;
          const panLimitX = Math.max(
            0,
            (boardSize * zoomRef.current - boardSize) / 2 + 32,
          );
          const panLimitY = Math.max(
            0,
            (boardSize * zoomRef.current - boardSize) / 2 + 32,
          );

          if (touches.length >= 2) {
            const [first, second] = touches;
            const distance = getTouchDistance(first, second);
            const midpoint = getTouchMidpoint(first, second);

            if (gestureRef.current.mode !== "pinch") {
              // Establish the baseline the moment we see 2 fingers, whether or not a
              // single-finger pan was already in progress. Without this, a pinch
              // that starts life as a 1-finger touch would never get a real
              // starting distance and zoom would appear stuck.
              gestureRef.current = {
                mode: "pinch",
                startDistance: distance,
                startZoom: zoomRef.current,
                startOffset: { ...offsetRef.current },
                startX: midpoint.x,
                startY: midpoint.y,
              };
              return;
            }

            const { startDistance, startZoom, startOffset, startX, startY } =
              gestureRef.current;
            if (startDistance <= 0) return;

            const nextZoom = clamp(
              startZoom * (distance / startDistance),
              MIN_ZOOM,
              MAX_ZOOM,
            );
            const nextOffsetX = clamp(
              startOffset.x + (midpoint.x - startX),
              -panLimitX,
              panLimitX,
            );
            const nextOffsetY = clamp(
              startOffset.y + (midpoint.y - startY),
              -panLimitY,
              panLimitY,
            );

            setZoom(nextZoom);
            setOffset({ x: nextOffsetX, y: nextOffsetY });
            return;
          }

          if (zoomRef.current <= 1 || touches.length === 0) return;
          const touch = touches[0];

          if (gestureRef.current.mode !== "pan") {
            gestureRef.current = {
              mode: "pan",
              startDistance: 0,
              startZoom: zoomRef.current,
              startOffset: { ...offsetRef.current },
              startX: touch.pageX,
              startY: touch.pageY,
            };
            return;
          }

          const { startOffset, startX, startY } = gestureRef.current;
          const nextOffsetX = clamp(
            startOffset.x + (touch.pageX - startX),
            -panLimitX,
            panLimitX,
          );
          const nextOffsetY = clamp(
            startOffset.y + (touch.pageY - startY),
            -panLimitY,
            panLimitY,
          );
          setOffset({ x: nextOffsetX, y: nextOffsetY });
        },
        onPanResponderRelease: () => {
          gestureRef.current = IDLE_GESTURE;
        },
        onPanResponderTerminate: () => {
          gestureRef.current = IDLE_GESTURE;
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [boardSize],
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onExit}
          hitSlop={10}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={22} color={theme.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Level {level}</Text>
        <TouchableOpacity
          onPress={() => setShowSettings(true)}
          hitSlop={10}
          style={styles.iconButton}
        >
          <Ionicons name="settings-outline" size={22} color={theme.ink} />
        </TouchableOpacity>
      </View>

      <View style={styles.dropletsRow}>
        {Array.from({ length: MAX_LIVES }).map((_, i) => (
          <Ionicons
            key={i}
            name={i < livesRemaining ? "water" : "water-outline"}
            size={20}
            color={theme.droplet}
            style={styles.droplet}
          />
        ))}
      </View>

      <View style={styles.boardWrapper} {...boardZoomResponder.panHandlers}>
        <View
          style={[
            styles.boardZoomLayer,
            {
              transform: [
                { scale: zoom },
                { translateX: offset.x },
                { translateY: offset.y },
              ],
            },
          ]}
        >
          <Board
            rows={config.rows}
            cols={config.cols}
            boardSize={boardSize}
            arrows={arrows}
            leaving={leaving}
            tails={tails}
            travelDistances={travelDistances}
            blockedIds={
              flaggedIds.size === 0 && blockerFlashIds.size === 0
                ? flaggedIds
                : new Set([...flaggedIds, ...blockerFlashIds])
            }
            bumps={bumps}
            showGrid={showGrid}
            hintId={hintId}
            onPress={handlePress}
            onLeaveComplete={handleLeaveComplete}
          />
        </View>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => setShowGrid((g) => !g)}
        >
          <Ionicons name="grid-outline" size={24} color={theme.ink} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton} onPress={handleHint}>
          <Ionicons name="bulb-outline" size={24} color={theme.ink} />
          <View style={styles.adBadge}>
            <Text style={styles.adBadgeText}>AD</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Modal visible={showSettings} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Paused</Text>
            <View style={styles.modalButtonsColumn}>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={handleRestart}
              >
                <Text style={styles.modalButtonPrimaryText}>Restart Level</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={onExit}
              >
                <Text style={styles.modalButtonSecondaryText}>
                  Exit to Home
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonGhost}
                onPress={() => setShowSettings(false)}
              >
                <Text style={styles.modalButtonGhostText}>Resume</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showOutOfTries} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Out of Tries!</Text>
            <Text style={styles.modalSubtitle}>
              You've used all 3 mistakes for this level.
            </Text>
            <View style={styles.modalButtonsColumn}>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={handleWatchAdToContinue}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  Watch Ad to Continue
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={handleRestart}
              >
                <Text style={styles.modalButtonSecondaryText}>
                  Restart Level
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonGhost}
                onPress={onExit}
              >
                <Text style={styles.modalButtonGhostText}>Exit to Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showAdUnavailable} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.adUnavailableIconWrap}>
              <Ionicons
                name="cloud-offline-outline"
                size={36}
                color={theme.gold}
              />
            </View>
            <Text style={styles.modalTitle}>No Ads Available</Text>
            <Text style={styles.modalSubtitle}>
              We couldn't load an ad right now. Please try again in a few
              seconds.
            </Text>
            <View style={styles.modalButtonsColumn}>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={() => setShowAdUnavailable(false)}
              >
                <Text style={styles.modalButtonPrimaryText}>Got It</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showWin} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Level Complete!</Text>
            <Text style={styles.modalStars}>
              {"\u2605".repeat(stars)}
              {"\u2606".repeat(3 - stars)}
            </Text>
            <Text style={styles.modalSubtitle}>Mistakes: {mistakes}</Text>
            <View style={styles.modalButtons}>
              {stars === 3 ? (
                hasNextLevel ? (
                  <TouchableOpacity
                    style={styles.modalButtonPrimary}
                    onPress={() => onNextLevel(level + 1)}
                  >
                    <Text style={styles.modalButtonPrimaryText}>Next</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.modalButtonPrimary}
                    onPress={onExit}
                  >
                    <Text style={styles.modalButtonPrimaryText}>Finish</Text>
                  </TouchableOpacity>
                )
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.modalButtonSecondary}
                    onPress={handleRestart}
                  >
                    <Text style={styles.modalButtonSecondaryText}>Retry</Text>
                  </TouchableOpacity>
                  {hasNextLevel && (
                    <TouchableOpacity
                      style={styles.modalButtonPrimary}
                      onPress={() => onNextLevel(level + 1)}
                    >
                      <Text style={styles.modalButtonPrimaryText}>Next</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
    elevation: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.panel,
  },
  headerTitle: { color: theme.gold, fontSize: 22, fontWeight: "800" },
  dropletsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
    zIndex: 10,
    elevation: 10,
  },
  droplet: { marginHorizontal: 4 },
  boardWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    overflow: "hidden",
  },
  boardZoomLayer: {
    alignItems: "center",
    justifyContent: "center",
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 20,
    zIndex: 10,
    elevation: 10,
  },
  toolbarButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.panelBorder,
  },
  adBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: theme.gold,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: theme.white,
  },
  adBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: theme.white,
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(59,42,26,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: theme.white,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    width: "80%",
  },
  adUnavailableIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.panel,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.ink,
    marginBottom: 8,
  },
  modalStars: { fontSize: 32, color: theme.star, marginBottom: 8 },
  modalSubtitle: {
    fontSize: 15,
    color: theme.inkLight,
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtons: { flexDirection: "row", gap: 10 },
  modalButtonsColumn: { width: "100%", gap: 10, marginTop: 8 },
  modalButtonSecondary: {
    backgroundColor: theme.panel,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonSecondaryText: { color: theme.ink, fontWeight: "700" },
  modalButtonPrimary: {
    backgroundColor: theme.gold,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonPrimaryText: { color: theme.white, fontWeight: "700" },
  modalButtonGhost: { paddingVertical: 10, alignItems: "center" },
  modalButtonGhostText: { color: theme.inkLight, fontWeight: "600" },
});
