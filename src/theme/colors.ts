export interface Theme {
  background: string;
  boardBackground: string;
  gridLine: string;
  gridLineStrong: string;
  ink: string;
  inkLight: string;
  blocked: string;
  gold: string;
  goldDark: string;
  hint: string;
  hintLight: string;
  panel: string;
  panelBorder: string;
  cardBrown: string;
  cardBrownLight: string;
  cardLocked: string;
  white: string;
  droplet: string;
  star: string;
  accent: string;
  /** Text and icons drawn on top of `accent` and `gold` filled controls. */
  onAccent: string;
  /** Scrim behind modals, tinted toward the ground so the board dims in its own hue. */
  overlay: string;
  /** Status bar / system bar content style that stays legible on `background`. */
  statusBarStyle: "dark-content" | "light-content";
}

export const lightTheme: Theme = {
  background: "#F3E9D7",
  boardBackground: "#F3E9D7",
  gridLine: "#E3D3B5",
  gridLineStrong: "#D6C09B",
  ink: "#3D2B1F",
  inkLight: "#6B4E38",
  blocked: "#C0392B",
  gold: "#C68A2E",
  goldDark: "#9C6B1F",
  hint: "#22C55E",
  hintLight: "#4ADE80",
  panel: "#EFE1C6",
  panelBorder: "#D9C6A0",
  cardBrown: "#7A5B3F",
  cardBrownLight: "#8B6F52",
  cardLocked: "#C9B896",
  white: "#FFF8EC",
  droplet: "#3F9BD8",
  star: "#E0A72E",
  accent: "#7C5CBF",
  onAccent: "#FFF8EC",
  overlay: "rgba(59,42,26,0.55)",
  statusBarStyle: "dark-content",
};

/** "Noir": ink-black ground with a slate panel and a single blush accent, from
 * Adobe Color's "Soaked in luxury 2" (#07050D #151426 #404959 #D9B6A3 #A68072).
 * Arrows, droplets and the level title share a warm chalk ink so the game screen
 * stays two colours plus ground. `blocked` and `hint` stay red/green because they
 * are gameplay feedback, not decor. Filled controls use `onAccent` (dark text). */
export const darkTheme: Theme = {
  background: "#0C0B16",
  boardBackground: "#0C0B16",
  gridLine: "#151426",
  gridLineStrong: "#2A2F40",
  ink: "#EDE3DC",
  inkLight: "#A68072",
  blocked: "#F06B7E",
  gold: "#D9B6A3",
  goldDark: "#A68072",
  hint: "#7EF0C0",
  hintLight: "#B2F7DA",
  panel: "#151426",
  panelBorder: "#404959",
  cardBrown: "#2B2D40",
  cardBrownLight: "#404959",
  cardLocked: "#1B1B2C",
  white: "#151426",
  droplet: "#EDE3DC",
  star: "#EBD0C2",
  accent: "#D9B6A3",
  onAccent: "#1A1210",
  overlay: "rgba(4,3,10,0.64)",
  statusBarStyle: "light-content",
};
