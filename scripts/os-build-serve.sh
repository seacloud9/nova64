#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# One-shot: build os9-shell, sync it into EVERY served copy, then launch it.
#
# Why this exists: `osBuild` only refreshes nova64/public/os9-shell, but the
# copy you actually open lives in starcade9.github.io/os9-shell. Building one
# and launching the other is why fixes "don't show up". This does both, then
# serves the freshly-built bundle so what you see is always current.
# ---------------------------------------------------------------------------

NOVA64_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STAR_DIR="$NOVA64_DIR/../starcade9/starcade9.github.io"
PORT="${OS9_PORT:-4173}"

echo "🔨 Building os9-shell…"
(cd "$NOVA64_DIR/os9-shell" && pnpm build)

sync_copy() {
  local dest="$1"
  echo "📦 Syncing → $dest"
  rm -rf "${dest:?}/"*
  mkdir -p "$dest"
  cp -r "$NOVA64_DIR/os9-shell/dist/." "$dest/"
}

sync_copy "$NOVA64_DIR/public/os9-shell"
[ -d "$STAR_DIR/os9-shell" ] && sync_copy "$STAR_DIR/os9-shell"

echo ""
echo "✅ All copies now serve bundle:"
grep -o 'assets/index-[^"]*\.js' "$NOVA64_DIR/os9-shell/dist/index.html"
echo ""
echo "🚀 Launching at → http://localhost:${PORT}/os9-shell/"
echo "   (Ctrl+C to stop)"
echo ""
exec sh -c "cd '$NOVA64_DIR/os9-shell' && pnpm preview --port ${PORT} --strictPort"
