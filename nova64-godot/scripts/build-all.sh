#!/usr/bin/env bash
# build-all.sh — build the Nova64 GDExtension for one or more targets.
#
# Usage:
#   ./scripts/build-all.sh                     # default: linux only
#   ./scripts/build-all.sh linux               # all linux targets
#   ./scripts/build-all.sh linux windows       # multiple platforms
#   ./scripts/build-all.sh android             # arm64 .so (needs NDK r23c)
#   ./scripts/build-all.sh ios                 # arm64 .dylib (macOS host only)
#   ./scripts/build-all.sh all                 # linux + windows + macos
#   ./scripts/build-all.sh matrix              # everything available on this host
#
# Run from the nova64-godot/ directory.
#
# Android prerequisites: bash scripts/install-android-toolchain.sh
# iOS prerequisites:     macOS host + Xcode (see bootstrap-ios-toolchain.sh)
#                        — Windows/WSL is not a supported iOS host.

set -euo pipefail

cd "$(dirname "$0")/../gdextension"

if [ ! -d "third_party/godot-cpp" ]; then
  echo "godot-cpp submodule not initialized. Run:"
  echo "  git submodule update --init --recursive"
  exit 1
fi

# Auto-export Android env if the toolchain is installed but env is unset
if [ -z "${ANDROID_HOME:-}" ] && [ -x "${HOME}/Android/Sdk/cmdline-tools/latest/bin/sdkmanager" ]; then
  export ANDROID_HOME="${HOME}/Android/Sdk"
  export ANDROID_NDK_ROOT="${ANDROID_HOME}/ndk/23.2.8568313"
fi

PLATFORMS=("$@")
if [ ${#PLATFORMS[@]} -eq 0 ]; then
  PLATFORMS=("linux")
fi

if [ "${PLATFORMS[0]}" = "all" ]; then
  PLATFORMS=("linux" "windows" "macos")
fi

if [ "${PLATFORMS[0]}" = "matrix" ]; then
  PLATFORMS=("linux" "windows")
  if [ -n "${ANDROID_HOME:-}" ] && [ -d "${ANDROID_NDK_ROOT:-}" ]; then
    PLATFORMS+=("android")
  fi
  if [ "$(uname)" = "Darwin" ]; then
    PLATFORMS+=("macos" "ios")
  fi
fi

TARGETS=("template_debug" "template_release")

build_one() {
  local platform=$1 target=$2
  local extra=()
  case "$platform" in
    windows)
      # On Linux/WSL, prefer MinGW cross-compile (matches CI)
      if [ "$(uname)" != "Darwin" ] && [[ "$(uname)" != MINGW* ]]; then
        extra+=("use_mingw=yes")
      fi
      ;;
    ios)
      extra+=("arch=arm64")
      ;;
    android)
      # Android builds both arm64 (devices) and x86_64 (emulator) below
      extra+=("arch=arm64")
      ;;
  esac
  echo ">>> scons platform=$platform target=$target ${extra[*]}"
  scons platform="$platform" target="$target" "${extra[@]}" \
    -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu)"
  if [ "$platform" = "android" ]; then
    echo ">>> scons platform=android target=$target arch=x86_64 (emulator)"
    scons platform=android target="$target" arch=x86_64 \
      -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu)"
  fi
}

for platform in "${PLATFORMS[@]}"; do
  if [ "$platform" = "ios" ] && [ "$(uname)" != "Darwin" ]; then
    echo "!!! Skipping ios: not running on macOS (use scripts/bootstrap-ios-toolchain.sh on a Mac)" >&2
    continue
  fi
  if [ "$platform" = "macos" ] && [ "$(uname)" != "Darwin" ]; then
    echo "!!! Skipping macos: not running on macOS" >&2
    continue
  fi
  if [ "$platform" = "android" ] && { [ -z "${ANDROID_HOME:-}" ] || [ ! -d "${ANDROID_NDK_ROOT:-}" ]; }; then
    echo "!!! Skipping android: ANDROID_HOME / ANDROID_NDK_ROOT unset (run scripts/install-android-toolchain.sh)" >&2
    continue
  fi
  for target in "${TARGETS[@]}"; do
    build_one "$platform" "$target"
  done
done

echo
echo "Done. Artifacts in godot_project/bin/:"
ls -la ../godot_project/bin/ 2>/dev/null | grep -E '\.(so|dll|dylib|framework)' || true
