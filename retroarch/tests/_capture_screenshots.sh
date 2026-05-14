#!/usr/bin/env bash
cd /mnt/c/Users/brend/exp/nova64
mkdir -p retroarch/screenshots

declare -A carts=(
  [62]="62-set-position-rotation"
  [63]="63-texture-lifecycle"
  [64]="64-directional-light"
  [65]="65-backend-caps"
  [66]="66-draw3d-callback"
  [67]="67-storage"
)

for n in 62 63 64 65 66 67; do
  cart="${carts[$n]}"
  pkg="retroarch/build/conformance-packages/${cart}.nova"
  out="retroarch/screenshots/${cart}.ppm"
  retroarch/build/harness retroarch/nova64_libretro.so "$pkg" --capture "$out" 2>/dev/null
  echo "captured $cart"
done
