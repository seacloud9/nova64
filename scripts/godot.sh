#!/usr/bin/env bash
# Launch Godot 4.5 on the Nova64 Godot project from the repo root (WSL).
#
#   scripts/godot.sh editor             # open the Godot editor (cart picker)
#   scripts/godot.sh metaverse [url]    # run the metaverse cart (default 127.0.0.1)
#   scripts/godot.sh run <cart> [url]   # run any cart by name
#
# Uses ws://127.0.0.1:2567 by default: with WSL mirrored networking a native
# Godot (Windows) reaches the WSL server over IPv4 loopback. Note `localhost`
# resolves to IPv6 ::1, which does NOT traverse mirrored loopback — use the IP.
set -e

GODOT_DIR="/mnt/c/Program Files/godot45"
GUI="$GODOT_DIR/Godot_v4.5-stable_win64.exe"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJ="$(wslpath -w "$ROOT/nova64-godot/godot_project" 2>/dev/null || echo "$ROOT/nova64-godot/godot_project")"

# Endpoint comes from the repo-root .env (single source of truth).
if [ -f "$ROOT/.env" ]; then
  set -a
  . "$ROOT/.env"
  set +a
fi
DEFAULT_URL="${NOVA64_NET_URL:-ws://127.0.0.1:2567}"

# The metaverse cart's source of truth is examples/metaverse; the Godot project
# needs the files under res://carts/metaverse (the module loader reads them), so
# sync from source before launching rather than maintaining a second copy.
sync_metaverse() {
  local src="$ROOT/examples/metaverse"
  local dst="$ROOT/nova64-godot/godot_project/carts/metaverse"
  [ -d "$src" ] || return 0
  if [ -e "$dst" ] && [ "$(realpath "$src")" = "$(realpath "$dst")" ]; then
    return 0
  fi
  mkdir -p "$dst/core" "$dst/plugins"
  cp "$src/code.js" "$dst/code.js"
  cp "$src/core/"*.js "$dst/core/"
  cp "$src/plugins/"*.js "$dst/plugins/"
}

mode="${1:-metaverse}"
case "$mode" in
  sync)
    sync_metaverse; echo "synced examples/metaverse -> carts/metaverse"; exit 0 ;;
  editor)
    sync_metaverse
    exec "$GUI" -e --path "$PROJ" ;;
  metaverse)
    sync_metaverse
    exec "$GUI" --path "$PROJ" -- "${2:-$DEFAULT_URL}" metaverse ;;
  run)
    cart="${2:-metaverse}"
    [ "$cart" = "metaverse" ] && sync_metaverse
    exec "$GUI" --path "$PROJ" -- "${3:-$DEFAULT_URL}" "$cart" ;;
  *)
    echo "usage: scripts/godot.sh [editor|metaverse|run <cart> [url]]" >&2
    exit 1 ;;
esac
