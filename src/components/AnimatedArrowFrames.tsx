import React, { useMemo } from "react";
import { Animated } from "react-native";
import Svg, { Path, Polygon } from "react-native-svg";
import { Cell, Direction } from "../game/types";
import { buildArrowShape } from "./arrowShape";

interface AnimatedArrowFramesProps {
  frames: Cell[][];
  origin: Cell;
  size: number;
  direction: Direction;
  t: Animated.Value;
  tailColor: string;
  headColor: string;
}

/**
 * Renders a precomputed sequence of whole-cell "frames" (see `buildArrowFrames`) and
 * crossfades between consecutive frames using opacity, driven by `t` (0..frames.length-1).
 * Each frame is drawn as one smooth vector shape (see `buildArrowShape`) so nothing ever
 * gets stretched or distorted mid-shape - just a clean dissolve from one position to the
 * next.
 */
export default function AnimatedArrowFrames({
  frames,
  origin,
  size,
  direction,
  t,
  tailColor,
  headColor,
}: AnimatedArrowFramesProps) {
  const geometries = useMemo(
    () =>
      frames.map((framePoints) =>
        buildArrowShape(framePoints, direction, size, origin),
      ),
    [frames, direction, size, origin],
  );

  return (
    <>
      {geometries.map((geometry, f) => {
        const opacity = t.interpolate({
          inputRange: [f - 1, f, f + 1],
          outputRange: [0, 1, 0],
          extrapolate: "clamp",
        });

        return (
          <Animated.View
            key={f}
            style={{
              position: "absolute",
              left: geometry.offsetLeft,
              top: geometry.offsetTop,
              width: geometry.width,
              height: geometry.height,
              opacity,
            }}
          >
            <Svg width={geometry.width} height={geometry.height}>
              <Path
                d={geometry.tailPathD}
                stroke={tailColor}
                strokeWidth={geometry.thickness}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <Polygon points={geometry.headPoints} fill={headColor} />
            </Svg>
          </Animated.View>
        );
      })}
    </>
  );
}
