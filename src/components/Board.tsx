import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import ArrowTile from "./ArrowTile";
import LeavingArrowTile from "./LeavingArrowTile";
import { ArrowCell, Cell } from "../game/types";
import { DIRECTION_OFFSET } from "../game/direction";
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

function Board({
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
  // Cells are sized by the column count so the board fills the full width it's given.
  // Boards are portrait (rows > cols), so the resulting height (cellSize * rows) is taller
  // than the width - GameScreen's pan/zoom handles any vertical overflow.
  const cellSize = boardSize / cols;

  // Which heads may extend their arrowhead onto the next maze point. The generator
  // reserves the cell in front of each head so it stays blank; a head extends when its
  // forward cell is on the board, not occupied by another arrow, and not already claimed
  // by an earlier arrow (deterministic first-wins so two heads never extend into the same
  // cell). Memoized on [arrows, tails, rows, cols] so gameplay state that doesn't move
  // arrows (bumps, hint, flags) doesn't re-run this O(arrows) pass.
  const extendById = useMemo(() => {
    const occupied = new Set<string>();
    for (const arrow of arrows) {
      const cells = tails[arrow.id] ?? [{ row: arrow.row, col: arrow.col }];
      for (const cell of cells) occupied.add(`${cell.row},${cell.col}`);
    }
    const claimed = new Set<string>();
    const result: Record<string, boolean> = {};
    for (const arrow of arrows) {
      const [dx, dy] = DIRECTION_OFFSET[arrow.direction];
      const fr = arrow.row + dy;
      const fc = arrow.col + dx;
      const key = `${fr},${fc}`;
      const canExtend =
        fr >= 0 &&
        fr < rows &&
        fc >= 0 &&
        fc < cols &&
        !occupied.has(key) &&
        !claimed.has(key);
      if (canExtend) claimed.add(key);
      result[arrow.id] = canExtend;
    }
    return result;
  }, [arrows, tails, rows, cols]);

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
          extendTip={extendById[arrow.id] ?? false}
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

// Memoized so panning/zooming (which re-renders GameScreen every frame) doesn't re-render
// the whole board and its hundreds of arrows. With stable props (onPress/onLeaveComplete
// via useCallback, blockedIds via useMemo in GameScreen) Board only re-renders when the
// board state actually changes.
export default React.memo(Board);
