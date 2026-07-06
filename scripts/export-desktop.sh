#!/usr/bin/env bash
# export-desktop.sh — headless Godot export of the Nova64 host to standalone
# desktop binaries buyers can RUN WITHOUT BUILDING:
#
#   nova64-godot/godot_project/bin/export/desktop/Nova64-Windows.exe
#   nova64-godot/godot_project/bin/export/desktop/Nova64-Linux.x86_64
#
# macOS (.app) is intentionally NOT done here — cross-exporting a signed .app
# from a non-mac host is a separate effort (see docs/LEMONSQUEEZY_SELLING.md,
# "Desktop exports" → macOS). Windows + Linux work out of the box.
#
# Prereqs (one-time):
#   - Godot 4.5 editor (this repo uses C:\Program Files\godot45\).
#   - Matching export templates:
#       GODOT_VERSION=4.5 bash nova64-godot/scripts/install-godot-templates.sh
#   - The GDExtension libs built into godot_project/bin/ (build-all.sh linux windows).
#
# Usage (from repo root, WSL):
#   bash scripts/export-desktop.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJ="$ROOT/nova64-godot/godot_project"
OUT="$PROJ/bin/export/desktop"
mkdir -p "$OUT"

# Locate the Windows Godot 4.5 console binary (best for CLI/headless).
GODOT_CANDIDATES=(
  "/mnt/c/Program Files/godot45/Godot_v4.5-stable_win64_console.exe"
  "/mnt/c/Program Files/godot45/Godot_v4.5-stable_win64.exe"
  "/mnt/c/tmp/godot45/Godot_v4.5-stable_win64_console.exe"
  "$(command -v godot4 2>/dev/null || true)"
  "$(command -v godot 2>/dev/null || true)"
)
GODOT=""
for g in "${GODOT_CANDIDATES[@]}"; do
  [ -n "$g" ] && [ -x "$g" ] && { GODOT="$g"; break; }
done
if [ -z "$GODOT" ]; then
  echo "✗ Godot 4.5 not found. Install it (C:\\Program Files\\godot45\\) — skipping desktop export." >&2
  exit 3
fi
echo "▶ Using Godot: $GODOT"

# When driving the Windows Godot binary from WSL, paths must be Windows-form.
to_path() { if [[ "$GODOT" == /mnt/* ]] && command -v wslpath >/dev/null 2>&1; then wslpath -w "$1"; else echo "$1"; fi; }
PROJ_P="$(to_path "$PROJ")"

export_one() {
  local preset="$1" outfile="$2"
  local out_p; out_p="$(to_path "$OUT/$outfile")"
  echo "▶ Exporting '$preset' → $outfile"
  if "$GODOT" --headless --path "$PROJ_P" --export-release "$preset" "$out_p"; then
    echo "✓ $outfile"
  else
    echo "! Export of '$preset' failed — are the 4.5 export templates installed?" >&2
    echo "  Run: GODOT_VERSION=4.5 bash nova64-godot/scripts/install-godot-templates.sh" >&2
    return 1
  fi
}

rc=0
export_one "Windows Desktop" "Nova64-Windows.exe" || rc=1
export_one "Linux/X11" "Nova64-Linux.x86_64" || rc=1
[ -f "$OUT/Nova64-Linux.x86_64" ] && chmod +x "$OUT/Nova64-Linux.x86_64" || true

echo
echo "Desktop exports in: $OUT"
ls -la "$OUT" 2>/dev/null || true
exit $rc
