#!/usr/bin/env bash
# measure-android.sh — install + run the Nova64 Godot host on a connected
# Android device and capture frame-time / bridge-latency telemetry.
#
# Prerequisites:
#   - Android device with USB debugging enabled and authorized for this host
#   - Godot 4.4 editor with Android export templates configured
#   - bash scripts/install-android-toolchain.sh
#   - bash scripts/install-android-sdk-packages.sh
#   - bash scripts/build-all.sh android
#   - APK exported to nova64-godot/bin/export/nova64-host.apk
#       (export from Godot UI using the "Android ARM64" preset, or run:
#        godot --headless --path godot_project --export-debug "Android ARM64" \
#              ../bin/export/nova64-host.apk)
#
# Usage:
#   bash scripts/measure-android.sh [cart_dir]
#
#   cart_dir: name of cart under godot_project/carts/ (default: 04-instances)
#
# Output: nova64-godot/bench/android-<cart>-<timestamp>.log
#         containing frame timestamps (microsecond resolution) plus the
#         tail of `nova64_carts.log` from device user storage.

set -euo pipefail

cd "$(dirname "$0")/.."

CART="${1:-04-instances}"
APK="bin/export/nova64-host.apk"
PACKAGE="org.nova64.host"
TS="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="bench"
OUT="${OUT_DIR}/android-${CART}-${TS}.log"

mkdir -p "$OUT_DIR"

if ! command -v adb > /dev/null; then
  if [ -x "${HOME}/Android/Sdk/platform-tools/adb" ]; then
    export PATH="${HOME}/Android/Sdk/platform-tools:$PATH"
  else
    echo "[!] adb not on PATH. Install platform-tools first:" >&2
    echo "    bash scripts/install-android-sdk-packages.sh" >&2
    exit 1
  fi
fi

DEVICE_COUNT=$(adb devices | grep -E "\sdevice$" | wc -l)
if [ "$DEVICE_COUNT" -eq 0 ]; then
  echo "[!] No authorized Android device connected." >&2
  echo "    Run: adb devices  (then accept the prompt on the device)" >&2
  exit 1
fi
echo "[+] Device(s):"; adb devices

if [ ! -f "$APK" ]; then
  cat >&2 <<EOF
[!] APK not found at $APK

    Export from the Godot editor:
      File -> Export -> Android ARM64 -> Export Project
      Path: $(pwd)/$APK

    Or headless (requires templates configured):
      godot --headless --path godot_project \\
            --export-debug "Android ARM64" \\
            ../$APK
EOF
  exit 1
fi

echo "[+] Installing $APK..."
adb install -r -g "$APK" > /dev/null

# Persist which cart should run on next launch via a sentinel file in the
# app's external files dir. The Godot host reads ANDROID_CART env / a known
# path on startup (cart_loader.gd already supports a 'carts/_default' override).
adb shell "run-as $PACKAGE mkdir -p files 2>/dev/null || true"
echo "[+] Marking cart=${CART} for next launch"
adb shell "echo ${CART} > /sdcard/Android/data/${PACKAGE}/files/_default_cart.txt" || true

echo "[+] Clearing logcat..."
adb logcat -c

echo "[+] Launching $PACKAGE..."
adb shell am start -n "${PACKAGE}/com.godot.game.GodotApp" > /dev/null

echo "[+] Capturing logcat for 30s into $OUT ..."
{
  echo "# Nova64 Android perf capture"
  echo "# cart=${CART}"
  echo "# device=$(adb shell getprop ro.product.model | tr -d '\r')"
  echo "# soc=$(adb shell getprop ro.board.platform | tr -d '\r')"
  echo "# os=$(adb shell getprop ro.build.version.release | tr -d '\r')"
  echo "# ts=${TS}"
  echo "# ----"
  timeout 30 adb logcat -v time \
    godot:V GodotJNI:V Nova64:V '*:S' || true
  echo "# ---- end logcat ----"
  echo "# nova64_carts.log tail:"
  adb shell "run-as $PACKAGE cat files/nova64_carts.log 2>/dev/null | tail -200" || true
} > "$OUT"

# Stop the app
adb shell am force-stop "$PACKAGE" > /dev/null || true

# Quick summary: extract any frame-time lines the bridge emits.
FRAMES=$(grep -E "frame_time|frame_us|bridge_latency" "$OUT" | wc -l)
echo "[+] Done. ${FRAMES} perf lines captured."
echo "    Log: $OUT"
if [ "$FRAMES" -gt 0 ]; then
  echo "    First 5:"; grep -E "frame_time|frame_us|bridge_latency" "$OUT" | head -5
fi
