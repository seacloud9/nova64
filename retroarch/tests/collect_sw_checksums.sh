#!/usr/bin/env bash
# Collect software renderer checksums for all createCube/createSphere carts.
set -uo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

CORE="retroarch/nova64_libretro.so"
HARNESS="retroarch/build/harness"

CARTS=(
  06-cube
  07-cube-plane
  08-sphere
  09-overlay-scene
  10-lighting
  14-plane-dimensions
  15-primitive-args
  16-transforms
  17-light-fog
  18-mesh-helpers
  19-texture
  20-post
  21-post-effects
  22-material
  47-camera-ortho
  48-sky-color
  49-mesh-material
  50-get3d-stats
  51-clear-scene
  52-camera-getters
  53-mesh-opacity
  54-emissive
  55-shadow-flags
  56-point-lights
  57-destroy-mesh
  58-mesh-color
  59-move-rotate
  60-fog
  61-camera-lookat
  62-set-position-rotation
  63-texture-lifecycle
  64-directional-light
  65-backend-caps
  66-draw3d-callback
  67-storage
  68-sky-gradient
  82-scene-hierarchy
  85-raycast
  100-pbr-material
  101-uv-transform
)

echo "# Software renderer checksums — $(date)"
for cart in "${CARTS[@]}"; do
  js="retroarch/conformance/${cart}.js"
  [[ -f "${js}" ]] || continue
  result=$(timeout 15 "${HARNESS}" "${CORE}" "${js}" 2>/dev/null) || true
  checksum=$(echo "${result}" | grep -oE ' checksum=[0-9a-f]+' | head -1 | cut -d= -f2)
  ok=$(echo "${result}" | grep -oE 'ok=[0-9]+' | head -1 | cut -d= -f2)
  printf "%-35s ok=%-2s checksum=%s\n" "${cart}" "${ok}" "${checksum}"
done
