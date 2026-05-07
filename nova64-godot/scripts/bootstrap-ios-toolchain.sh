#!/usr/bin/env bash
# bootstrap-ios-toolchain.sh — Documented setup for building the Nova64
# GDExtension iOS framework. **Must be run on a macOS host** with Xcode
# installed; cross-compiling iOS frameworks from Linux/Windows is not
# supported by godot-cpp 4.3.
#
# This script is the canonical bootstrap reference. CI should mirror these
# steps on a `macos-latest` runner.
#
# Prerequisites on the host:
#   - macOS 13 or newer
#   - Xcode 15+ (full install, not just Command Line Tools)
#   - SCons (`brew install scons`)
#   - Python 3.11+ (system Python is fine)
#   - This repo cloned with submodules: `git submodule update --init --recursive`
#
# Output artifacts (consumed by godot_project/nova64.gdextension):
#   godot_project/bin/libnova64.ios.template_debug.arm64.dylib
#   godot_project/bin/libnova64.ios.template_release.arm64.dylib
set -euo pipefail

if [ "$(uname)" != "Darwin" ]; then
  cat >&2 <<EOF
[!] This script must be run on macOS.

   iOS frameworks cannot be cross-compiled from Linux or Windows because
   godot-cpp 4.3 invokes Xcode-only tools (clang from the iPhoneOS SDK,
   lipo, codesign).

   On a macOS host:
     1. Install Xcode (full app, accept the license: sudo xcodebuild -license)
     2. brew install scons
     3. cd nova64-godot/gdextension
     4. scons platform=ios arch=arm64 target=template_debug
     5. scons platform=ios arch=arm64 target=template_release

   Or run via the build matrix:
     bash scripts/build-all.sh ios
EOF
  exit 1
fi

# Verify Xcode + scons + iOS SDK are present
xcode-select -p > /dev/null 2>&1 || {
  echo "[!] Xcode command line tools not found. Run: xcode-select --install" >&2
  exit 1
}
command -v scons > /dev/null || {
  echo "[!] scons not found. Run: brew install scons" >&2
  exit 1
}
xcrun --sdk iphoneos --show-sdk-path > /dev/null 2>&1 || {
  echo "[!] iPhoneOS SDK not found. Install full Xcode from the App Store." >&2
  exit 1
}

cd "$(dirname "$0")/../gdextension"

if [ ! -d "third_party/godot-cpp/include" ]; then
  echo "[!] godot-cpp submodule missing. Run from repo root:" >&2
  echo "    git submodule update --init --recursive" >&2
  exit 1
fi

echo "[+] Building iOS arm64 (debug)..."
scons platform=ios arch=arm64 target=template_debug -j"$(sysctl -n hw.ncpu)"

echo "[+] Building iOS arm64 (release)..."
scons platform=ios arch=arm64 target=template_release -j"$(sysctl -n hw.ncpu)"

echo "[+] Done. Artifacts:"
ls -la ../godot_project/bin/libnova64.ios.* 2>/dev/null || true
