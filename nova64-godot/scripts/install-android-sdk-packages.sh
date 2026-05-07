#!/usr/bin/env bash
# Accept Android SDK licenses + install platform-tools / android-34 / build-tools 34.0.0
# for Godot APK exports. Idempotent.
set -e
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

if [ ! -d "$ANDROID_HOME/cmdline-tools/latest" ]; then
  echo "[!] cmdline-tools missing — run install-android-toolchain.sh first" >&2
  exit 1
fi

echo "[+] Accepting SDK licenses..."
yes | sdkmanager --licenses > /tmp/sdk-licenses.log 2>&1 || true
tail -1 /tmp/sdk-licenses.log

echo "[+] Installing platform-tools, platforms;android-34, build-tools;34.0.0..."
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" 2>&1 | tail -8

echo "[+] Done."
