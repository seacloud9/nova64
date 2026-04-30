#!/usr/bin/env bash
# install-android-emulator.sh — installs the Android emulator + a default AVD
# for running the Nova64 Godot host without a physical device.
#
# Strategy:
#   - Use the WSL-side Android SDK we already installed (~/Android/Sdk).
#   - Install: emulator, system-images;android-34;google_apis;arm64-v8a
#       (arm64 image matches our arm64 .so artifact)
#   - Create an AVD: nova64-test (Pixel 5 profile, 4 GB RAM, 4 GB internal,
#       arm64-v8a image).
#
# Note on running: the emulator binary itself launches X11/Vulkan, which is
# slow under WSLg. For best perf, install Android Studio's emulator on the
# Windows host and point ANDROID_AVD_HOME at a shared path. That's outside
# this script's scope; the AVD created here is launchable with:
#
#   ~/Android/Sdk/emulator/emulator -avd nova64-test -no-audio -gpu swiftshader_indirect
#
# Adb commands (install APK, pull logcat) work transparently against an
# emulator running on either host.
set -euo pipefail

export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

if [ ! -x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
  echo "[!] cmdline-tools missing. Run scripts/install-android-toolchain.sh first" >&2
  exit 1
fi

echo "[+] Installing emulator + arm64-v8a system image (android-34)..."
yes | sdkmanager --licenses > /dev/null 2>&1 || true
sdkmanager "emulator" "system-images;android-34;google_apis;arm64-v8a" 2>&1 | tail -5

AVD_NAME="nova64-test"
if avdmanager list avd | grep -q "Name: ${AVD_NAME}"; then
  echo "[=] AVD ${AVD_NAME} already exists"
else
  echo "[+] Creating AVD ${AVD_NAME}..."
  echo "no" | avdmanager create avd \
    --name "${AVD_NAME}" \
    --package "system-images;android-34;google_apis;arm64-v8a" \
    --device "pixel_5" \
    --force
fi

cat <<EOF

Done.
  AVD:        ${AVD_NAME}
  Image:      system-images;android-34;google_apis;arm64-v8a
  Emulator:   ${ANDROID_HOME}/emulator/emulator

To launch:
  ${ANDROID_HOME}/emulator/emulator -avd ${AVD_NAME} -no-audio -gpu swiftshader_indirect &

Then:
  adb wait-for-device
  bash scripts/measure-android.sh 04-instances
EOF
