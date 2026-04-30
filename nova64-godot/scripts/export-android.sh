#!/usr/bin/env bash
# export-android.sh — headless Android APK export. Skips Android Studio and
# the Godot editor UI entirely.
#
# Prereqs (one-time):
#   1. scripts/install-android-toolchain.sh   (NDK r23c, build deps)
#   2. scripts/install-android-sdk-packages.sh (platform-tools, build-tools)
#   3. scripts/install-godot-templates.sh      (export templates)
#   4. scripts/build-all.sh android            (.so artifacts in bin/)
#   5. cp godot_project/export_presets.cfg.example godot_project/export_presets.cfg
#
# Usage:
#   bash scripts/export-android.sh                    # both presets, debug
#   bash scripts/export-android.sh arm64              # only arm64 device APK
#   bash scripts/export-android.sh x86_64             # only emulator APK
#   bash scripts/export-android.sh both release       # release variants
#
# Output: nova64-godot/bin/export/nova64-host[-x86_64].apk

set -euo pipefail

cd "$(dirname "$0")/.."

GODOT="${GODOT:-godot}"
WHICH="${1:-both}"
MODE="${2:-debug}"

if ! command -v "$GODOT" > /dev/null; then
  echo "[!] '$GODOT' not on PATH. Set GODOT=/path/to/godot or add it to PATH." >&2
  exit 1
fi

PROJECT_DIR="godot_project"
PRESETS_FILE="${PROJECT_DIR}/export_presets.cfg"
OUT_DIR="bin/export"
mkdir -p "$OUT_DIR"

if [ ! -f "$PRESETS_FILE" ]; then
  if [ -f "${PRESETS_FILE}.example" ]; then
    echo "[+] Activating export_presets.cfg from .example template"
    cp "${PRESETS_FILE}.example" "$PRESETS_FILE"
  else
    echo "[!] Missing $PRESETS_FILE and no .example fallback." >&2
    exit 1
  fi
fi

if [ "$MODE" = "release" ]; then
  EXPORT_FLAG="--export-release"
else
  EXPORT_FLAG="--export-debug"
fi

run_export() {
  local preset="$1" out="$2"
  echo "[+] Exporting preset '$preset' (${MODE}) -> $out"
  "$GODOT" --headless --path "$PROJECT_DIR" "$EXPORT_FLAG" "$preset" "../${out}"
  if [ -f "$out" ]; then
    local size
    size=$(stat -c%s "$out" 2>/dev/null || stat -f%z "$out")
    echo "    OK  size=${size} bytes"
  else
    echo "[!] Export reported success but $out is missing." >&2
    exit 1
  fi
}

case "$WHICH" in
  arm64)
    run_export "Android ARM64" "${OUT_DIR}/nova64-host.apk"
    ;;
  x86_64)
    run_export "Android x86_64 (Emulator)" "${OUT_DIR}/nova64-host-x86_64.apk"
    ;;
  both)
    run_export "Android ARM64" "${OUT_DIR}/nova64-host.apk"
    run_export "Android x86_64 (Emulator)" "${OUT_DIR}/nova64-host-x86_64.apk"
    ;;
  *)
    echo "Usage: $0 [arm64|x86_64|both] [debug|release]" >&2
    exit 2
    ;;
esac

echo "[+] Done. APKs in nova64-godot/${OUT_DIR}/"
ls -la "$OUT_DIR" | grep -E "\.apk$" || true
