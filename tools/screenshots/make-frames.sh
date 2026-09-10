#!/usr/bin/env bash
# Turns raw phone screenshots into polished, captioned Play Store screenshots that match the
# app's cream/arrow branding. Put raw captures in tools/screenshots/raw/ and list them in the
# FRAMES array below (filename|caption). Output goes to tools/screenshots/out/.
#
# Usage: ./tools/screenshots/make-frames.sh
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(pwd)"
RAW="$ROOT/raw"
OUT="$ROOT/out"
mkdir -p "$OUT"

CANVAS_W=1080
CANVAS_H=2340
CAP_TOP=200      # caption baseline y
CAP_BAND=320     # reserved height for the caption
PAD=90           # side padding around the screenshot

# filename in raw/  |  caption text
FRAMES=(
  "level17.png|Slide the arrows to clear the maze"
  "level18.png|Hundreds of hand-crafted levels"
)

frame() {
  local img="$RAW/$1" caption="$2" out="$3"
  [ -f "$img" ] || { echo "skip: $img not found"; return; }
  local w h
  w=$(sips -g pixelWidth "$img"  | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$img" | awk '/pixelHeight/{print $2}')
  local availW=$((CANVAS_W - 2*PAD))
  local availH=$((CANVAS_H - CAP_BAND - PAD))
  local dispW dispH
  dispW=$(python3 -c "print(round($w*min($availW/$w,$availH/$h)))")
  dispH=$(python3 -c "print(round($h*min($availW/$w,$availH/$h)))")
  local x=$(((CANVAS_W - dispW)/2))
  local y=$((CAP_BAND + (availH - dispH)/2))
  local svg="$OUT/.$out.svg"
  cat > "$svg" <<EOF
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="$CANVAS_W" height="$CANVAS_H" viewBox="0 0 $CANVAS_W $CANVAS_H">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FBF4E6"/><stop offset="1" stop-color="#EAD7B4"/>
    </linearGradient>
    <clipPath id="round"><rect x="$x" y="$y" width="$dispW" height="$dispH" rx="52"/></clipPath>
  </defs>
  <rect width="$CANVAS_W" height="$CANVAS_H" fill="url(#bg)"/>
  <text x="$((CANVAS_W/2))" y="$CAP_TOP" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="68" font-weight="800" fill="#3D2B1F">$caption</text>
  <rect x="$x" y="$((y+16))" width="$dispW" height="$dispH" rx="52" fill="#000000" opacity="0.12"/>
  <image xlink:href="file://$img" x="$x" y="$y" width="$dispW" height="$dispH" clip-path="url(#round)" preserveAspectRatio="xMidYMid slice"/>
  <rect x="$x" y="$y" width="$dispW" height="$dispH" rx="52" fill="none" stroke="#D6C09B" stroke-width="5"/>
</svg>
EOF
  rsvg-convert -w "$CANVAS_W" -h "$CANVAS_H" "$svg" -o "$OUT/$out.png"
  rm -f "$svg"
  echo "wrote $OUT/$out.png"
}

i=1
for entry in "${FRAMES[@]}"; do
  file="${entry%%|*}"
  cap="${entry#*|}"
  frame "$file" "$cap" "$(printf 'screenshot-%02d' "$i")"
  i=$((i+1))
done
echo "Done. Framed screenshots are in $OUT"
