#!/usr/bin/env bash
# build-linux-docker.sh — build the Linux x86_64 GDExtension from any host
# (macOS, Windows) inside a pinned Ubuntu container. Output lands in
# godot_project/bin/ exactly like build-all.sh linux.
#
#   bash scripts/build-linux-docker.sh            # debug + release
#   TARGETS="template_release" bash scripts/build-linux-docker.sh
#
# Needs Docker. On Apple Silicon the amd64 image runs under emulation (slower).
set -euo pipefail

IMAGE="${LINUX_BUILD_IMAGE:-ubuntu:22.04}"
TARGETS="${TARGETS:-template_debug template_release}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! docker info >/dev/null 2>&1; then
  echo "✗ Docker is not running" >&2
  exit 1
fi
if [ ! -d "$ROOT/gdextension/third_party/godot-cpp/src" ]; then
  echo "✗ godot-cpp submodule missing: git submodule update --init --recursive" >&2
  exit 1
fi

# Separate scons cache/objects dir so host (macOS) .o files never mix in.
docker run --rm --platform linux/amd64 \
  -v "$ROOT":/src -w /src/gdextension \
  -e TARGETS="$TARGETS" \
  "$IMAGE" bash -euo pipefail -c '
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq --no-install-recommends g++ python3 python3-pip pkg-config >/dev/null
    pip3 install -q scons==4.8.1
    for t in $TARGETS; do
      echo ">>> scons platform=linux target=$t arch=x86_64"
      scons platform=linux target="$t" arch=x86_64 -j"$(nproc)"
    done
    chown -R '"$(id -u):$(id -g)"' /src/godot_project/bin
  '
ls -la "$ROOT/godot_project/bin/" | grep -E 'linux.*\.so' || { echo "✗ no linux .so produced" >&2; exit 1; }
