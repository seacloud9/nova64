#!/usr/bin/env bash
# build-retroarch-docker.sh — build the Linux x86_64 and Windows x86_64
# RetroArch cores from any host (macOS included) in a pinned Ubuntu container.
#
#   bash scripts/build-retroarch-docker.sh            # linux + windows
#   bash scripts/build-retroarch-docker.sh windows    # one of them
#
# Outputs retroarch/nova64_libretro.so and retroarch/nova64_libretro.dll, the
# same files a native Linux/WSL `make` produces. Separate OBJDIRs keep these
# objects apart from host builds. Windows links zlib statically
# (libz-mingw-w64-dev), so the DLL has no extra runtime dependencies.
set -euo pipefail

IMAGE="${RETROARCH_BUILD_IMAGE:-ubuntu:22.04}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WANT="${*:-linux windows}"

if ! docker info >/dev/null 2>&1; then
  echo "✗ Docker is not running" >&2
  exit 1
fi

docker run --rm --platform linux/amd64 -v "$ROOT":/src -w /src/retroarch -e WANT="$WANT" "$IMAGE" \
  bash -euo pipefail -c '
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq --no-install-recommends make gcc libc6-dev zlib1g-dev \
      gcc-mingw-w64-x86-64 libz-mingw-w64-dev >/dev/null
    for w in $WANT; do
      case "$w" in
        linux)
          echo ">>> linux x86_64 core"
          make OBJDIR=build-docker-linux clean
          make OBJDIR=build-docker-linux -j"$(nproc)" ;;
        windows)
          echo ">>> windows x86_64 core (mingw)"
          make platform=win-cross OBJDIR=build-docker-win clean
          make platform=win-cross OBJDIR=build-docker-win -j"$(nproc)" ;;
        *) echo "unknown target $w" >&2; exit 2 ;;
      esac
    done
    chown '"$(id -u):$(id -g)"' nova64_libretro.so nova64_libretro.dll 2>/dev/null || true
  '
for w in $WANT; do
  f="$ROOT/retroarch/nova64_libretro.$([ "$w" = linux ] && echo so || echo dll)"
  [ -f "$f" ] || { echo "✗ missing $f" >&2; exit 1; }
  ls -la "$f"
done
