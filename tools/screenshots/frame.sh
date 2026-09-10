#!/usr/bin/env bash
# Frames a raw phone screenshot onto a branded cream background with a caption banner,
# producing a Play-Store-ready portrait screenshot. Uses only rsvg-convert (no ImageMagick).
#
# Usage: tools/screenshots/frame.sh <raw.png> "<Caption text>" <out.png>
set -euo pipefail

RAW="$1"; CAPTION="$2"; OUT="$3"
ABS="$(cd "$(dirname "$RAW")" && pwd)/$(basename "$RAW")"

# Inline the screenshot as a base64 data URI - librsvg blocks external file:// references.
DATA_URI="data:image/png;base64,$(base64 < "$ABS" | tr -d '\n')"

W=1160; H=2560
IMG_X=80; IMG_Y=320; IMG_W=1000; IMG_H=2222   # 1000x2222 keeps the 1080x2400 aspect

TMP="$(mktemp -t frame).svg"
cat > "$TMP" <<EOF
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="$W" height="$H" viewBox="0 0 $W $H">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FBF4E6"/>
      <stop offset="1" stop-color="#EAD7B4"/>
    </linearGradient>
    <clipPath id="round"><rect x="$IMG_X" y="$IMG_Y" width="$IMG_W" height="$IMG_H" rx="48"/></clipPath>
  </defs>
  <rect width="$W" height="$H" fill="url(#bg)"/>
  <text x="$((W/2))" y="205" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="70" font-weight="800" fill="#3D2B1F">$CAPTION</text>
  <image x="$IMG_X" y="$IMG_Y" width="$IMG_W" height="$IMG_H" clip-path="url(#round)" preserveAspectRatio="xMidYMid slice" xlink:href="$DATA_URI"/>
  <rect x="$IMG_X" y="$IMG_Y" width="$IMG_W" height="$IMG_H" rx="48" fill="none" stroke="#D6C09B" stroke-width="4"/>
</svg>
EOF

rsvg-convert --unlimited -w "$W" -h "$H" "$TMP" -o "$OUT"
rm -f "$TMP"
echo "wrote $OUT"
