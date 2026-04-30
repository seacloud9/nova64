#!/usr/bin/env bash
# build-all.sh — build the Nova64 GDExtension for one or more targets.
#
# Usage:
#   ./scripts/build-all.sh                     # build linux template_debug
#   ./scripts/build-all.sh linux               # all linux targets
#   ./scripts/build-all.sh linux windows       # multiple platforms
#   ./scripts/build-all.sh all                 # everything (slow)
#
# Run from the nova64-godot/ directory.

set -euo pipefail

cd "$(dirname "$0")/../gdextension"

if [ ! -d "third_party/godot-cpp" ]; then
  echo "godot-cpp submodule not initialized. Run:"
  echo "  git submodule update --init --recursive"
  exit 1
fi

PLATFORMS=("$@")
if [ ${#PLATFORMS[@]} -eq 0 ]; then
  PLATFORMS=("linux")
fi

if [ "${PLATFORMS[0]}" = "all" ]; then
  PLATFORMS=("linux" "windows" "macos")
fi

TARGETS=("template_debug" "template_release")

for platform in "${PLATFORMS[@]}"; do
  for target in "${TARGETS[@]}"; do
    echo ">>> scons platform=$platform target=$target"
    scons platform="$platform" target="$target"
  done
done

echo "Done. Artifacts in godot_project/bin/"
