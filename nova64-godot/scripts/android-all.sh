#!/usr/bin/env bash
# android-all.sh — single-command CLI pipeline: build → export → boot → measure.
# Avoids opening Android Studio or the Godot editor entirely.
#
# Stages (each can be skipped via env flags):
#   1. SKIP_BUILD=1     — skip scons android arm64+x86_64
#   2. SKIP_EXPORT=1    — skip headless APK export
#   3. SKIP_BOOT=1      — skip booting the AVD (assume already running)
#   4. SKIP_MEASURE=1   — skip install + logcat capture
#
# Cart selection:
#   CART=04-instances bash scripts/android-all.sh
#
# ABI:
#   ABI=x86_64 bash scripts/android-all.sh   (default; matches emulator)
#   ABI=arm64  bash scripts/android-all.sh   (physical device or arm64 AVD)

set -euo pipefail

cd "$(dirname "$0")/.."

CART="${CART:-04-instances}"
ABI="${ABI:-x86_64}"

case "$ABI" in
  arm64)  PRESET_ARG="arm64";  APK="bin/export/nova64-host.apk" ;;
  x86_64) PRESET_ARG="x86_64"; APK="bin/export/nova64-host-x86_64.apk" ;;
  *) echo "[!] ABI must be arm64 or x86_64" >&2; exit 2 ;;
esac

step() { echo; echo "================================================"; echo "==  $*"; echo "================================================"; }

if [ -z "${SKIP_BUILD:-}" ]; then
  step "1/4 build android $ABI .so artifacts"
  bash scripts/build-all.sh android
fi

if [ -z "${SKIP_EXPORT:-}" ]; then
  step "2/4 headless export ($ABI)"
  bash scripts/export-android.sh "$PRESET_ARG"
fi

if [ -z "${SKIP_BOOT:-}" ]; then
  step "3/4 boot emulator (skipped if already running)"
  bash scripts/boot-android-emulator.sh
fi

if [ -z "${SKIP_MEASURE:-}" ]; then
  step "4/4 install + measure (cart=${CART}, apk=${APK})"
  # measure-android.sh expects bin/export/nova64-host.apk; copy x86_64 over it.
  if [ "$APK" != "bin/export/nova64-host.apk" ]; then
    cp -f "$APK" "bin/export/nova64-host.apk"
  fi
  bash scripts/measure-android.sh "$CART"
fi

echo
echo "[+] android-all done."
ls -la bench | tail -5
