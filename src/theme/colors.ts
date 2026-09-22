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

/** "Moss": a deep forest ground with a chalk ink, so arrows read like chalk on a
 * green board, and a single apricot accent for everything tappable. Droplets and
 * the level title share the ink so the game screen stays two colours plus ground.
 * `blocked` and `hint` stay red/green because they are gameplay feedback, not decor.
 * Filled controls use `onAccent` (dark text) rather than `white`. */
export const darkTheme: Theme = {
  background: "#0E1712",
  boardBackground: "#0E1712",
  gridLine: "#182620",
  gridLineStrong: "#2F4839",
  ink: "#EAF0DC",
  inkLight: "#A7B79A",
  blocked: "#F06B7E",
  gold: "#F4A261",
  goldDark: "#C97F45",
  hint: "#7EF0C0",
  hintLight: "#B2F7DA",
  panel: "#1E3026",
  panelBorder: "#2F4839",
  cardBrown: "#3C5446",
  cardBrownLight: "#4B6656",
  cardLocked: "#2A3A31",
  white: "#17261E",
  droplet: "#EAF0DC",
  star: "#F7B98A",
  accent: "#F4A261",
  onAccent: "#1A0F05",
  overlay: "rgba(3,8,5,0.62)",
  statusBarStyle: "light-content",
};
