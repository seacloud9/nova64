#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

CORE="retroarch/nova64_libretro.so"
HARNESS="retroarch/build/harness"
PACKAGE_DIR="retroarch/build/conformance-packages"
SAVE_DIR="retroarch/build/conformance-saves"
SCREENSHOT_DIR="screenshots/retroarch"
RECENT_COUNT=0
RANGE_FROM=0
RANGE_TO=999
SKIP_BUILD=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --recent)
      if [[ $# -lt 2 ]]; then
        echo "--recent requires a count" >&2
        exit 2
      fi
      RECENT_COUNT="$2"
      shift 2
      ;;
    --from)
      if [[ $# -lt 2 ]]; then echo "--from requires a number" >&2; exit 2; fi
      RANGE_FROM="$2"; shift 2 ;;
    --to)
      if [[ $# -lt 2 ]]; then echo "--to requires a number" >&2; exit 2; fi
      RANGE_TO="$2"; shift 2 ;;
    --skip-build)
      SKIP_BUILD=1; shift ;;
    *)
      echo "unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

LATEST_CASE="$(find retroarch/conformance -maxdepth 1 -type f -name '[0-9]*-*.js' \
  | sed -E 's|.*/([0-9]+)-.*|\1|' | sort -n | tail -1)"
LATEST_CASE="${LATEST_CASE:-0}"
if [[ "${RECENT_COUNT}" -gt 0 ]]; then
  RANGE_FROM=$((10#${LATEST_CASE} - RECENT_COUNT + 1))
  if [[ "${RANGE_FROM}" -lt 0 ]]; then RANGE_FROM=0; fi
  RANGE_TO=999
fi

if [[ "${SKIP_BUILD}" -eq 0 ]]; then
  make -C retroarch clean all
  cc -Iretroarch -o "${HARNESS}" retroarch/tests/harness.c -ldl
fi

mkdir -p "${PACKAGE_DIR}"
# Only wipe the save dir when starting from the beginning so batched runs
# preserve storage state written by earlier-numbered carts.
if [[ "${RANGE_FROM}" -eq 0 ]]; then
  rm -rf "${SAVE_DIR}"
fi
mkdir -p "${SAVE_DIR}"
mkdir -p "${SCREENSHOT_DIR}"
python3 - <<'PY'
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

package_dir = Path("retroarch/build/conformance-packages")
package_dir.mkdir(parents=True, exist_ok=True)

with ZipFile(package_dir / "cube-fallback.nova", "w", ZIP_DEFLATED) as package:
    package.write("retroarch/conformance/06-cube.js", "code.js")
    package.writestr("manifest.json", '{"name":"cube-fallback"}\n')

with ZipFile(package_dir / "cube-manifest.nova", "w", ZIP_DEFLATED) as package:
    package.write("retroarch/conformance/06-cube.js", "src/main.js")
    package.writestr("manifest.json", '{"name":"cube-manifest","main":"src/main.js"}\n')

with ZipFile(package_dir / "asset-manifest.nova", "w", ZIP_DEFLATED) as package:
    package.write("retroarch/conformance/06-cube.js", "src/main.js")
    package.writestr("assets/palette.bin", b"nova64\n")
    package.writestr("textures/checker.rgba", b"rgba\n")
    package.writestr(
        "manifest.json",
        '{"name":"asset-manifest","main":"src/main.js","assets":["assets/palette.bin","textures/checker.rgba"]}\n',
    )

with ZipFile(package_dir / "asset-runtime.nova", "w", ZIP_DEFLATED) as package:
    package.write("retroarch/conformance/13-assets.js", "src/main.js")
    package.writestr("assets/message.txt", "hello assets\n")
    package.writestr("data/config.json", '{"answer":64,"name":"nova"}\n')
    package.writestr("bin/blob.bin", bytes([1, 2, 3, 4]))
    package.writestr(
        "manifest.json",
        '{"name":"asset-runtime","main":"src/main.js","assets":["assets/message.txt","data/config.json","bin/blob.bin"]}\n',
    )

with ZipFile(package_dir / "multimodule.nova", "w", ZIP_DEFLATED) as package:
    package.write("retroarch/conformance/37-multimodule.js", "src/main.js")
    package.writestr("src/lib/value.js", "export default 37;\n")
    package.writestr(
        "src/lib/module-helper.js",
        "export const label = 'multi-module';\n"
        "export function mixColor(v) { return rgba8(v, v * 5, v * 10, 255); }\n",
    )
    package.writestr(
        "manifest.json",
        '{"name":"multimodule","main":"src/main.js","assets":["src/lib/value.js","src/lib/module-helper.js"]}\n',
    )

with ZipFile(package_dir / "meta.nova", "w", ZIP_DEFLATED) as package:
    package.write("retroarch/conformance/39-meta.js", "src/main.js")
    package.writestr(
        "manifest.json",
        '{"name":"meta-cart","title":"Meta Cart","author":"Nova Team","version":"1.2.3","main":"src/main.js"}\n',
    )

# 4x4 RGBA PNG sprite (red TL, blue BR, grey elsewhere) for PNG decode conformance
import zlib as _zlib
def _make_4x4_png():
    import struct as _s
    raw = bytearray()
    for row in range(4):
        raw.append(0)
        for col in range(4):
            if row < 2 and col < 2:   raw += bytes([255, 60, 60, 255])
            elif row >= 2 and col >= 2: raw += bytes([60, 100, 255, 255])
            else:                      raw += bytes([200, 200, 200, 255])
    comp = _zlib.compress(bytes(raw))
    def _chunk(tag, data):
        c = _s.pack('>I', len(data)) + tag + data
        return c + _s.pack('>I', _zlib.crc32(tag + data) & 0xffffffff)
    p  = b'\x89PNG\r\n\x1a\n'
    p += _chunk(b'IHDR', _s.pack('>IIBBBBB', 4, 4, 8, 6, 0, 0, 0))
    p += _chunk(b'IDAT', comp)
    p += _chunk(b'IEND', b'')
    return p
with ZipFile(package_dir / "png-sprite.nova", "w", ZIP_DEFLATED) as package:
    package.write("retroarch/conformance/81-png-sprite.js", "src/main.js")
    package.writestr("sprites/dot.png", _make_4x4_png())
    package.writestr(
        "manifest.json",
        '{"name":"png-sprite","main":"src/main.js","assets":["sprites/dot.png"]}\n',
    )

with ZipFile(package_dir / "asset-quota.nova", "w", ZIP_DEFLATED) as package:
    package.write("retroarch/conformance/41-asset-quota.js", "src/main.js")
    package.writestr("assets/small.txt", "small")
    package.writestr("assets/large.txt", "this is too large")
    package.writestr(
        "manifest.json",
        '{"name":"asset-quota","main":"src/main.js","assets":["assets/small.txt","assets/large.txt"]}\n',
    )

# 440Hz sine wave, 0.25s, int16 LE mono at 44100Hz
import math, struct
beep_frames = int(44100 * 0.25)
beep = bytearray(beep_frames * 2)
for i in range(beep_frames):
    s = int(math.sin(2 * math.pi * 440 * i / 44100) * 16383)
    struct.pack_into('<h', beep, i * 2, s)
with ZipFile(package_dir / "play-sound.nova", "w", ZIP_DEFLATED) as package:
    package.write("retroarch/conformance/28-play-sound.js", "src/main.js")
    package.writestr("sounds/beep.pcm", bytes(beep))
    package.writestr(
        "manifest.json",
        '{"name":"play-sound","main":"src/main.js","assets":["sounds/beep.pcm"]}\n',
    )

# 4x4 RGBA sprite: bright red 2x2 top-left, blue 2x2 bottom-right
dot = bytearray(4 * 4 * 4)
for row in range(4):
    for col in range(4):
        i = (row * 4 + col) * 4
        if row < 2 and col < 2:
            dot[i:i+4] = [255, 60, 60, 255]   # red
        elif row >= 2 and col >= 2:
            dot[i:i+4] = [60, 100, 255, 255]  # blue
        else:
            dot[i:i+4] = [200, 200, 200, 255] # grey
with ZipFile(package_dir / "sprite.nova", "w", ZIP_DEFLATED) as package:
    package.write("retroarch/conformance/27-sprite.js", "src/main.js")
    package.writestr("sprites/dot.rgba", bytes(dot))
    package.writestr(
        "manifest.json",
        '{"name":"sprite","main":"src/main.js","assets":["sprites/dot.rgba"]}\n',
    )

# z-sort sprites: solid-red and solid-blue 4x4 RGBA for depth ordering test
red_spr = bytearray(4 * 4 * 4)
blue_spr = bytearray(4 * 4 * 4)
for _i in range(4 * 4):
    red_spr[_i*4:_i*4+4] = [220, 60, 60, 255]
    blue_spr[_i*4:_i*4+4] = [60, 100, 220, 255]
with ZipFile(package_dir / "z-sort-sprites.nova", "w", ZIP_DEFLATED) as package:
    package.write("retroarch/conformance/105-z-sort-sprites.js", "src/main.js")
    package.writestr("sprites/red.rgba", bytes(red_spr))
    package.writestr("sprites/blue.rgba", bytes(blue_spr))
    package.writestr(
        "manifest.json",
        '{"name":"z-sort-sprites","main":"src/main.js","assets":["sprites/red.rgba","sprites/blue.rgba"]}\n',
    )

# 4-frame 16x4 RGBA sprite sheet with atlas metadata for named regions
sheet = bytearray(16 * 4 * 4)
frame_colors = [(240, 70, 70, 255), (70, 220, 90, 255), (80, 130, 250, 255), (245, 220, 70, 255)]
for frame, (r, g, b, a) in enumerate(frame_colors):
    for py in range(4):
        for px in range(4):
            i = (py * 16 + frame * 4 + px) * 4
            sheet[i:i+4] = [r, g, b, a]
with ZipFile(package_dir / "spritesheet.nova", "w", ZIP_DEFLATED) as package:
    package.write("retroarch/conformance/32-spritesheet.js", "src/main.js")
    package.writestr("sprites/sheet.rgba", bytes(sheet))
    package.writestr(
        "sprites/sheet.json",
        '{"imageWidth":16,"imageHeight":4,"frames":{"coin":{"x":12,"y":0,"w":4,"h":4}}}\n',
    )
    package.writestr(
        "manifest.json",
        '{"name":"spritesheet","main":"src/main.js","assets":["sprites/sheet.rgba","sprites/sheet.json"]}\n',
    )

# 4-tile horizontal strip for tilemap conformance: each tile 8x8, strip 32x8 RGBA
tw, th = 8, 8
sheet = bytearray(32 * th * 4)
tile_colors = [(220,60,60,255),(60,220,60,255),(60,100,220,255),(220,220,60,255)]
for ti, (r,g,b,a) in enumerate(tile_colors):
    for py in range(th):
        for px in range(tw):
            i = (py * 32 + ti * tw + px) * 4
            sheet[i:i+4] = [r, g, b, a]
with ZipFile(package_dir / "tilemap.nova", "w", ZIP_DEFLATED) as package:
    package.write("retroarch/conformance/31-tilemap.js", "src/main.js")
    package.writestr("tiles/sheet.rgba", bytes(sheet))
    package.writestr(
        "manifest.json",
        '{"name":"tilemap","main":"src/main.js","assets":["tiles/sheet.rgba"]}\n',
    )
PY

# run_gles_case: like run_visual_case but uses --gles for hardware-rendered pixel checksums.
# Skipped silently when NOVA64_GLES_TESTS is unset.
run_gles_case() {
  local label="$1"
  local name="$2"
  local cart="$3"
  local checksum="$4"
  [[ -n "${NOVA64_GLES_TESTS:-}" ]] || return 0
  should_run_label "${label}" || return 0
  echo "== ${label} (gles)"
  "${HARNESS}" "${CORE}" "${cart}" --gles --expect "${checksum}"
}

run_case() {
  local label="$1"
  local cart="$2"
  local checksum="$3"
  should_run_label "${label}" || return 0
  echo "== ${label}"
  "${HARNESS}" "${CORE}" "${cart}" --expect "${checksum}"
}

should_run_label() {
  local label="$1"
  if [[ "${label}" =~ ^([0-9]+) ]]; then
    local n=$((10#${BASH_REMATCH[1]}))
    [[ "${n}" -ge "${RANGE_FROM}" && "${n}" -le "${RANGE_TO}" ]]
    return
  fi
  # Non-numeric labels (nova package cases) run only on full suite
  [[ "${RANGE_FROM}" -eq 0 && "${RANGE_TO}" -eq 999 ]]
}

run_command_log_case() {
  local label="$1"
  local cart="$2"
  local expected_sha="$3"
  local renderer="${4:-}"
  local log_path="retroarch/build/${label}.commands"
  should_run_label "${label}" || return 0
  echo "== ${label} command log"
  if [[ -n "${renderer}" ]]; then
    "${HARNESS}" "${CORE}" "${cart}" --renderer "${renderer}" --command-log "${log_path}" >/dev/null
  else
    "${HARNESS}" "${CORE}" "${cart}" --command-log "${log_path}" >/dev/null
  fi
  local actual_sha
  actual_sha="$(sha256sum "${log_path}" | awk '{print $1}')"
  if [[ "${actual_sha}" != "${expected_sha}" ]]; then
    echo "command log mismatch: expected=${expected_sha} actual=${actual_sha}" >&2
    exit 1
  fi
}

run_audio_case() {
  local label="$1"
  local cart="$2"
  local checksum="$3"
  local audio_checksum="$4"
  should_run_label "${label}" || return 0
  echo "== ${label}"
  "${HARNESS}" "${CORE}" "${cart}" --expect "${checksum}" --expect-audio "${audio_checksum}"
}

run_visual_case() {
  local label="$1"
  local name="$2"
  local cart="$3"
  local checksum="$4"
  local ppm="${SCREENSHOT_DIR}/${name}.ppm"
  local png="${SCREENSHOT_DIR}/${name}.png"
  should_run_label "${label}" || return 0
  echo "== ${label}"
  "${HARNESS}" "${CORE}" "${cart}" --expect "${checksum}" --capture "${ppm}"
  python3 retroarch/tests/ppm_to_png.py "${ppm}" "${png}"
  rm -f "${ppm}"
}

# run_pending_case: runs a cart without a locked checksum (for new cases not yet recorded).
# Prints the actual checksum to stdout so it can be recorded.
run_pending_case() {
  local label="$1"
  local cart="$2"
  should_run_label "${label}" || return 0
  echo "== ${label} (pending checksum)"
  local out
  out=$("${HARNESS}" "${CORE}" "${cart}" 2>/dev/null) && echo "${out}" || true
}

run_seed_visual_case() {
  local label="$1"
  local name="$2"
  local cart="$3"
  local seed="$4"
  local checksum="$5"
  local ppm="${SCREENSHOT_DIR}/${name}.ppm"
  local png="${SCREENSHOT_DIR}/${name}.png"
  should_run_label "${label}" || return 0
  echo "== ${label}"
  "${HARNESS}" "${CORE}" "${cart}" --seed "${seed}" --expect "${checksum}" --capture "${ppm}"
  python3 retroarch/tests/ppm_to_png.py "${ppm}" "${png}"
  rm -f "${ppm}"
}

run_key_case() {
  local label="$1"
  local cart="$2"
  local key="$3"
  local checksum="$4"
  should_run_label "${label}" || return 0
  echo "== ${label}"
  "${HARNESS}" "${CORE}" "${cart}" --key "${key}" --expect "${checksum}"
}

run_case "00 boot" "retroarch/conformance/00-boot.js" "eed98c91acf88bfb"
run_case "01 framebuffer" "retroarch/conformance/01-framebuffer.js" "4817a6cf4ba81cca"
run_case "02 input" "retroarch/conformance/02-input.js" "872fd1e2547c6371"
run_case "03 errors" "retroarch/conformance/03-errors.js" "f443942d0c7ee363"
run_visual_case "06 cube" "06-cube" "retroarch/conformance/06-cube.js" "53584f0993f3ff6a"
run_visual_case "07 cube plane" "07-cube-plane" "retroarch/conformance/07-cube-plane.js" "5c9a36e84953c4c7"
run_visual_case "08 sphere" "08-sphere" "retroarch/conformance/08-sphere.js" "6ca539fe0bfe71f6"
run_visual_case "09 overlay scene" "09-overlay-scene" "retroarch/conformance/09-overlay-scene.js" "7122077fc2c8b827"
run_visual_case "10 lighting" "10-lighting" "retroarch/conformance/10-lighting.js" "e3b1a52e585e46f2"
NOVA64_SAVE_DIR="${SAVE_DIR}" run_case "11 storage" "retroarch/conformance/11-storage.js" "5dd5226aa3467474"
run_audio_case "12 audio" "retroarch/conformance/12-audio.js" "c0e5bade62febc47" "8c17792ab2c39e1b"
run_case "13 assets" "${PACKAGE_DIR}/asset-runtime.nova" "294b9bd45b20fb27"
run_case "14 plane dimensions" "retroarch/conformance/14-plane-dimensions.js" "d4e415a9e874e0af"
run_case "15 primitive args" "retroarch/conformance/15-primitive-args.js" "1294ed2cc0033448"
run_case "16 transforms" "retroarch/conformance/16-transforms.js" "271707fd988ce378"
run_visual_case "17 light fog" "17-light-fog" "retroarch/conformance/17-light-fog.js" "1c577cddb900b60b"
run_visual_case "18 mesh helpers" "18-mesh-helpers" "retroarch/conformance/18-mesh-helpers.js" "085d5a80c48ebdcd"
run_key_case "23 keyboard" "retroarch/conformance/23-keyboard.js" "space" "68b8c79b1632f0f1"
NOVA64_SAVE_DIR="${SAVE_DIR}" run_case "24 storage keys" "retroarch/conformance/24-storage-keys.js" "c46f8b1c496d64b7"

run_mouse_case() {
  local label="$1"
  local cart="$2"
  local checksum="$3"
  should_run_label "${label}" || return 0
  echo "== ${label}"
  "${HARNESS}" "${CORE}" "${cart}" --mouse-x 5 --mouse-y -3 --mouse-btn left --expect "${checksum}"
}

run_mouse_case "25 mouse" "retroarch/conformance/25-mouse.js" "c921e3d3b2b7c551"
run_visual_case "26 draw2d" "26-draw2d" "retroarch/conformance/26-draw2d.js" "5c927cbdf07816e8"
run_visual_case "27 sprite" "27-sprite" "${PACKAGE_DIR}/sprite.nova" "f6ca57a33e1c1b09"
run_audio_case "28 play sound" "${PACKAGE_DIR}/play-sound.nova" "c731ab8067d773d7" "5688d0029f712693"
run_visual_case "29 runtime utils" "29-runtime-utils" "retroarch/conformance/29-runtime-utils.js" "14ba8d2d1685cbbf"

run_showcase_case() {
  local label="$1"
  local name="$2"
  local cart="$3"
  local checksum="$4"
  local audio_checksum="$5"
  local ppm="${SCREENSHOT_DIR}/${name}.ppm"
  local png="${SCREENSHOT_DIR}/${name}.png"
  should_run_label "${label}" || return 0
  echo "== ${label}"
  NOVA64_SAVE_DIR="${SAVE_DIR}" "${HARNESS}" "${CORE}" "${cart}" \
    --key space --expect "${checksum}" --expect-audio "${audio_checksum}" --capture "${ppm}"
  python3 retroarch/tests/ppm_to_png.py "${ppm}" "${png}"
  rm -f "${ppm}"
}

run_showcase_case "30 showcase" "30-showcase" "retroarch/conformance/30-showcase.js" "8edfc5576738b943" "c888ebc87f460853"

run_analog_case() {
  local label="$1"
  local cart="$2"
  local checksum="$3"
  should_run_label "${label}" || return 0
  echo "== ${label}"
  "${HARNESS}" "${CORE}" "${cart}" \
    --analog-lx 16383 --analog-ly -8192 --trigger-l 16383 --expect "${checksum}"
}

run_visual_case "31 tilemap" "31-tilemap" "${PACKAGE_DIR}/tilemap.nova" "c26e61e20f059b0a"
run_visual_case "32 spritesheet" "32-spritesheet" "${PACKAGE_DIR}/spritesheet.nova" "293febc1b420fc27"
run_analog_case "34 analog"  "retroarch/conformance/34-analog.js" "a66365b2ba482b6f"
run_visual_case "35 rng" "35-rng" "retroarch/conformance/35-rng.js" "6702787d75707713"
run_visual_case "36 camera2d" "36-camera2d" "retroarch/conformance/36-camera2d.js" "0b89e24020dcb94c"
run_visual_case "37 multimodule" "37-multimodule" "${PACKAGE_DIR}/multimodule.nova" "adf7ef109e9afc87"
run_seed_visual_case "38 seeded rng" "38-seeded-rng" "retroarch/conformance/38-seeded-rng.js" "2026" "d593029700fd611b"
run_visual_case "39 meta" "39-meta" "${PACKAGE_DIR}/meta.nova" "5847ee6e3ae4d065"
run_visual_case "40 perf" "40-perf" "retroarch/conformance/40-perf.js" "4c3959dfa4b4a5ff"
NOVA64_ASSET_QUOTA=8 run_visual_case "41 asset quota" "41-asset-quota" "${PACKAGE_DIR}/asset-quota.nova" "e970ff560d9059da"

run_touch_case() {
  local label="$1"
  local name="$2"
  local cart="$3"
  local checksum="$4"
  local ppm="${SCREENSHOT_DIR}/${name}.ppm"
  local png="${SCREENSHOT_DIR}/${name}.png"
  should_run_label "${label}" || return 0
  echo "== ${label}"
  "${HARNESS}" "${CORE}" "${cart}" \
    --touch-x 123 --touch-y -45 --touch-count 1 --expect "${checksum}" --capture "${ppm}"
  python3 retroarch/tests/ppm_to_png.py "${ppm}" "${png}"
  rm -f "${ppm}"
}

run_touch_case "42 touch" "42-touch" "retroarch/conformance/42-touch.js" "cd7a6f3e2772273d"
NOVA64_SAVE_DIR="${SAVE_DIR}" run_visual_case "43 storage namespace" "43-storage-namespace" "retroarch/conformance/43-storage-namespace.js" "f12dbe70fe3883f3"
run_visual_case "19 texture" "19-texture" "retroarch/conformance/19-texture.js" "f4fd3acbca0331b4"
run_visual_case "20 post" "20-post" "retroarch/conformance/20-post.js" "75a3d27c9048e5b0"
run_visual_case "21 post-effects" "21-post-effects" "retroarch/conformance/21-post-effects.js" "3a18d91989ad8ded"
run_visual_case "22 material" "22-material" "retroarch/conformance/22-material.js" "7022fdfec2259d68"
run_command_log_case "09-overlay-scene" "retroarch/conformance/09-overlay-scene.js" "9c40b01de52403e6f30e306c61666914c495eafe9ac41dc47d082fd1e630a40a"
run_command_log_case "10-lighting" "retroarch/conformance/10-lighting.js" "6579c568daf8ca02ad7644e9432937e89ca882b826f9ec4e3d366a6e72a807f2"
run_command_log_case "14-plane-dimensions" "retroarch/conformance/14-plane-dimensions.js" "a3943c52d36328f3d845ca52e870381bdefe270af558933fc436fdfa0efd2534"
run_command_log_case "15-primitive-args" "retroarch/conformance/15-primitive-args.js" "6b1063aa6673ef1a6e9aabfbee07461aa2232cff24fa09104e222b50d7104c48"
run_command_log_case "16-transforms" "retroarch/conformance/16-transforms.js" "3176c098a2654dd71703e0d53881813b0117898c7481d57da24104abf9910e72"
run_command_log_case "17-light-fog" "retroarch/conformance/17-light-fog.js" "e34ed9cd7f588d7c9246be1de58490c9440fd8ab8aab8234323bd4cd895f86b1"
run_command_log_case "18-mesh-helpers" "retroarch/conformance/18-mesh-helpers.js" "c0b61b2e2870b6d7e0ad37bf4640ddbcbc8d1f95a1b57837918f9f9441ded02e"
run_command_log_case "22-material" "retroarch/conformance/22-material.js" "3bc02b7ae5434ea11fa96d56c8944bc12a378c7c740d0bb66be651eaad0ab637"
run_command_log_case "06-cube-vulkan12" "retroarch/conformance/06-cube.js" "14c44550ce71a9e7056df761672fa62e3fbf3eaea3a697df8a1ac589a9df3053" "vulkan12"
run_case "nova fallback" "${PACKAGE_DIR}/cube-fallback.nova" "53584f0993f3ff6a"
run_case "nova manifest main" "${PACKAGE_DIR}/cube-manifest.nova" "53584f0993f3ff6a"
run_command_log_case "nova-asset-manifest" "${PACKAGE_DIR}/asset-manifest.nova" "5d839b3ea526b233d21fdce08190848adc73a7ba8f4d88d5cc7d24105b3d6f34"

run_visual_case "33 music api" "33-music" "retroarch/conformance/33-music.js" "0b4d0a8036b90b97"
run_visual_case "44 capsule" "44-capsule" "retroarch/conformance/44-capsule.js" "65a1cc1395e81d96"
run_visual_case "45 cylinder" "45-cylinder" "retroarch/conformance/45-cylinder.js" "24497981dc726b1a"
run_visual_case "46 blend2d" "46-blend2d" "retroarch/conformance/46-blend2d.js" "db4581a1620a7c61"
run_visual_case "47 camera ortho" "47-camera-ortho" "retroarch/conformance/47-camera-ortho.js" "707562edf6c04a88"
run_visual_case "48 sky color" "48-sky-color" "retroarch/conformance/48-sky-color.js" "42fdcf4173dc1bc3"
run_visual_case "49 mesh material" "49-mesh-material" "retroarch/conformance/49-mesh-material.js" "56f7d32065b1b087"

run_visual_case "50 get3d stats"    "50-get3d-stats"    "retroarch/conformance/50-get3d-stats.js"    "7085099dfc42c2e0"
run_visual_case "51 clear scene"    "51-clear-scene"    "retroarch/conformance/51-clear-scene.js"    "4c40a1ad7725cd73"
run_visual_case "52 camera getters" "52-camera-getters" "retroarch/conformance/52-camera-getters.js" "005f6f294bb4133f"
run_visual_case "53 mesh opacity"   "53-mesh-opacity"   "retroarch/conformance/53-mesh-opacity.js"   "7f800ca58cc6a13f"
run_visual_case "54 emissive"       "54-emissive"       "retroarch/conformance/54-emissive.js"       "75eb6142a77ad4bb"
run_visual_case "55 shadow flags"   "55-shadow-flags"   "retroarch/conformance/55-shadow-flags.js"   "41c26053fa63f174"

run_visual_case "56 point lights"   "56-point-lights"   "retroarch/conformance/56-point-lights.js"   "9a39b1998d605da7"
run_visual_case "57 destroy mesh"   "57-destroy-mesh"   "retroarch/conformance/57-destroy-mesh.js"   "a7d492781eaf2eae"
run_visual_case "58 mesh color"     "58-mesh-color"     "retroarch/conformance/58-mesh-color.js"     "7a3cbef256ae5b13"
run_visual_case "59 move rotate"    "59-move-rotate"    "retroarch/conformance/59-move-rotate.js"    "ac543edb6aab57c2"
run_visual_case "60 fog"            "60-fog"            "retroarch/conformance/60-fog.js"            "d5825a6e0fa26fbe"
run_visual_case "61 camera lookat"  "61-camera-lookat"  "retroarch/conformance/61-camera-lookat.js"  "05ef5f6e550fbd3c"
run_visual_case "62 set position rotation" "62-set-position-rotation" "retroarch/conformance/62-set-position-rotation.js" "8687d3bdeb1576aa"
run_visual_case "63 texture lifecycle"     "63-texture-lifecycle"     "retroarch/conformance/63-texture-lifecycle.js"     "795e5fb6c19875c3"
run_visual_case "64 directional light"     "64-directional-light"     "retroarch/conformance/64-directional-light.js"     "eb0ca14c5fa7066d"
run_visual_case "65 backend caps"          "65-backend-caps"          "retroarch/conformance/65-backend-caps.js"          "5f56a45eae37733f"
run_visual_case "66 draw3d callback"       "66-draw3d-callback"       "retroarch/conformance/66-draw3d-callback.js"       "d333cb1f5bb0f42a"
run_visual_case "67 storage"               "67-storage"               "retroarch/conformance/67-storage.js"               "1b479d9f52800e80"
run_visual_case "68 sky gradient"          "68-sky-gradient"          "retroarch/conformance/68-sky-gradient.js"          "12998e317e45b2f9"
run_visual_case "69 palette swap"          "69-palette-swap"          "retroarch/conformance/69-palette-swap.js"          "d45401990c2663bf"
run_visual_case "70 draw shapes"           "70-draw-shapes"           "retroarch/conformance/70-draw-shapes.js"           "068b6a7212946fdc"
run_visual_case "71 camera2d transform"    "71-camera2d-transform"    "retroarch/conformance/71-camera2d-transform.js"    "0c2589763809fdc2"
run_visual_case "72 draw state"            "72-draw-state"            "retroarch/conformance/72-draw-state.js"            "1c1b8532b4324031"
run_visual_case "73 lines rounded"         "73-lines-rounded"         "retroarch/conformance/73-lines-rounded.js"         "34bc83f4db789544"
run_visual_case "74 screen effects"        "74-screen-effects"        "retroarch/conformance/74-screen-effects.js"        "6b9cf41e81ddc625"
run_visual_case "75 screen threshold"      "75-screen-threshold"      "retroarch/conformance/75-screen-threshold.js"      "104e12a896802584"
run_visual_case "76 text effects"          "76-text-effects"          "retroarch/conformance/76-text-effects.js"          "928ae301c7921006"
run_visual_case "77 draw state stack"      "77-draw-state-stack"      "retroarch/conformance/77-draw-state-stack.js"      "d3e98b012451f138"

run_visual_case "78 rumble"          "78-rumble"          "retroarch/conformance/78-rumble.js"          "25a42de0e518a7bb"
NOVA64_SAVE_DIR="${SAVE_DIR}" run_visual_case "79 storage version" "79-storage-version" "retroarch/conformance/79-storage-version.js" "afbb20120e528a32"
run_visual_case "80 physics"         "80-physics"         "retroarch/conformance/80-physics.js"         "e8b0edf6b4c2dc6b"
run_visual_case "81 png sprite"      "81-png-sprite"      "${PACKAGE_DIR}/png-sprite.nova"              "10a5ad47d0a0a973"
run_visual_case "82 scene hierarchy" "82-scene-hierarchy" "retroarch/conformance/82-scene-hierarchy.js" "63489e6061ea6404"
run_visual_case "83 audio channels"  "83-audio-channels"  "retroarch/conformance/83-audio-channels.js"  "eb6c1c11ccb03969"

NOVA64_SAVE_DIR="${SAVE_DIR}" run_visual_case "84 storage cart ids" "84-storage-cart-ids" "retroarch/conformance/84-storage-cart-ids.js" "0eb64e3b2eff029a"
run_visual_case "85 raycast"       "85-raycast"       "retroarch/conformance/85-raycast.js"       "74ba13fecf04c622"
run_visual_case "86 bitmap font"   "86-bitmap-font"   "retroarch/conformance/86-bitmap-font.js"   "2bc8c5bfa38e71dc"
run_visual_case "87 resolution"    "87-resolution"    "retroarch/conformance/87-resolution.js"    "814d1457723bb11b"

run_visual_case "88 echo api"        "88-echo"             "retroarch/conformance/88-echo.js"             "2a6874d8dc393448"
run_visual_case "89 positional audio" "89-positional-audio" "retroarch/conformance/89-positional-audio.js" "fbb4bb11cac086fa"
run_visual_case "90 developer mode"  "90-developer-mode"   "retroarch/conformance/90-developer-mode.js"   "4fc5aba23dda88d6"
run_visual_case "91 stereo pan"      "91-stereo-pan"       "retroarch/conformance/91-stereo-pan.js"       "14e58194e07a35b0"
run_visual_case "92 hot reload"      "92-hot-reload"       "retroarch/conformance/92-hot-reload.js"       "e1e85852c9e7a8b8"
run_visual_case "93 dev console"     "93-dev-console"      "retroarch/conformance/93-dev-console.js"      "499d83798b7a231a"
run_visual_case "94 create mesh"     "94-create-mesh"      "retroarch/conformance/94-create-mesh.js"      "79cbd3d3d92c1840"
run_visual_case "95 audio pitch"     "95-audio-pitch"      "retroarch/conformance/95-audio-pitch.js"      "37a3290c34b4ffd2"
run_visual_case "96 channel pitch"   "96-channel-pitch"    "retroarch/conformance/96-channel-pitch.js"    "844d5878fcded8e8"
run_visual_case "97 multiport input" "97-multiport-input"  "retroarch/conformance/97-multiport-input.js"  "986ec7433a2db70c"
run_visual_case "98 cheevos ram"     "98-cheevos-ram"      "retroarch/conformance/98-cheevos-ram.js"      "552966b5304b031e"
run_visual_case "99 voice handle"    "99-voice-handle"     "retroarch/conformance/99-voice-handle.js"     "94ade054edea55c8"

run_visual_case "100 pbr material"     "100-pbr-material"     "retroarch/conformance/100-pbr-material.js"     "1cebb4a284ffc988"
run_visual_case "101 uv transform"     "101-uv-transform"     "retroarch/conformance/101-uv-transform.js"     "5e3fdb809fd92a33"
run_visual_case "102 audio resilience" "102-audio-resilience" "retroarch/conformance/102-stereo-audio.js"     "58b3c68b8833ca3a"
run_visual_case "103 shadow map"      "103-shadow-map"      "retroarch/conformance/103-shadow-map.js"          "2af3ff820f1a8741"
run_visual_case "104 normal map"      "104-normal-map"      "retroarch/conformance/104-normal-map.js"          "a8343a25d2f84a97"
run_visual_case "105 z-sort sprites"  "105-z-sort-sprites"  "${PACKAGE_DIR}/z-sort-sprites.nova"              "5ad25226be812307"

# GLES hardware-rendered locked checksums (run with NOVA64_GLES_TESTS=1)
# 20-post skipped: GLES FBO crash
run_gles_case "6 cube"                "06-cube"                "retroarch/conformance/06-cube.js"                "5b8995b081cc8bf4"
run_gles_case "7 cube plane"          "07-cube-plane"          "retroarch/conformance/07-cube-plane.js"          "1c09782eb75ddb42"
run_gles_case "8 sphere"              "08-sphere"              "retroarch/conformance/08-sphere.js"              "e07dfe52b4ded128"
run_gles_case "9 overlay scene"       "09-overlay-scene"       "retroarch/conformance/09-overlay-scene.js"       "ca0db437937b7e88"
run_gles_case "10 lighting"           "10-lighting"            "retroarch/conformance/10-lighting.js"            "f909c7a2e91230cf"
run_gles_case "17 light fog"          "17-light-fog"           "retroarch/conformance/17-light-fog.js"           "d35372db9a472973"
run_gles_case "18 mesh helpers"       "18-mesh-helpers"        "retroarch/conformance/18-mesh-helpers.js"        "41f29d9854444167"
run_gles_case "19 texture"            "19-texture"             "retroarch/conformance/19-texture.js"             "74f6e89a8ed230f4"
run_gles_case "21 post effects"       "21-post-effects"        "retroarch/conformance/21-post-effects.js"        "3074ebf21a51c01b"
run_gles_case "22 material"           "22-material"            "retroarch/conformance/22-material.js"            "aa4a52cc43e7ff8f"
run_gles_case "44 capsule"            "44-capsule"             "retroarch/conformance/44-capsule.js"             "55f63d6f1e40a2e1"
run_gles_case "45 cylinder"           "45-cylinder"            "retroarch/conformance/45-cylinder.js"            "f31e149481b2ea86"
run_gles_case "47 camera ortho"       "47-camera-ortho"        "retroarch/conformance/47-camera-ortho.js"        "332a0297271cc75c"
run_gles_case "48 sky color"          "48-sky-color"           "retroarch/conformance/48-sky-color.js"           "3904f6e226e5ffc8"
run_gles_case "49 mesh material"      "49-mesh-material"       "retroarch/conformance/49-mesh-material.js"       "0a04bbe82a1489ab"
run_gles_case "50 get3d stats"        "50-get3d-stats"         "retroarch/conformance/50-get3d-stats.js"         "2a3cdbd320ab05f1"
run_gles_case "51 clear scene"        "51-clear-scene"         "retroarch/conformance/51-clear-scene.js"         "d1594464ed56aadf"
run_gles_case "52 camera getters"     "52-camera-getters"      "retroarch/conformance/52-camera-getters.js"      "205d59fa1e1373fb"
run_gles_case "53 mesh opacity"       "53-mesh-opacity"        "retroarch/conformance/53-mesh-opacity.js"        "bf94d90a2e80053d"
run_gles_case "54 emissive"           "54-emissive"            "retroarch/conformance/54-emissive.js"            "051ec8ec13384ac7"
run_gles_case "55 shadow flags"       "55-shadow-flags"        "retroarch/conformance/55-shadow-flags.js"        "cc92cdc61c9e3e48"
run_gles_case "56 point lights"       "56-point-lights"        "retroarch/conformance/56-point-lights.js"        "52125d3d8aedfde1"
run_gles_case "57 destroy mesh"       "57-destroy-mesh"        "retroarch/conformance/57-destroy-mesh.js"        "c8f61e1f26459aaf"
run_gles_case "58 mesh color"         "58-mesh-color"          "retroarch/conformance/58-mesh-color.js"          "77c32f16ee19df23"
run_gles_case "59 move rotate"        "59-move-rotate"         "retroarch/conformance/59-move-rotate.js"         "a7a4e82d34a626e8"
run_gles_case "60 fog"                "60-fog"                 "retroarch/conformance/60-fog.js"                 "918ebfeb93dd00a6"
run_gles_case "61 camera lookat"      "61-camera-lookat"       "retroarch/conformance/61-camera-lookat.js"       "805deaf982e3bf0d"
run_gles_case "62 set position rotation" "62-set-position-rotation" "retroarch/conformance/62-set-position-rotation.js" "aa7ca6c843a290e4"
run_gles_case "63 texture lifecycle"  "63-texture-lifecycle"   "retroarch/conformance/63-texture-lifecycle.js"   "5d0fee0f6e8f92a2"
run_gles_case "64 directional light"  "64-directional-light"   "retroarch/conformance/64-directional-light.js"   "090b8328807fca9a"
run_gles_case "65 backend caps"       "65-backend-caps"        "retroarch/conformance/65-backend-caps.js"        "84aa44c3a5f6ae42"
run_gles_case "66 draw3d callback"    "66-draw3d-callback"     "retroarch/conformance/66-draw3d-callback.js"     "b3962d3336ef1892"
run_gles_case "82 scene hierarchy"    "82-scene-hierarchy"     "retroarch/conformance/82-scene-hierarchy.js"     "3f566e456c87edc0"
run_gles_case "85 raycast"            "85-raycast"             "retroarch/conformance/85-raycast.js"             "a03c11526f9030c1"
run_gles_case "94 create mesh"        "94-create-mesh"         "retroarch/conformance/94-create-mesh.js"         "78619f0c0a7576a4"
run_gles_case "100 pbr material"      "100-pbr-material"       "retroarch/conformance/100-pbr-material.js"       "73caba476790550e"
run_gles_case "101 uv transform"      "101-uv-transform"       "retroarch/conformance/101-uv-transform.js"       "44002286e0e4fba6"
run_gles_case "102 audio resilience"  "102-audio-resilience"   "retroarch/conformance/102-stereo-audio.js"       "b9ab1f7141236d75"
run_gles_case "103 shadow map"        "103-shadow-map"         "retroarch/conformance/103-shadow-map.js"         "b059978553d8413e"
run_gles_case "104 normal map"        "104-normal-map"         "retroarch/conformance/104-normal-map.js"         "acdf60ad7ccc086f"

echo "Conformance passed."
