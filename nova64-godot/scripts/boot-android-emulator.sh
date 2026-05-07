#!/usr/bin/env bash
# boot-android-emulator.sh — start the AVD created by install-android-emulator.sh
# headlessly under WSL/Linux and block until the system is fully booted.
#
# Usage:
#   bash scripts/boot-android-emulator.sh                # boots nova64-test
#   AVD=Super_Tablet bash scripts/boot-android-emulator.sh
#
# Notes:
#   - Uses -no-window -no-audio -gpu swiftshader_indirect so it runs without an
#     X server (works under WSLg or pure CLI).
#   - If an emulator is already booted, exits 0 immediately.
#   - Logs go to nova64-godot/bench/emulator-<ts>.log.

set -euo pipefail

cd "$(dirname "$0")/.."

AVD="${AVD:-nova64-test}"
ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
EMULATOR="$ANDROID_HOME/emulator/emulator"
ADB="$ANDROID_HOME/platform-tools/adb"

if [ ! -x "$EMULATOR" ]; then
  echo "[!] emulator not found at $EMULATOR" >&2
  echo "    Run scripts/install-android-emulator.sh first." >&2
  exit 1
fi
if [ ! -x "$ADB" ]; then
  ADB="$(command -v adb || true)"
fi
if [ -z "$ADB" ]; then
  echo "[!] adb not found. Install platform-tools." >&2
  exit 1
fi

# Already booted?
BOOTED="$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
if [ "$BOOTED" = "1" ]; then
  echo "[=] Emulator already booted; skipping launch."
  "$ADB" devices
  exit 0
fi

mkdir -p bench
TS="$(date +%Y%m%d-%H%M%S)"
LOG="bench/emulator-${TS}.log"

echo "[+] Booting AVD ${AVD} (logs: ${LOG})..."
nohup "$EMULATOR" -avd "$AVD" \
  -no-window -no-audio -no-snapshot-save \
  -gpu swiftshader_indirect \
  >"$LOG" 2>&1 &

EMU_PID=$!
echo "    pid=${EMU_PID}"

echo "[+] Waiting for device..."
"$ADB" wait-for-device

echo "[+] Waiting for boot_completed (this can take 1–3 min in software emulation)..."
for i in $(seq 1 180); do
  BOOTED="$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
  if [ "$BOOTED" = "1" ]; then
    echo "[+] Boot complete after ${i}s"
    "$ADB" shell input keyevent 82 > /dev/null 2>&1 || true   # unlock screen
    "$ADB" devices
    exit 0
  fi
  sleep 1
done

echo "[!] Timed out waiting for boot. See $LOG" >&2
exit 1
