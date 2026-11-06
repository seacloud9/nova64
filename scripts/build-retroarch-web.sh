#!/usr/bin/env bash
# Rebuild the RetroArch web player with the Nova64 core and install it into
# public/retroarch-web/ (served at /retroarch-web/, used by the web OS app).
#
#   pnpm build:retroarch-web
#
# Needs Docker. Pins Emscripten and RetroArch versions so output is stable.
set -euo pipefail

EMSDK_IMAGE="${EMSDK_IMAGE:-emscripten/emsdk:3.1.74}"
RETROARCH_TAG="${RETROARCH_TAG:-v1.21.0}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${RETROARCH_WEB_WORK:-$ROOT/retroarch/build-web}"
OUT="$ROOT/public/retroarch-web"

echo "→ Building Nova64 core (WASM static lib)"
docker run --rm -v "$ROOT":/src -w /src/retroarch "$EMSDK_IMAGE" \
  emmake make platform=emscripten OBJDIR=build-emscripten -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu)"

if [ ! -d "$WORK/RetroArch/.git" ]; then
  echo "→ Fetching RetroArch $RETROARCH_TAG"
  mkdir -p "$WORK"
  git clone -q --depth 1 --branch "$RETROARCH_TAG" https://github.com/libretro/RetroArch.git "$WORK/RetroArch"
fi

echo "→ Linking RetroArch web player"
cp "$ROOT/retroarch/nova64_libretro_emscripten.a" "$WORK/RetroArch/libretro_emscripten.a"
rm -f "$WORK/RetroArch/nova64_libretro.js" "$WORK/RetroArch/nova64_libretro.wasm"
docker run --rm -v "$WORK/RetroArch":/ra -w /ra "$EMSDK_IMAGE" \
  emmake make -f Makefile.emscripten LIBRETRO=nova64 HAVE_OPENGLES3=1 -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu)"

mkdir -p "$OUT"
cp "$WORK/RetroArch/nova64_libretro.js" "$WORK/RetroArch/nova64_libretro.wasm" "$OUT/"
ls -lh "$OUT"/nova64_libretro.*
echo "✓ Installed to public/retroarch-web/ — open /retroarch-web/?cart=/examples/hello-world/code.js"
