import React from "react";
import { StyleSheet, View } from "react-native";
import ArrowTile from "./ArrowTile";
import LeavingArrowTile from "./LeavingArrowTile";
import { ArrowCell, Cell } from "../game/types";
import { theme } from "../theme/colors";

interface BoardProps {
  rows: number;
  cols: number;
  boardSize: number;
  arrows: ArrowCell[];
  leaving: ArrowCell[];
  tails: Record<string, Cell[]>;
  travelDistances: Record<string, number>;
  blockedIds: Set<string>;
  bumps: Record<string, { nonce: number; distance: number }>;
  showGrid: boolean;
  hintId: string | null;
  onPress: (arrow: ArrowCell) => void;
  onLeaveComplete: (id: string) => void;
}

export default function Board({
  rows,
  cols,
  boardSize,
  arrows,
  leaving,
  tails,
  travelDistances,
  blockedIds,
  bumps,
  showGrid,
  hintId,
  onPress,
  onLeaveComplete,
}: BoardProps) {
  const cellSize = boardSize / Math.max(rows, cols);

  return (
    <View
      style={[
        styles.board,
        { width: cellSize * cols, height: cellSize * rows },
      ]}
    >
      {showGrid &&
        Array.from({ length: rows * cols }).map((_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const dotSize = Math.max(1.5, cellSize * 0.03);
          return (
            <View
              key={`dot-${r}-${c}`}
              style={[
                styles.gridDot,
                {
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  left: c * cellSize + cellSize / 2 - dotSize / 2,
                  top: r * cellSize + cellSize / 2 - dotSize / 2,
                },
              ]}
            />
          );
        })}

      {arrows.map((arrow) => (
        <ArrowTile
          key={arrow.id}
          arrow={arrow}
          size={cellSize}
          left={arrow.col * cellSize}
          top={arrow.row * cellSize}
          tail={tails[arrow.id] ?? [{ row: arrow.row, col: arrow.col }]}
          blocked={blockedIds.has(arrow.id)}
          hinted={hintId === arrow.id}
          bumpNonce={bumps[arrow.id]?.nonce ?? 0}
          bumpDistance={bumps[arrow.id]?.distance ?? 0}
          onPress={onPress}
        />
      ))}

      {leaving.map((arrow) => (
        <LeavingArrowTile
          key={arrow.id}
          arrow={arrow}
          size={cellSize}
          left={arrow.col * cellSize}
          top={arrow.row * cellSize}
          tail={tails[arrow.id] ?? [{ row: arrow.row, col: arrow.col }]}
          travelDistance={travelDistances[arrow.id] ?? cellSize * 6}
          onDone={onLeaveComplete}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    position: "relative",
    borderRadius: 16,
    overflow: "visible",
    backgroundColor: theme.boardBackground,
  },
  gridDot: {
    position: "absolute",
    backgroundColor: theme.gridLineStrong,
  },
});
