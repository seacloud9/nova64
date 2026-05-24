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

# skybox panorama: 64x32 RGBA equirectangular gradient (top=sky blue, bottom=horizon orange)
pano = bytearray(64 * 32 * 4)
for py in range(32):
    t = py / 31.0
    r = int(30  + (200 - 30)  * t)
    g = int(80  + (160 - 80)  * t)
    b = int(180 + (80  - 180) * t)
    for px in range(64):
        i = (py * 64 + px) * 4
        pano[i:i+4] = [r, g, b, 255]
with ZipFile(package_dir / "skybox.nova", "w", ZIP_DEFLATED) as package:
    package.write("retroarch/conformance/108-skybox.js", "src/main.js")
    package.writestr("sky/panorama.rgba", bytes(pano))
    package.writestr(
        "manifest.json",
        '{"name":"skybox","main":"src/main.js","assets":["sky/panorama.rgba"]}\n',
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
  local frames="${5:-}"
  [[ -n "${NOVA64_GLES_TESTS:-}" ]] || return 0
  should_run_label "${label}" || return 0
  echo "== ${label} (gles)"
  local frames_arg=(); [[ -n "${frames}" ]] && frames_arg=(--frames "${frames}")
  "${HARNESS}" "${CORE}" "${cart}" --gles "${frames_arg[@]}" --expect "${checksum}"
}

run_case() {
  local label="$1"
  local cart="$2"
  local checksum="$3"
  local frames="${4:-}"
  should_run_label "${label}" || return 0
  echo "== ${label}"
  local frames_arg=(); [[ -n "${frames}" ]] && frames_arg=(--frames "${frames}")
  "${HARNESS}" "${CORE}" "${cart}" "${frames_arg[@]}" --expect "${checksum}"
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
  local frames="${5:-}"
  should_run_label "${label}" || return 0
  echo "== ${label}"
  local frames_arg=(); [[ -n "${frames}" ]] && frames_arg=(--frames "${frames}")
  "${HARNESS}" "${CORE}" "${cart}" "${frames_arg[@]}" --expect "${checksum}" --expect-audio "${audio_checksum}"
}

run_visual_case() {
  local label="$1"
  local name="$2"
  local cart="$3"
  local checksum="$4"
  local frames="${5:-}"
  local ppm="${SCREENSHOT_DIR}/${name}.ppm"
  local png="${SCREENSHOT_DIR}/${name}.png"
  should_run_label "${label}" || return 0
  echo "== ${label}"
  local frames_arg=(); [[ -n "${frames}" ]] && frames_arg=(--frames "${frames}")
  "${HARNESS}" "${CORE}" "${cart}" "${frames_arg[@]}" --expect "${checksum}" --capture "${ppm}"
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
run_visual_case "09 overlay scene" "09-overlay-scene" "retroarch/conformance/09-overlay-scene.js" "8061cea7459ea817"
run_visual_case "10 lighting" "10-lighting" "retroarch/conformance/10-lighting.js" "6ec19409051a85ee"
NOVA64_SAVE_DIR="${SAVE_DIR}" run_case "11 storage" "retroarch/conformance/11-storage.js" "5dd5226aa3467474"
run_audio_case "12 audio" "retroarch/conformance/12-audio.js" "c0e5bade62febc47" "8c17792ab2c39e1b"
run_case "13 assets" "${PACKAGE_DIR}/asset-runtime.nova" "294b9bd45b20fb27"
run_case "14 plane dimensions" "retroarch/conformance/14-plane-dimensions.js" "4e59cf09e7f095df"
run_case "15 primitive args" "retroarch/conformance/15-primitive-args.js" "1294ed2cc0033448"
run_case "16 transforms" "retroarch/conformance/16-transforms.js" "271707fd988ce378"
run_visual_case "17 light fog" "17-light-fog" "retroarch/conformance/17-light-fog.js" "1c577cddb900b60b"
run_visual_case "18 mesh helpers" "18-mesh-helpers" "retroarch/conformance/18-mesh-helpers.js" "085d5a80c48ebdcd"
run_key_case "23 keyboard" "retroarch/conformance/23-keyboard.js" "space" "263dcd46b90be119"
NOVA64_SAVE_DIR="${SAVE_DIR}" run_case "24 storage keys" "retroarch/conformance/24-storage-keys.js" "eaa4eb3022596407"

run_mouse_case() {
  local label="$1"
  local cart="$2"
  local checksum="$3"
  should_run_label "${label}" || return 0
  echo "== ${label}"
  "${HARNESS}" "${CORE}" "${cart}" --mouse-x 5 --mouse-y -3 --mouse-btn left --expect "${checksum}"
}

run_mouse_case "25 mouse" "retroarch/conformance/25-mouse.js" "bb6374732d548979"
run_visual_case "26 draw2d" "26-draw2d" "retroarch/conformance/26-draw2d.js" "63788950828b76e0"
run_visual_case "27 sprite" "27-sprite" "${PACKAGE_DIR}/sprite.nova" "76a968686046ead1"
run_audio_case "28 play sound" "${PACKAGE_DIR}/play-sound.nova" "ca1c9d86277b9827" "5688d0029f712693"
run_visual_case "29 runtime utils" "29-runtime-utils" "retroarch/conformance/29-runtime-utils.js" "5d745f3d6858f44f"

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

run_showcase_case "30 showcase" "30-showcase" "retroarch/conformance/30-showcase.js" "47bc59ec887805b7" "c888ebc87f460853"

run_analog_case() {
  local label="$1"
  local cart="$2"
  local checksum="$3"
  should_run_label "${label}" || return 0
  echo "== ${label}"
  "${HARNESS}" "${CORE}" "${cart}" \
    --analog-lx 16383 --analog-ly -8192 --trigger-l 16383 --expect "${checksum}"
}

run_visual_case "31 tilemap" "31-tilemap" "${PACKAGE_DIR}/tilemap.nova" "4119b92a2600cc6a"
run_visual_case "32 spritesheet" "32-spritesheet" "${PACKAGE_DIR}/spritesheet.nova" "93b601921858c9b7"
run_analog_case "34 analog"  "retroarch/conformance/34-analog.js" "8a14e5c65d226f9f"
run_visual_case "35 rng" "35-rng" "retroarch/conformance/35-rng.js" "9499020a2a2bdc03"
run_visual_case "36 camera2d" "36-camera2d" "retroarch/conformance/36-camera2d.js" "c8a8368d677bea34"
run_visual_case "37 multimodule" "37-multimodule" "${PACKAGE_DIR}/multimodule.nova" "c9b20611557a6e6b"
run_seed_visual_case "38 seeded rng" "38-seeded-rng" "retroarch/conformance/38-seeded-rng.js" "2026" "e87f056b364eef57"
run_visual_case "39 meta" "39-meta" "${PACKAGE_DIR}/meta.nova" "7ecd7428e670e659"
run_visual_case "40 perf" "40-perf" "retroarch/conformance/40-perf.js" "897f807bdf70cf9f"
NOVA64_ASSET_QUOTA=8 run_visual_case "41 asset quota" "41-asset-quota" "${PACKAGE_DIR}/asset-quota.nova" "fc803c70ffa03682"

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

run_touch_case "42 touch" "42-touch" "retroarch/conformance/42-touch.js" "2d5c2d00a97d703b"
NOVA64_SAVE_DIR="${SAVE_DIR}" run_visual_case "43 storage namespace" "43-storage-namespace" "retroarch/conformance/43-storage-namespace.js" "bf38ba59232fe3f5"
run_visual_case "19 texture" "19-texture" "retroarch/conformance/19-texture.js" "a46d1db24affa1fc"
run_visual_case "20 post" "20-post" "retroarch/conformance/20-post.js" "211d5f6b9d7b3744"
run_visual_case "21 post-effects" "21-post-effects" "retroarch/conformance/21-post-effects.js" "13bfc775419fa047"
run_visual_case "22 material" "22-material" "retroarch/conformance/22-material.js" "70d84e5b98e5177c"
run_command_log_case "09-overlay-scene" "retroarch/conformance/09-overlay-scene.js" "9b822bb2755399539ec899bf48de613ed6ea18746c57203fc4091b0787fcd40d"
run_command_log_case "10-lighting" "retroarch/conformance/10-lighting.js" "3458d471f6bbfd388884ec0a47f46c7ce206800880c10c69a146428bddc6c650"
run_command_log_case "14-plane-dimensions" "retroarch/conformance/14-plane-dimensions.js" "64440cebc3ee599aa7506f9441f94e517dcab97f0bea63a0aae8638e7de0f7ea"
run_command_log_case "15-primitive-args" "retroarch/conformance/15-primitive-args.js" "2a7a8c77e90ebab09b94ec66318ef7e8b50955d50ba6ae9a6c39229c55fe5e2e"
run_command_log_case "16-transforms" "retroarch/conformance/16-transforms.js" "3af85768c7c9f65ec5f829c1168cdeea06b1e562980b7e3ece2131cafba4374d"
run_command_log_case "17-light-fog" "retroarch/conformance/17-light-fog.js" "297b1c179035d9ce3182830f5ceeeeeb26347f45fc234c455efe5c7ac2070f0e"
run_command_log_case "18-mesh-helpers" "retroarch/conformance/18-mesh-helpers.js" "b001e2ffcf4838da2be4eda365a18dc474393a0259451497947fb24de7a7825a"
run_command_log_case "22-material" "retroarch/conformance/22-material.js" "765df7abed35a0398a0511994e24e80feb8a44541b6a2b193614db76baa63694"
run_command_log_case "06-cube-vulkan12" "retroarch/conformance/06-cube.js" "6ae42f1fecbc5b41418358ab9828065874e107ed73c2127eb1c02082954a4d89" "vulkan12"
run_case "nova fallback" "${PACKAGE_DIR}/cube-fallback.nova" "53584f0993f3ff6a"
run_case "nova manifest main" "${PACKAGE_DIR}/cube-manifest.nova" "53584f0993f3ff6a"
run_command_log_case "nova-asset-manifest" "${PACKAGE_DIR}/asset-manifest.nova" "bfd7722efac7253841903cef7829235066e1b3392d42cb26093abe1a6b8fd5f4"

run_visual_case "33 music api" "33-music" "retroarch/conformance/33-music.js" "20d2d3e187d6c7e7"
run_visual_case "44 capsule" "44-capsule" "retroarch/conformance/44-capsule.js" "5049a8a222ba6a96"
run_visual_case "45 cylinder" "45-cylinder" "retroarch/conformance/45-cylinder.js" "a698adfa16d2cf9a"
run_visual_case "46 blend2d" "46-blend2d" "retroarch/conformance/46-blend2d.js" "6cc1ef6eaa9cbc09"
run_visual_case "47 camera ortho" "47-camera-ortho" "retroarch/conformance/47-camera-ortho.js" "8ab8a2d82da25a98"
run_visual_case "48 sky color" "48-sky-color" "retroarch/conformance/48-sky-color.js" "7d8292ddaf6f0e8b"
run_visual_case "49 mesh material" "49-mesh-material" "retroarch/conformance/49-mesh-material.js" "a8f7890aedb2efd7"

run_visual_case "50 get3d stats"    "50-get3d-stats"    "retroarch/conformance/50-get3d-stats.js"    "e4798735f67588b8"
run_visual_case "51 clear scene"    "51-clear-scene"    "retroarch/conformance/51-clear-scene.js"    "5e8da041faee8823"
run_visual_case "52 camera getters" "52-camera-getters" "retroarch/conformance/52-camera-getters.js" "9e29a7309ece654f"
run_visual_case "53 mesh opacity"   "53-mesh-opacity"   "retroarch/conformance/53-mesh-opacity.js"   "d96e0ba2e011514f"
run_visual_case "54 emissive"       "54-emissive"       "retroarch/conformance/54-emissive.js"       "be20e1ae8bc288e7"
run_visual_case "55 shadow flags"   "55-shadow-flags"   "retroarch/conformance/55-shadow-flags.js"   "4bb92e5135d3b57c"

run_visual_case "56 point lights"   "56-point-lights"   "retroarch/conformance/56-point-lights.js"   "827e3d3f3fb5ca5b"
run_visual_case "57 destroy mesh"   "57-destroy-mesh"   "retroarch/conformance/57-destroy-mesh.js"   "c02f1d1790e83c9a"
run_visual_case "58 mesh color"     "58-mesh-color"     "retroarch/conformance/58-mesh-color.js"     "0068d4bb78856363"
run_visual_case "59 move rotate"    "59-move-rotate"    "retroarch/conformance/59-move-rotate.js"    "36d44395b3db20de"
run_visual_case "60 fog"            "60-fog"            "retroarch/conformance/60-fog.js"            "62af65756c4062de"
run_visual_case "61 camera lookat"  "61-camera-lookat"  "retroarch/conformance/61-camera-lookat.js"  "dfda80ca6e59c67c"
run_visual_case "62 set position rotation" "62-set-position-rotation" "retroarch/conformance/62-set-position-rotation.js" "ff495ab99f2c4e3a"
run_visual_case "63 texture lifecycle"     "63-texture-lifecycle"     "retroarch/conformance/63-texture-lifecycle.js"     "7055268530bd288c"
run_visual_case "64 directional light"     "64-directional-light"     "retroarch/conformance/64-directional-light.js"     "2a27440c485be955"
run_visual_case "65 backend caps"          "65-backend-caps"          "retroarch/conformance/65-backend-caps.js"          "e510916e9d888c4f"
run_visual_case "66 draw3d callback"       "66-draw3d-callback"       "retroarch/conformance/66-draw3d-callback.js"       "935bceb850e81462"
run_visual_case "67 storage"               "67-storage"               "retroarch/conformance/67-storage.js"               "781b39a1bf20a99c"
run_visual_case "68 sky gradient"          "68-sky-gradient"          "retroarch/conformance/68-sky-gradient.js"          "4639b63591a5e451"
run_visual_case "69 palette swap"          "69-palette-swap"          "retroarch/conformance/69-palette-swap.js"          "d60de39cb5b1ca4f"
run_visual_case "70 draw shapes"           "70-draw-shapes"           "retroarch/conformance/70-draw-shapes.js"           "cef7afb75c739eac"
run_visual_case "71 camera2d transform"    "71-camera2d-transform"    "retroarch/conformance/71-camera2d-transform.js"    "85de4fb6d131235a"
run_visual_case "72 draw state"            "72-draw-state"            "retroarch/conformance/72-draw-state.js"            "e7641f761139021d"
run_visual_case "73 lines rounded"         "73-lines-rounded"         "retroarch/conformance/73-lines-rounded.js"         "424f1d3eefea7ff8"
run_visual_case "74 screen effects"        "74-screen-effects"        "retroarch/conformance/74-screen-effects.js"        "929f9240c58a9f85"
run_visual_case "75 screen threshold"      "75-screen-threshold"      "retroarch/conformance/75-screen-threshold.js"      "240db33c5b60816f"
run_visual_case "76 text effects"          "76-text-effects"          "retroarch/conformance/76-text-effects.js"          "589a49744263740a"
run_visual_case "77 draw state stack"      "77-draw-state-stack"      "retroarch/conformance/77-draw-state-stack.js"      "6b856e16e0f387e8"

run_visual_case "78 rumble"          "78-rumble"          "retroarch/conformance/78-rumble.js"          "799df0a785753d1b"
NOVA64_SAVE_DIR="${SAVE_DIR}" run_visual_case "79 storage version" "79-storage-version" "retroarch/conformance/79-storage-version.js" "afbb20120e528a32"
run_visual_case "80 physics"         "80-physics"         "retroarch/conformance/80-physics.js"         "e25a0ab22141a4e3"
run_visual_case "81 png sprite"      "81-png-sprite"      "${PACKAGE_DIR}/png-sprite.nova"              "426010e8187efe9b"
run_visual_case "82 scene hierarchy" "82-scene-hierarchy" "retroarch/conformance/82-scene-hierarchy.js" "832dc4cd2103da3c"
run_visual_case "83 audio channels"  "83-audio-channels"  "retroarch/conformance/83-audio-channels.js"  "1ff0d71c63248ab1"

NOVA64_SAVE_DIR="${SAVE_DIR}" run_visual_case "84 storage cart ids" "84-storage-cart-ids" "retroarch/conformance/84-storage-cart-ids.js" "0eb64e3b2eff029a"
run_visual_case "85 raycast"       "85-raycast"       "retroarch/conformance/85-raycast.js"       "65cbe7ffa4862bac"
run_visual_case "86 bitmap font"   "86-bitmap-font"   "retroarch/conformance/86-bitmap-font.js"   "9fd40dfb6d36c6ec"
run_visual_case "87 resolution"    "87-resolution"    "retroarch/conformance/87-resolution.js"    "550c6e9e41bca0ab"

run_visual_case "88 echo api"        "88-echo"             "retroarch/conformance/88-echo.js"             "2a6874d8dc393448"
run_visual_case "89 positional audio" "89-positional-audio" "retroarch/conformance/89-positional-audio.js" "fbb4bb11cac086fa"
run_visual_case "90 developer mode"  "90-developer-mode"   "retroarch/conformance/90-developer-mode.js"   "46650f99010c0e2e"
run_visual_case "91 stereo pan"      "91-stereo-pan"       "retroarch/conformance/91-stereo-pan.js"       "f35b8c0ecca0fbdf"
run_visual_case "92 hot reload"      "92-hot-reload"       "retroarch/conformance/92-hot-reload.js"       "529feb3a0c0a4a1a"
run_visual_case "93 dev console"     "93-dev-console"      "retroarch/conformance/93-dev-console.js"      "499d83798b7a231a"
run_visual_case "94 create mesh"     "94-create-mesh"      "retroarch/conformance/94-create-mesh.js"      "d76230075c5f3b80"
run_visual_case "95 audio pitch"     "95-audio-pitch"      "retroarch/conformance/95-audio-pitch.js"      "bcf36b286fba8f7e"
run_visual_case "96 channel pitch"   "96-channel-pitch"    "retroarch/conformance/96-channel-pitch.js"    "844d5878fcded8e8"
run_visual_case "97 multiport input" "97-multiport-input"  "retroarch/conformance/97-multiport-input.js"  "a239e589a446ab2c"
run_visual_case "98 cheevos ram"     "98-cheevos-ram"      "retroarch/conformance/98-cheevos-ram.js"      "cc74adb119db0658"
run_visual_case "99 voice handle"    "99-voice-handle"     "retroarch/conformance/99-voice-handle.js"     "94ade054edea55c8"

run_visual_case "100 pbr material"     "100-pbr-material"     "retroarch/conformance/100-pbr-material.js"     "1cebb4a284ffc988"
run_visual_case "101 uv transform"     "101-uv-transform"     "retroarch/conformance/101-uv-transform.js"     "5e3fdb809fd92a33"
run_visual_case "102 audio resilience" "102-audio-resilience" "retroarch/conformance/102-stereo-audio.js"     "58b3c68b8833ca3a"
run_visual_case "103 shadow map"      "103-shadow-map"      "retroarch/conformance/103-shadow-map.js"          "557e151932d03831"
run_visual_case "104 normal map"      "104-normal-map"      "retroarch/conformance/104-normal-map.js"          "4df62fef94655447"
run_visual_case "105 z-sort sprites"  "105-z-sort-sprites"  "${PACKAGE_DIR}/z-sort-sprites.nova"              "a0fa5024842da277"
run_visual_case "106 render target"   "106-render-target"   "retroarch/conformance/106-render-target.js"       "0dad67164d1bf257"
run_visual_case "107 instanced mesh"  "107-instanced-mesh"  "retroarch/conformance/107-instanced-mesh.js"      "7fc1eb6e89fa4155"
run_visual_case "108 skybox"          "108-skybox"          "${PACKAGE_DIR}/skybox.nova"                        "6cf476f25de869ca"
run_visual_case "109 blend modes"     "109-blend-modes"     "retroarch/conformance/109-blend-modes.js"          "5fe52d22aa1c0d45"
NOVA64_SAVE_DIR="${SAVE_DIR}" run_case "110 storage compressed" "retroarch/conformance/110-storage-compressed.js" "7a47039b58c20d0b"
run_visual_case "111 noise"           "111-noise"           "retroarch/conformance/111-noise.js"                "d7666f84ad2e1318"
run_visual_case "112 particles 2d"   "112-particles2d"     "retroarch/conformance/112-particles2d.js"          "ce3eb8317466d834"

# GLES hardware-rendered locked checksums (run with NOVA64_GLES_TESTS=1)
# 20-post skipped: GLES FBO crash
run_gles_case "6 cube"                "06-cube"                "retroarch/conformance/06-cube.js"                "da3baa5f152d9699"
run_gles_case "7 cube plane"          "07-cube-plane"          "retroarch/conformance/07-cube-plane.js"          "4e9025ecbb84be39"
run_gles_case "8 sphere"              "08-sphere"              "retroarch/conformance/08-sphere.js"              "3afdc84c6418bd51"
run_gles_case "9 overlay scene"       "09-overlay-scene"       "retroarch/conformance/09-overlay-scene.js"       "a2e3857aa3c39b5b"
run_gles_case "10 lighting"           "10-lighting"            "retroarch/conformance/10-lighting.js"            "6d7f221f77a695be"
run_gles_case "17 light fog"          "17-light-fog"           "retroarch/conformance/17-light-fog.js"           "4386993a4cae85c3"
run_gles_case "18 mesh helpers"       "18-mesh-helpers"        "retroarch/conformance/18-mesh-helpers.js"        "ab194f24d9d6256f"
run_gles_case "19 texture"            "19-texture"             "retroarch/conformance/19-texture.js"             "205dc3b72303ecf6"
run_gles_case "21 post effects"       "21-post-effects"        "retroarch/conformance/21-post-effects.js"        "d5f674e4aa5e28a0"
run_gles_case "22 material"           "22-material"            "retroarch/conformance/22-material.js"            "5218545dbc08af5e"
run_gles_case "44 capsule"            "44-capsule"             "retroarch/conformance/44-capsule.js"             "aca0cfd51b996f16"
run_gles_case "45 cylinder"           "45-cylinder"            "retroarch/conformance/45-cylinder.js"            "7ad719f4a2311584"
run_gles_case "47 camera ortho"       "47-camera-ortho"        "retroarch/conformance/47-camera-ortho.js"        "feb39802e43ba8b3"
run_gles_case "48 sky color"          "48-sky-color"           "retroarch/conformance/48-sky-color.js"           "df31ce353e0766d7"
run_gles_case "49 mesh material"      "49-mesh-material"       "retroarch/conformance/49-mesh-material.js"       "a0fd9a87a4b04cf7"
run_gles_case "50 get3d stats"        "50-get3d-stats"         "retroarch/conformance/50-get3d-stats.js"         "61947ab812a0fd7a"
run_gles_case "51 clear scene"        "51-clear-scene"         "retroarch/conformance/51-clear-scene.js"         "a2f979b32a09812b"
run_gles_case "52 camera getters"     "52-camera-getters"      "retroarch/conformance/52-camera-getters.js"      "8bfdd171e84642e3"
run_gles_case "53 mesh opacity"       "53-mesh-opacity"        "retroarch/conformance/53-mesh-opacity.js"        "8636ee8bd0db026f"
run_gles_case "54 emissive"           "54-emissive"            "retroarch/conformance/54-emissive.js"            "3bde6ed8e10e72f3"
run_gles_case "55 shadow flags"       "55-shadow-flags"        "retroarch/conformance/55-shadow-flags.js"        "11dc4b657471fca0"
run_gles_case "56 point lights"       "56-point-lights"        "retroarch/conformance/56-point-lights.js"        "cd2bc29d169b78d3"
run_gles_case "57 destroy mesh"       "57-destroy-mesh"        "retroarch/conformance/57-destroy-mesh.js"        "6a8499aea149587b"
run_gles_case "58 mesh color"         "58-mesh-color"          "retroarch/conformance/58-mesh-color.js"          "e9fb702f52aba6c3"
run_gles_case "59 move rotate"        "59-move-rotate"         "retroarch/conformance/59-move-rotate.js"         "fd8345f5d37e91f5"
run_gles_case "60 fog"                "60-fog"                 "retroarch/conformance/60-fog.js"                 "2c25252c1ec6601e"
run_gles_case "61 camera lookat"      "61-camera-lookat"       "retroarch/conformance/61-camera-lookat.js"       "36c7623574c01ab8"
run_gles_case "62 set position rotation" "62-set-position-rotation" "retroarch/conformance/62-set-position-rotation.js" "9f62c2116f4656de"
run_gles_case "63 texture lifecycle"  "63-texture-lifecycle"   "retroarch/conformance/63-texture-lifecycle.js"   "2d8816e4bf4651ae"
run_gles_case "64 directional light"  "64-directional-light"   "retroarch/conformance/64-directional-light.js"   "2bc24e09a263b31b"
run_gles_case "65 backend caps"       "65-backend-caps"        "retroarch/conformance/65-backend-caps.js"        "f3a9c9e6e2a4468b"
run_gles_case "66 draw3d callback"    "66-draw3d-callback"     "retroarch/conformance/66-draw3d-callback.js"     "aebd338e9ebfab7d"
run_gles_case "82 scene hierarchy"    "82-scene-hierarchy"     "retroarch/conformance/82-scene-hierarchy.js"     "4e37a91f9c0762ee"
run_gles_case "85 raycast"            "85-raycast"             "retroarch/conformance/85-raycast.js"             "36bdb9fbd35198c7"
run_gles_case "94 create mesh"        "94-create-mesh"         "retroarch/conformance/94-create-mesh.js"         "6f8b5bf08a4d2d0d"
run_gles_case "100 pbr material"      "100-pbr-material"       "retroarch/conformance/100-pbr-material.js"       "cf25bda3297bf09a"
run_gles_case "101 uv transform"      "101-uv-transform"       "retroarch/conformance/101-uv-transform.js"       "39fa3f984183130e"
run_gles_case "102 audio resilience"  "102-audio-resilience"   "retroarch/conformance/102-stereo-audio.js"       "67d2dcb8246a6b39"
run_gles_case "103 shadow map"        "103-shadow-map"         "retroarch/conformance/103-shadow-map.js"         "2688ce747f783472"
run_gles_case "104 normal map"        "104-normal-map"         "retroarch/conformance/104-normal-map.js"         "084ff635c0793003"
run_gles_case "106 render target"     "106-render-target"      "retroarch/conformance/106-render-target.js"      "86581f02984ca2b7"
run_gles_case "107 instanced mesh"    "107-instanced-mesh"     "retroarch/conformance/107-instanced-mesh.js"     "59ba716c232390d6"
run_gles_case "108 skybox"            "108-skybox"             "${PACKAGE_DIR}/skybox.nova"                      "b10b0c7675110117"
run_gles_case "109 blend modes"       "109-blend-modes"        "retroarch/conformance/109-blend-modes.js"        "6c7d2bbf8ea2cc2f"
run_gles_case "110 torus"             "110-torus"              "retroarch/conformance/torus-test.js"             "cd825d347e147431"
run_gles_case "GLES clear color"      "gles-clear-color"       "retroarch/conformance/gles-clear-color.js"       "cfc2e94e23f70383" 3
run_gles_case "GLES post color grade" "gles-post-color-grade"  "retroarch/conformance/gles-post-color-grade.js"  "a046cb4ae7adcf8e" 3
run_gles_case "GLES instance colors"  "gles-instance-colors"   "retroarch/conformance/gles-instance-colors.js"   "11e6f45f37eaf28b" 3
run_gles_case "GLES torus scale"      "gles-torus-scale"       "retroarch/conformance/gles-torus-scale.js"       "da5f54d903879228" 3
run_gles_case "GLES overlay orientation" "gles-overlay-orientation" "retroarch/conformance/gles-overlay-orientation.js" "0dcf2b567c8c2bf8" 3
run_gles_case "GLES cone primitive"   "gles-cone-primitive"    "retroarch/conformance/gles-cone-primitive.js"    "95d0bd06cec9898d" 30
run_gles_case "GLES capsule primitive" "gles-capsule-primitive" "retroarch/conformance/gles-capsule-primitive.js" "d39991f6826c80b3" 30
run_gles_case "GLES cylinder primitive" "gles-cylinder-primitive" "retroarch/conformance/gles-cylinder-primitive.js" "ba4c336cc336d8c1" 30
run_gles_case "GLES transparent z sort" "gles-transparent-z-sort" "retroarch/conformance/gles-transparent-z-sort.js" "9d6b7cfaab281d70" 30

run_visual_case "113 math utils"    "113-math-utils"    "retroarch/conformance/113-math-utils.js"    "4bfdf6cc87ca9210"
run_visual_case "114 camera orbit"  "114-camera-orbit"  "retroarch/conformance/114-camera-orbit.js"  "1c5d39f5fea6448c"
run_visual_case "115 camera shake"  "115-camera-shake"  "retroarch/conformance/115-camera-shake.js"  "dfb887953016d36f"
run_visual_case "116 tweens"        "116-tweens"        "retroarch/conformance/116-tweens.js"        "0dd78ed02d59d920"
run_visual_case "117 spr transform" "117-spr-transform" "retroarch/conformance/117-spr-transform.js" "5c48cb95818ead63"
run_visual_case "118 path draw"     "118-path-draw"     "retroarch/conformance/118-path-draw.js"     "aa0e27206b97a547"
run_visual_case "119 screen flash"  "119-screen-flash"  "retroarch/conformance/119-screen-flash.js"  "1772ad6d669a8294"
run_visual_case "120 color hsv"     "120-color-hsv"     "retroarch/conformance/120-color-hsv.js"     "8665432e25c04538"
run_visual_case "121 draw fill poly" "121-draw-fill-poly" "retroarch/conformance/121-draw-fill-poly.js" "a17c6bc74d2992c3"
run_visual_case "122 screen pixelate" "122-screen-pixelate" "retroarch/conformance/122-screen-pixelate.js" "8b2ccea6a1db323f"
run_visual_case "123 text box"      "123-text-box"      "retroarch/conformance/123-text-box.js"      "b01ed2417954e5d8"
run_visual_case "124 arc"           "124-arc"           "retroarch/conformance/124-arc.js"           "5f0258e123cff1f7"
run_visual_case "125 spline"        "125-spline"        "retroarch/conformance/125-spline.js"        "0799dadcc3d79fb8"
run_visual_case "126 color lerp2d"  "126-color-lerp2d"  "retroarch/conformance/126-color-lerp2d.js"  "0031bfebf80c6f0b"
run_visual_case "127 stamp text"    "127-stamp-text"    "retroarch/conformance/127-stamp-text.js"    "68cf9beb7db3ddf4"
run_visual_case "128 timers"        "128-timers"        "retroarch/conformance/128-timers.js"        "4242584319f5582e"
run_visual_case "129 grid"          "129-grid"          "retroarch/conformance/129-grid.js"          "3926469ed5d9ff74"
run_visual_case "130 measure text"  "130-measure-text"  "retroarch/conformance/130-measure-text.js"  "090b644857ea88cd"
run_visual_case "131 pixels print right" "131-pixels-print-right" "retroarch/conformance/131-pixels-print-right.js" "e2914ad2b3ae71af"
run_visual_case "132 screen blur"   "132-screen-blur"   "retroarch/conformance/132-screen-blur.js"   "2658cfa4af358b6d"
run_visual_case "133 canvas"        "133-canvas"        "retroarch/conformance/133-canvas.js"        "e452b8e9fce542e8"
run_visual_case "134 nine slice"    "134-nine-slice"    "retroarch/conformance/134-nine-slice.js"    "db6d9203a4bae4c7"

run_visual_case "135 tilemap getters"      "135-tilemap-getters"      "retroarch/conformance/135-tilemap-getters.js"      "45d1f8f0cc54243f"
run_visual_case "136 btn repeat"           "136-btn-repeat"           "retroarch/conformance/136-btn-repeat.js"           "ff6a9082275666ef"
run_visual_case "137 str utils"            "137-str-utils"            "retroarch/conformance/137-str-utils.js"            "720d809c732f4a67"
run_visual_case "138 hotspots"             "138-hotspots"             "retroarch/conformance/138-hotspots.js"             "8688d02d78fca767"
run_visual_case "139 chromatic aberration" "139-chromatic-aberration" "retroarch/conformance/139-chromatic-aberration.js" "7fadaf560f1cdc4f"
run_visual_case "140 dashed lines"         "140-dashed-lines"         "retroarch/conformance/140-dashed-lines.js"         "8ed2322b4b4f33d3"
run_visual_case "141 screen wave"          "141-screen-wave"          "retroarch/conformance/141-screen-wave.js"          "2a3f59cca114b42f"
run_visual_case "142 frame utils"          "142-frame-utils"          "retroarch/conformance/142-frame-utils.js"          "6515cebd82ccf218"
run_visual_case "143 color utils"          "143-color-utils"          "retroarch/conformance/143-color-utils.js"          "733815c0acc2624f"
run_visual_case "144 screen dissolve"      "144-screen-dissolve"      "retroarch/conformance/144-screen-dissolve.js"      "eb210f6050311203"
run_visual_case "145 number format"        "145-number-format"        "retroarch/conformance/145-number-format.js"        "f69fc25f87ad48a7"
run_visual_case "146 spr flip"             "146-spr-flip"             "retroarch/conformance/146-spr-flip.js"             "c8a8aafe9941cd01"

run_visual_case "147 scroll text"       "147-scroll-text"       "retroarch/conformance/147-scroll-text.js"       "3793da17eb9eca6f"
run_visual_case "148 bit ops"           "148-bit-ops"           "retroarch/conformance/148-bit-ops.js"           "1b6a5e9d08c0b0a8"
run_visual_case "149 print lines"       "149-print-lines"       "retroarch/conformance/149-print-lines.js"       "2732a225cdc5ec80"
run_visual_case "150 pattern fills"     "150-pattern-fills"     "retroarch/conformance/150-pattern-fills.js"     "ae4d15d31dad7e1f"
run_visual_case "151 circle gradient"   "151-circle-gradient"   "retroarch/conformance/151-circle-gradient.js"   "b0e72ce3e6f7c45e"
run_visual_case "152 easing"            "152-easing"            "retroarch/conformance/152-easing.js"            "06b93cd75c817c05"
run_visual_case "153 color hex"         "153-color-hex"         "retroarch/conformance/153-color-hex.js"         "45b538471d2989a8"
run_visual_case "154 screen border"     "154-screen-border"     "retroarch/conformance/154-screen-border.js"     "c4b9de1769eba88d"
run_visual_case "155 spr scale"         "155-spr-scale"         "retroarch/conformance/155-spr-scale.js"         "0a519e8286e6a5cc"
run_visual_case "156 format time"       "156-format-time"       "retroarch/conformance/156-format-time.js"       "65ad98c4f987c838"
run_visual_case "157 draw arrow"        "157-draw-arrow"        "retroarch/conformance/157-draw-arrow.js"        "ee6d6b6a20b8030c"
run_visual_case "158 color pulse"       "158-color-pulse"       "retroarch/conformance/158-color-pulse.js"       "752f9e6f83d8e9f9"
run_visual_case "159 create anim"   "159-create-anim"   "retroarch/conformance/159-create-anim.js"   "d740f2817f19d6b3"
run_visual_case "160 float text"    "160-float-text"    "retroarch/conformance/160-float-text.js"    "657f541686bc2480"
run_visual_case "161 dialog"        "161-dialog"        "retroarch/conformance/161-dialog.js"        "f7b76a4ee1c10681"
run_visual_case "162 fsm"           "162-fsm"           "retroarch/conformance/162-fsm.js"           "007d46c1b0e288a8"
run_visual_case "163 vstick"        "163-vstick"        "retroarch/conformance/163-vstick.js"        "dada1f106a72f3a7"
run_visual_case "164 seeded rng"    "164-seeded-rng"    "retroarch/conformance/164-seeded-rng.js"    "d913eb27dc07e7a0"
run_visual_case "165 draw grid"     "165-draw-grid"     "retroarch/conformance/165-draw-grid.js"     "3dde9cbacd8292c9"
run_visual_case "166 math globals"  "166-math-globals"  "retroarch/conformance/166-math-globals.js"  "5385a5f2ec5a793f"
run_visual_case "167 screen mosaic" "167-screen-mosaic" "retroarch/conformance/167-screen-mosaic.js" "9f7fbd803057e183"
run_visual_case "168 color inspect" "168-color-inspect" "retroarch/conformance/168-color-inspect.js" "97b9cc6184844e88"
run_visual_case "169 star burst"    "169-star-burst"    "retroarch/conformance/169-star-burst.js"    "64755853ab59064d"
run_visual_case "170 color maps"    "170-color-maps"    "retroarch/conformance/170-color-maps.js"    "962a1db1ea1c96b4"
run_visual_case "171 draw bezier"      "171-draw-bezier"      "retroarch/conformance/171-draw-bezier.js"      "82cb61ae7e290cf1"
run_visual_case "172 polyline"         "172-polyline"         "retroarch/conformance/172-polyline.js"         "cd81384d5e932fdc"
run_visual_case "173 print wrap"       "173-print-wrap"       "retroarch/conformance/173-print-wrap.js"       "b878fbf28b9a9404"
run_visual_case "174 math helpers"     "174-math-helpers"     "retroarch/conformance/174-math-helpers.js"     "df84c386c57dec12"
run_visual_case "175 geometry tests"   "175-geometry-tests"   "retroarch/conformance/175-geometry-tests.js"   "3e8cae4e9e0a596b"
run_visual_case "176 color blend mode" "176-color-blend-mode" "retroarch/conformance/176-color-blend-mode.js" "d9412a1a5f3cc3e3"
run_visual_case "177 flood fill"       "177-flood-fill"       "retroarch/conformance/177-flood-fill.js"       "8c0d910614ddf103"
run_visual_case "178 str utils 2"      "178-str-utils2"       "retroarch/conformance/178-str-utils2.js"       "c54c9ac0de9218a7"
run_visual_case "179 angle helpers"    "179-angle-helpers"    "retroarch/conformance/179-angle-helpers.js"    "e0e4f6a4e6889e98"
run_visual_case "180 vec2"             "180-vec2"             "retroarch/conformance/180-vec2.js"             "c331fe8d30280c2b"
run_visual_case "181 draw arc"         "181-draw-arc"         "retroarch/conformance/181-draw-arc.js"         "4345e59c393f7103"
run_visual_case "182 curves showcase"  "182-curves-showcase"  "retroarch/conformance/182-curves-showcase.js"  "d5e7ab65884ad880"
run_visual_case "183 cubic bezier"     "183-cubic-bezier"     "retroarch/conformance/183-cubic-bezier.js"     "f05359aafad50986"
run_visual_case "184 spline point"     "184-spline-point"     "retroarch/conformance/184-spline-point.js"     "c0bbf9d9fda195ac"
run_visual_case "185 hex grid"         "185-hex-grid"         "retroarch/conformance/185-hex-grid.js"         "005d508a81cbd10a"
run_visual_case "186 draw graph"       "186-draw-graph"       "retroarch/conformance/186-draw-graph.js"       "0688146db6a0b0bd"
run_visual_case "187 color saturation" "187-color-saturation" "retroarch/conformance/187-color-saturation.js" "3fb329628f7f495a"
run_visual_case "188 waveform plot"    "188-waveform-plot"    "retroarch/conformance/188-waveform-plot.js"    "54f893d10b8d89ea"
run_visual_case "189 char utils"       "189-char-utils"       "retroarch/conformance/189-char-utils.js"       "4f5d2dd8bc2ec876"
run_visual_case "190 print bold"       "190-print-bold"       "retroarch/conformance/190-print-bold.js"       "af8b03b5d099dd93"
run_visual_case "191 dot grid"         "191-dot-grid"         "retroarch/conformance/191-dot-grid.js"         "a393249bfd4ab2f4"
run_visual_case "192 clamp color"      "192-clamp-color"      "retroarch/conformance/192-clamp-color.js"      "b0942ba6ba3ea971"
run_visual_case "193 batch11 showcase" "193-batch11-showcase" "retroarch/conformance/193-batch11-showcase.js" "0fcf08c6f87564bb"
run_visual_case "194 spline showcase"  "194-spline-showcase"  "retroarch/conformance/194-spline-showcase.js"  "8e24828c0f1d7c50"
run_visual_case "195 print italic"     "195-print-italic"     "retroarch/conformance/195-print-italic.js"     "a3d97e2a3cbd9d73"
run_visual_case "196 print underline"  "196-print-underline"  "retroarch/conformance/196-print-underline.js"  "1c1efee73e8ce9fa"
run_visual_case "197 progress bar"     "197-progress-bar"     "retroarch/conformance/197-progress-bar.js"     "aee8969abdda00c4"
run_visual_case "198 grid snap"        "198-grid-snap"        "retroarch/conformance/198-grid-snap.js"        "65864c40f1863bec"
run_visual_case "199 color matrix"     "199-color-matrix"     "retroarch/conformance/199-color-matrix.js"     "c380396b5f9fa095"
run_visual_case "200 neon glow"        "200-neon-glow"        "retroarch/conformance/200-neon-glow.js"        "308fba15a92209bb"
run_visual_case "201 bar chart"        "201-bar-chart"        "retroarch/conformance/201-bar-chart.js"        "3d3c9a3095ed642e"
run_visual_case "202 str format"       "202-str-format"       "retroarch/conformance/202-str-format.js"       "44d929bfa8c01632"
run_visual_case "203 color mix3"       "203-color-mix3"       "retroarch/conformance/203-color-mix3.js"       "d091c1ec6e3343c4"
run_visual_case "204 draw noise"       "204-draw-noise"       "retroarch/conformance/204-draw-noise.js"       "b13fdab1dfb8b4f5"
run_visual_case "205 batch12 showcase" "205-batch12-showcase" "retroarch/conformance/205-batch12-showcase.js" "497eefc8305b79cf"
run_visual_case "206 color matrix fx"  "206-color-matrix-fx"  "retroarch/conformance/206-color-matrix-effects.js" "e7d0253c4f7f7fca"
run_visual_case "207 color with alpha"  "207-color-with-alpha"  "retroarch/conformance/207-color-with-alpha.js"  "26a2d7b276c6d3e1"
run_visual_case "208 draw capsule"      "208-draw-capsule"      "retroarch/conformance/208-draw-capsule.js"      "ba09020345117ee2"
run_visual_case "209 fill capsule"      "209-fill-capsule"      "retroarch/conformance/209-fill-capsule.js"      "50bc4fc8722b2ec1"
run_visual_case "210 draw ring"         "210-draw-ring"         "retroarch/conformance/210-draw-ring.js"         "8b0964f521bd93e1"
run_visual_case "211 blur region"       "211-blur-region"       "retroarch/conformance/211-blur-region.js"       "655cff13e9a0aa6d"
run_visual_case "212 gradient line"     "212-draw-gradient-line" "retroarch/conformance/212-draw-gradient-line.js" "5482031b58776a2d"
run_visual_case "213 color contrast"    "213-color-contrast"    "retroarch/conformance/213-color-contrast.js"    "3f22ef35ea5af1c1"
run_visual_case "214 pixelate region"   "214-pixelate-region"   "retroarch/conformance/214-pixelate-region.js"   "8b1df778e24070a6"
run_visual_case "215 fill plus"         "215-fill-plus"         "retroarch/conformance/215-fill-plus.js"         "28ff89dd79ae2a79"
run_visual_case "216 text vertical"     "216-draw-text-vertical" "retroarch/conformance/216-draw-text-vertical.js" "4b86b29c81aa1ce6"
run_visual_case "217 draw star"         "217-draw-star"         "retroarch/conformance/217-draw-star.js"         "1d23680d646912b4"
run_visual_case "218 batch13 showcase"  "218-batch13-showcase"  "retroarch/conformance/218-batch13-showcase.js"  "82f056ea8ab51333"
run_visual_case "219 color shift"       "219-color-shift"       "retroarch/conformance/219-color-shift.js"       "5d4da5d862f25acc"
run_visual_case "220 color luminance"   "220-color-luminance"   "retroarch/conformance/220-color-luminance.js"   "902eac910414a420"
run_visual_case "221 ease back sine"    "221-ease-back-sine"    "retroarch/conformance/221-ease-back-sine.js"    "37095808daf72a23"
run_visual_case "222 hex cell"          "222-hex-cell"          "retroarch/conformance/222-hex-cell.js"          "e92918e22839e30b"
run_visual_case "223 x mark"            "223-x-mark"            "retroarch/conformance/223-x-mark.js"            "1cfb0a6d694f4618"
run_visual_case "224 draw chevron"      "224-draw-chevron"      "retroarch/conformance/224-draw-chevron.js"      "d5745f66aff382ea"
run_visual_case "225 color sepia"       "225-color-sepia"       "retroarch/conformance/225-color-sepia.js"       "40150b545f6b4fbf"
run_visual_case "226 color vibrance"    "226-color-vibrance"    "retroarch/conformance/226-color-vibrance.js"    "f415a586d1606b01"
run_visual_case "227 screen hsv"        "227-screen-hsv"        "retroarch/conformance/227-screen-hsv.js"        "72b9ee7150cb2236"
run_visual_case "228 batch14 showcase"  "228-batch14-showcase"  "retroarch/conformance/228-batch14-showcase.js"  "5d46626869f1779f"
run_visual_case "229 copy pixels"       "229-copy-pixels"       "retroarch/conformance/229-copy-pixels.js"       "57ab0a6c38782fbe"
run_visual_case "230 color add rgb"     "230-color-add-rgb"     "retroarch/conformance/230-color-add-rgb.js"     "9061b1b5f3c606e0"
run_visual_case "231 lozenge"           "231-lozenge"           "retroarch/conformance/231-lozenge.js"           "9a89a2d712b1ab15"
run_visual_case "232 draw spiral"       "232-draw-spiral"       "retroarch/conformance/232-draw-spiral.js"       "8d2aaa19746a1fa8"
run_visual_case "233 color warm cool"   "233-color-warm-cool"   "retroarch/conformance/233-color-warm-cool.js"   "316dd4af6cd03b85"
run_visual_case "234 ease expo power"   "234-ease-expo-power"   "retroarch/conformance/234-ease-expo-power.js"   "0d316e930f876243"
run_visual_case "235 fill tri gradient" "235-fill-tri-gradient" "retroarch/conformance/235-fill-tri-gradient.js" "c6c1fa5eac77aa28"
run_visual_case "236 invert region"     "236-invert-region"     "retroarch/conformance/236-invert-region.js"     "13e20fb0c5dc80d1"
run_visual_case "237 screen retro"      "237-screen-retro"      "retroarch/conformance/237-screen-retro.js"      "89d95e30baf3e85c"
run_visual_case "238 batch15 showcase"  "238-batch15-showcase"  "retroarch/conformance/238-batch15-showcase.js"  "ede0f3b6f3d4fcfd"
run_visual_case "239 draw thick line"    "239-draw-thick-line"    "retroarch/conformance/239-draw-thick-line.js"    "c5f4677644f18911"
run_visual_case "240 draw arrow filled"  "240-draw-arrow-filled"  "retroarch/conformance/240-draw-arrow-filled.js"  "6b2d05b8ffa26a7f"
run_visual_case "241 draw check"         "241-draw-check"         "retroarch/conformance/241-draw-check.js"         "fb22a9edf58be70d"
run_visual_case "242 wave functions"     "242-wave-functions"     "retroarch/conformance/242-wave-functions.js"     "49e887823581c78e"
run_visual_case "243 screen filters"     "243-screen-filters"     "retroarch/conformance/243-screen-filters.js"     "d7a0b67f1bf53d51"
run_visual_case "244 draw cloud"         "244-draw-cloud"         "retroarch/conformance/244-draw-cloud.js"         "0682814b7ed8d8a9"
run_visual_case "245 screen night vision" "245-screen-night-vision" "retroarch/conformance/245-screen-night-vision.js" "ddef548e3e4716d3"
run_visual_case "246 color from hsl"     "246-color-from-hsl"     "retroarch/conformance/246-color-from-hsl.js"     "10a2975f11b0a97b"
run_visual_case "247 batch16 showcase"   "247-batch16-showcase"   "retroarch/conformance/247-batch16-showcase.js"   "e8cff44d5434640f"
run_visual_case "248 reflect rotate"    "248-reflect-rotate-vector" "retroarch/conformance/248-reflect-rotate-vector.js" "bfb97527a0046db0"
run_visual_case "249 color blend modes" "249-color-blend-modes"  "retroarch/conformance/249-color-blend-modes.js"     "60a9bb3432357949"
run_visual_case "250 trig helpers"      "250-trig-helpers"       "retroarch/conformance/250-trig-helpers.js"          "2127e1f84fd077ca"
run_visual_case "251 screen glow"       "251-screen-glow"        "retroarch/conformance/251-screen-glow.js"           "fc39f613881a1799"
run_visual_case "252 draw ruler"        "252-draw-ruler"         "retroarch/conformance/252-draw-ruler.js"            "ad5d42fc893ab5dc"
run_visual_case "259 batch17 showcase"  "259-batch17-showcase"   "retroarch/conformance/259-batch17-showcase.js"      "436674d26d4a6c4a"
run_visual_case "260 vec from angle"       "260-vec-from-angle"   "retroarch/conformance/260-vec-from-angle.js"   "656164565998a77d"
run_visual_case "261 draw trail"           "261-draw-trail"       "retroarch/conformance/261-draw-trail.js"       "fcec3a3e43142fd9"
run_visual_case "262 color dodge burn"     "262-color-dodge-burn" "retroarch/conformance/262-color-dodge-burn.js" "d2442e100729298b"
run_visual_case "263 radial gradient"      "263-radial-gradient"  "retroarch/conformance/263-radial-gradient.js"  "1f779ebf49ed1a80"
run_visual_case "264 screen crt oil"       "264-screen-crt-oil"   "retroarch/conformance/264-screen-crt-oil.js"   "9374cbd06f227969"
run_visual_case "265 draw gear"            "265-draw-gear"        "retroarch/conformance/265-draw-gear.js"        "09d808df30577247"
run_visual_case "271 batch18 showcase"     "271-batch18-showcase" "retroarch/conformance/271-batch18-showcase.js" "d5381465d6ab1da6"
run_visual_case "272 color lighten darken" "272-color-lighten-darken" "retroarch/conformance/272-color-lighten-darken.js" "3247baa0dab3e936"
run_visual_case "273 screen brightness"    "273-screen-brightness"    "retroarch/conformance/273-screen-brightness.js"    "4f79b10973c94872"
run_visual_case "274 wave draw"            "274-wave-draw"            "retroarch/conformance/274-wave-draw.js"            "fcbf31942634202b"
run_visual_case "275 bubble connector"     "275-bubble-connector"     "retroarch/conformance/275-bubble-connector.js"     "8f74b90fcdb0551a"
run_visual_case "283 batch19 showcase"     "283-batch19-showcase"     "retroarch/conformance/283-batch19-showcase.js"     "262c378f16dd2920"
run_visual_case "284 target spider"     "284-target-spider"     "retroarch/conformance/284-target-spider.js"     "67f40ef68e63ad26"
run_visual_case "285 brick wave flame"  "285-brick-wave-flame"  "retroarch/conformance/285-brick-wave-flame.js"  "f6f0b3de525511ae"
run_visual_case "286 color lab zoom"    "286-color-lab-zoom"    "retroarch/conformance/286-color-lab-zoom.js"    "4663538302eee48f"
run_visual_case "287 dot line"          "287-dot-line"          "retroarch/conformance/287-dot-line.js"          "d7bfe1b82f0cfed3"
run_visual_case "295 batch20 showcase"  "295-batch20-showcase"  "retroarch/conformance/295-batch20-showcase.js"  "2d4d3aa5bb532482"
run_visual_case "296 nested rects"            "296-nested-rects"            "retroarch/conformance/296-nested-rects.js"            "1756988e92efc11f"
run_visual_case "297 parallelogram trapezoid" "297-parallelogram-trapezoid" "retroarch/conformance/297-parallelogram-trapezoid.js" "380571b2be28a1fc"
run_visual_case "298 concentric checker"      "298-concentric-checker"      "retroarch/conformance/298-concentric-checker.js"      "0701c464bbe81155"
run_visual_case "299 neon duotone"            "299-neon-duotone"            "retroarch/conformance/299-neon-duotone.js"            "608b4f985b6c25aa"
run_visual_case "307 batch21 showcase"        "307-batch21-showcase"        "retroarch/conformance/307-batch21-showcase.js"        "728fab873b2c4fbf"
run_visual_case "308 distance intersect"  "308-distance-intersect"  "retroarch/conformance/308-distance-intersect.js"  "01b951e8fe506a04"
run_visual_case "309 pentagram"           "309-pentagram"           "retroarch/conformance/309-pentagram.js"           "f81b4230e9dedd12"
run_visual_case "310 crescent"            "310-crescent"            "retroarch/conformance/310-crescent.js"            "5949fd6c8af7708d"
run_visual_case "311 bloom complement"    "311-bloom-complement"    "retroarch/conformance/311-bloom-complement.js"    "d0201144fb615ca4"
run_visual_case "312 bit utils"           "312-bit-utils"           "retroarch/conformance/312-bit-utils.js"           "2808736950bd396b"
run_visual_case "319 batch22 showcase"    "319-batch22-showcase"    "retroarch/conformance/319-batch22-showcase.js"    "b6d99adc93dc2643"
run_visual_case "320 lerp2d color utils"  "320-lerp2d-color-utils"  "retroarch/conformance/320-lerp2d-color-utils.js"  "1ce032bf77b7105e"
run_visual_case "321 comet"               "321-comet"               "retroarch/conformance/321-comet.js"               "0d26a4ed81a63f60"
run_visual_case "322 rainbow helix"       "322-rainbow-helix"       "retroarch/conformance/322-rainbow-helix.js"       "ef82c3c9a407770b"
run_visual_case "323 progress spiral wave" "323-progress-spiral-wave" "retroarch/conformance/323-progress-spiral-wave.js" "768b6d802a01c442"
run_visual_case "324 dither glow"         "324-dither-glow"         "retroarch/conformance/324-dither-glow.js"         "04bb5faea33fbe08"
run_visual_case "331 batch23 showcase"    "331-batch23-showcase"    "retroarch/conformance/331-batch23-showcase.js"    "f338142cc0eb9f36"
run_visual_case "332 dna vortex"          "332-dna-vortex"          "retroarch/conformance/332-dna-vortex.js"          "31394b2a8b4dd836"
run_visual_case "333 mandala halftone"    "333-mandala-halftone"    "retroarch/conformance/333-mandala-halftone.js"    "4f77f54beb85f635"
run_visual_case "334 label tag cloud"     "334-label-tag-cloud"     "retroarch/conformance/334-label-tag-cloud.js"     "d0d0197ed981ccf8"
run_visual_case "335 noise wheel pulse"   "335-noise-wheel-pulse"   "retroarch/conformance/335-noise-wheel-pulse.js"   "71e2151136431d71"
run_visual_case "343 batch24 showcase"    "343-batch24-showcase"    "retroarch/conformance/343-batch24-showcase.js"    "821f7233bd422938"
run_visual_case "344 explosion lightning" "344-explosion-lightning" "retroarch/conformance/344-explosion-lightning.js" "aaf171a255fb3792"
run_visual_case "345 hex tri grid"        "345-hex-tri-grid"        "retroarch/conformance/345-hex-tri-grid.js"        "af29691a3c237f60"
run_visual_case "346 border sobel"        "346-border-sobel"        "retroarch/conformance/346-border-sobel.js"        "ca526ea824451422"
run_visual_case "347 color shift diamond" "347-color-shift-diamond" "retroarch/conformance/347-color-shift-diamond.js" "4147801ed92bcf17"
run_visual_case "355 batch25 showcase"    "355-batch25-showcase"    "retroarch/conformance/355-batch25-showcase.js"    "da1dff657d5f5497"
run_visual_case "356 star2 rosette"       "356-star2-rosette"       "retroarch/conformance/356-star2-rosette.js"       "d5c3e2c75b00c94c"
run_visual_case "357 fractal tree"        "357-fractal-tree"        "retroarch/conformance/357-fractal-tree.js"        "23fc5d75f603b203"
run_visual_case "358 screen flip thermal" "358-screen-flip-thermal" "retroarch/conformance/358-screen-flip-thermal.js" "e3a84ce719718321"
run_visual_case "359 color fade arrow"    "359-color-fade-arrow"    "retroarch/conformance/359-color-fade-arrow.js"    "598276635cfcb50b"
run_visual_case "367 batch26 showcase"    "367-batch26-showcase"    "retroarch/conformance/367-batch26-showcase.js"    "a83bfd8a020e9412"
run_visual_case "368 sweep lissajous"     "368-sweep-lissajous"     "retroarch/conformance/368-sweep-lissajous.js"     "09613fe0b5138ae1"
run_visual_case "369 ellipse arc starburst" "369-ellipse-arc-starburst" "retroarch/conformance/369-ellipse-arc-starburst.js" "d59a180391ce5773"
run_visual_case "370 sepia hex ease"      "370-sepia-hex-ease"      "retroarch/conformance/370-sepia-hex-ease.js"      "cea454eddbefe5fa"
run_visual_case "379 batch27 showcase"    "379-batch27-showcase"    "retroarch/conformance/379-batch27-showcase.js"    "4a417451f5706d75"
run_visual_case "380 bezier poly"         "380-bezier-poly"         "retroarch/conformance/380-bezier-poly.js"         "132dbdb413871815"
run_visual_case "381 kaleidoscope spoke"  "381-kaleidoscope-spoke"  "retroarch/conformance/381-kaleidoscope-spoke.js"  "13d497d8537a759a"
run_visual_case "382 pixelate vibrancy"   "382-pixelate-vibrancy-invert" "retroarch/conformance/382-pixelate-vibrancy-invert.js" "a3c81c1255ff01c7"
run_visual_case "391 batch28 showcase"    "391-batch28-showcase"    "retroarch/conformance/391-batch28-showcase.js"    "839dc922ac2bd0ab"
run_visual_case "392 vector math"         "392-vector-math"         "retroarch/conformance/392-vector-math.js"         "ddba0a3c17088dc5"
run_visual_case "393 charts"              "393-charts"              "retroarch/conformance/393-charts.js"              "7925cc66dcee7ccc"
run_visual_case "394 fibonacci penrose"   "394-fibonacci-penrose"   "retroarch/conformance/394-fibonacci-penrose.js"   "6db6fcf3f120d6f4"
run_visual_case "403 batch29 showcase"    "403-batch29-showcase"    "retroarch/conformance/403-batch29-showcase.js"    "187deb6ce08ea960"
run_visual_case "404 matrix rain quantize" "404-matrix-rain-quantize" "retroarch/conformance/404-matrix-rain-quantize.js" "7da32c23b8726f10"
run_visual_case "405 ripple sparkle"       "405-ripple-sparkle"       "retroarch/conformance/405-ripple-sparkle.js"       "fe51851c30e8e304"
run_visual_case "406 tilt wirebox"         "406-tilt-wirebox"         "retroarch/conformance/406-tilt-wirebox.js"         "cbb83c75ec24de72"
run_visual_case "407 crosshatch"           "407-crosshatch"           "retroarch/conformance/407-crosshatch.js"           "d3900f8ae64c2803"
run_visual_case "415 batch30 showcase"     "415-batch30-showcase"     "retroarch/conformance/415-batch30-showcase.js"     "0434d2ea21f88ca1"
run_visual_case "416 snowflake venn"       "416-snowflake-venn"       "retroarch/conformance/416-snowflake-venn.js"       "8014d93979b26793"
run_visual_case "417 pinwheel"             "417-pinwheel"             "retroarch/conformance/417-pinwheel.js"             "fcbdc9af99edc9e7"
run_visual_case "418 iso tile tunnel"      "418-iso-tile-tunnel"      "retroarch/conformance/418-iso-tile-tunnel.js"      "422f0767d39dee89"
run_visual_case "419 bokeh neon"           "419-bokeh-neon"           "retroarch/conformance/419-bokeh-neon.js"           "5686a87039e48fc4"
run_visual_case "427 batch31 showcase"     "427-batch31-showcase"     "retroarch/conformance/427-batch31-showcase.js"     "ba504eef9836408b"
run_visual_case "428 dot grid zigzag"      "428-dot-grid-zigzag"      "retroarch/conformance/428-dot-grid-zigzag.js"      "16e01e32ce619722"
run_visual_case "429 bullseye needle"      "429-bullseye-needle"      "retroarch/conformance/429-bullseye-needle.js"      "d643837d1539bcdb"
run_visual_case "430 vhs echo cycle"       "430-vhs-echo-cycle"       "retroarch/conformance/430-vhs-echo-cycle.js"       "ac6363bc20f2f450"
run_visual_case "431 conveyor arc arrow"   "431-conveyor-arc-arrow"   "retroarch/conformance/431-conveyor-arc-arrow.js"   "417931b9f6e5083a"
run_visual_case "439 batch32 showcase"     "439-batch32-showcase"     "retroarch/conformance/439-batch32-showcase.js"     "05950cdca1edddd6"
run_visual_case "440 meteor corona"        "440-meteor-corona"        "retroarch/conformance/440-meteor-corona.js"        "af717e762f279529"
run_visual_case "441 crystal crt"          "441-crystal-crt"          "retroarch/conformance/441-crystal-crt.js"          "b481b0f4d7c52487"
run_visual_case "442 galaxy orbit atom"    "442-galaxy-orbit-atom"    "retroarch/conformance/442-galaxy-orbit-atom.js"    "8454decee5644a62"
run_visual_case "443 radar sunburst"       "443-radar-sunburst"       "retroarch/conformance/443-radar-sunburst.js"       "dc0a681a769a002a"
run_visual_case "451 batch33 showcase"     "451-batch33-showcase"     "retroarch/conformance/451-batch33-showcase.js"     "e5b4f8ffa64b8cb9"
run_visual_case "452 aurora windmill"      "452-aurora-windmill"      "retroarch/conformance/452-aurora-windmill.js"      "7e0e377ad56da858"
run_visual_case "453 honeycomb"            "453-honeycomb"            "retroarch/conformance/453-honeycomb.js"            "cc5a39da1eaf456f"
run_visual_case "454 chroma saturate"      "454-chroma-saturate"      "retroarch/conformance/454-chroma-saturate.js"      "30e0383c85deaba7"
run_visual_case "455 nebula rain checker"  "455-nebula-rain-checker"  "retroarch/conformance/455-nebula-rain-checker.js"  "fd84ee4e6b46d9d6"
run_visual_case "463 batch34 showcase"     "463-batch34-showcase"     "retroarch/conformance/463-batch34-showcase.js"     "0f8e2d261b1c480b"
run_visual_case "464 matrix stack"         "464-matrix-stack"         "retroarch/conformance/464-matrix-stack.js"         "aa34a6de3277347c"
run_visual_case "465 noise control"        "465-noise-control"        "retroarch/conformance/465-noise-control.js"        "9073271dbb83bab3"
run_visual_case "466 curve ellipse hsb"    "466-curve-ellipse-hsb"    "retroarch/conformance/466-curve-ellipse-hsb.js"    "2f926690de4d8b74"
run_visual_case "475 batch35 showcase"     "475-batch35-showcase"     "retroarch/conformance/475-batch35-showcase.js"     "07a71bd0be90b4b4"
run_visual_case "476 lerp ease arc bezier" "476-lerp-ease-arc-bezier" "retroarch/conformance/476-lerp-ease-arc-bezier.js" "57ec5bd04fd3851f"
run_visual_case "477 noisemap flowfield"   "477-noisemap-flowfield-color" "retroarch/conformance/477-noisemap-flowfield-color.js" "dbe903f4311cdc66"
run_visual_case "478 gradient hexcolor"    "478-gradient-hexcolor"    "retroarch/conformance/478-gradient-hexcolor.js"    "721027ce7cf3e5eb"
run_visual_case "487 batch36 showcase"     "487-batch36-showcase"     "retroarch/conformance/487-batch36-showcase.js"     "4cb5b3ddcc884092"
run_visual_case "488 shake cooldown"       "488-shake-cooldown"       "retroarch/conformance/488-shake-cooldown.js"       "cf063915b7e193b8"
run_visual_case "489 hit state"            "489-hit-state"            "retroarch/conformance/489-hit-state.js"            "2c4ba43145cff6eb"
run_visual_case "499 batch37 showcase"     "499-batch37-showcase"     "retroarch/conformance/499-batch37-showcase.js"     "4c734176daa747ca"
run_visual_case "500 emitter2d"            "500-emitter2d"            "retroarch/conformance/500-emitter2d.js"            "8f4735e38c7e336e"
run_visual_case "501 pool sm healthbar"    "501-pool-statemachine-healthbar" "retroarch/conformance/501-pool-statemachine-healthbar.js" "bca3175768757aa8"
run_visual_case "511 batch38 showcase"     "511-batch38-showcase"     "retroarch/conformance/511-batch38-showcase.js"     "bf71ebd6ac6c9a28"
run_visual_case "512 math utils"           "512-math-utils"           "retroarch/conformance/512-math-utils.js"           "a5067c91c8d9ca4b"
run_visual_case "513 draw shapes"          "513-draw-shapes"          "retroarch/conformance/513-draw-shapes.js"          "eaf9c496e659a49e"
run_visual_case "523 batch39 showcase"     "523-batch39-showcase"     "retroarch/conformance/523-batch39-showcase.js"     "cc499aeff78dc536"
run_visual_case "524 spawner cooldownset"  "524-spawner-cooldownset"  "retroarch/conformance/524-spawner-cooldownset.js"  "142dd1d5bf98cdaf"
run_visual_case "525 flash border hsl poly" "525-flash-border-hsl-poly" "retroarch/conformance/525-flash-border-hsl-poly.js" "66c904161c7a3567"
run_visual_case "535 batch40 showcase"     "535-batch40-showcase"     "retroarch/conformance/535-batch40-showcase.js"     "5c95bb8f1ef61c53"
run_visual_case "536 draw text shapes"     "536-draw-text-shapes"     "retroarch/conformance/536-draw-text-shapes.js"     "2e174a2556f278f8"
run_visual_case "537 floating texts"       "537-floating-texts"       "retroarch/conformance/537-floating-texts.js"       "67e939a1bd773caa"
run_visual_case "547 batch41 showcase"     "547-batch41-showcase"     "retroarch/conformance/547-batch41-showcase.js"     "49dca1d40d4a089a"
run_visual_case "548 rand delta minimap"   "548-rand-delta-minimap"   "retroarch/conformance/548-rand-delta-minimap.js"   "bc4de5c9cfc02dd1"
run_visual_case "549 oscillator trigger vec" "549-oscillator-trigger-vec" "retroarch/conformance/549-oscillator-trigger-vec.js" "f82ef0f5dcd94a6b"
run_visual_case "559 batch42 showcase"     "559-batch42-showcase"     "retroarch/conformance/559-batch42-showcase.js"     "ef42b73aac468b54"
run_visual_case "560 hittest colorpool"    "560-hittest-colorpool"    "retroarch/conformance/560-hittest-colorpool.js"    "764706ab26719277"
run_visual_case "561 shuffle vec2"        "561-shuffle-vec2"         "retroarch/conformance/561-shuffle-vec2.js"         "d97c5a73a8a495a6"
run_visual_case "571 batch43 showcase"    "571-batch43-showcase"     "retroarch/conformance/571-batch43-showcase.js"     "ab631f7f1af21fd8"
run_visual_case "572 camera2d"            "572-camera2d"             "retroarch/conformance/572-camera2d.js"             "0ed93df64071fadf"
run_visual_case "573 tween vec2"          "573-tween-vec2"           "retroarch/conformance/573-tween-vec2.js"           "ecaaa2e8f4dd0548"
run_visual_case "583 batch44 showcase"    "583-batch44-showcase"     "retroarch/conformance/583-batch44-showcase.js"     "4b1437bb89bd8d32"
run_visual_case "584 aabb drawrect"       "584-aabb-drawrect"        "retroarch/conformance/584-aabb-drawrect.js"        "0c09f1539f5d5910"
run_visual_case "585 rng seed"            "585-rng-seed"             "retroarch/conformance/585-rng-seed.js"             "304a31fe87bb8abf"
run_visual_case "595 batch45 showcase"    "595-batch45-showcase"     "retroarch/conformance/595-batch45-showcase.js"     "daa7c187b522387e"
run_visual_case "596 circle camera path"    "596-circle-camera-path"   "retroarch/conformance/596-circle-camera-path.js"   "fccd283085d7c046"
run_visual_case "597 reflect trigger color" "597-reflect-trigger-color" "retroarch/conformance/597-reflect-trigger-color.js" "d5492daa0b00f55c"
run_visual_case "607 batch46 showcase"      "607-batch46-showcase"     "retroarch/conformance/607-batch46-showcase.js"     "7fedff82b20a949e"

run_visual_case "608 camera2d hype"         "608-camera2d-hype"        "retroarch/conformance/608-camera2d-hype.js"        "27e94b7ad460c1a0"
run_visual_case "609 hype registry"         "609-hype-registry"        "retroarch/conformance/609-hype-registry.js"        "612b59981bdeb36a"
run_visual_case "619 batch47 showcase"      "619-batch47-showcase"     "retroarch/conformance/619-batch47-showcase.js"     "12e10e981003a184"

run_visual_case "620 raycast proximity"     "620-raycast-proximity"    "retroarch/conformance/620-raycast-proximity.js"    "f80f6240b3b5f616"
run_visual_case "621 seed input"            "621-seed-input"           "retroarch/conformance/621-seed-input.js"           "d9c7cec23a9893f0"
run_visual_case "631 batch48 showcase"      "631-batch48-showcase"     "retroarch/conformance/631-batch48-showcase.js"     "5e1743a275a25086"

run_visual_case "632 vec3 math"             "632-vec3-math"            "retroarch/conformance/632-vec3-math.js"            "214453e86c530003"
run_visual_case "633 input sticks"          "633-input-sticks"         "retroarch/conformance/633-input-sticks.js"         "457b2409496b62e0"
run_visual_case "643 batch49 showcase"      "643-batch49-showcase"     "retroarch/conformance/643-batch49-showcase.js"     "dea87610f29cc336"

run_visual_case "644 vec3 advanced"         "644-vec3-advanced"        "retroarch/conformance/644-vec3-advanced.js"        "af70a160e284b77f"
run_visual_case "645 screen manager"        "645-screen-manager"       "retroarch/conformance/645-screen-manager.js"       "ad975a87b621b681"
run_visual_case "655 batch50 showcase"      "655-batch50-showcase"     "retroarch/conformance/655-batch50-showcase.js"     "1a5bcfc145f96383"
run_visual_case "656 mesh props"            "656-mesh-props"           "retroarch/conformance/656-mesh-props.js"           "04c92f7ae098f509"
run_visual_case "657 clone bounds"          "657-clone-bounds"         "retroarch/conformance/657-clone-bounds.js"         "decc3e504a2761a7"
run_visual_case "667 batch51 showcase"      "667-batch51-showcase"     "retroarch/conformance/667-batch51-showcase.js"     "ee7727bb26af5a60"
run_visual_case "668 project3d"             "668-project3d"            "retroarch/conformance/668-project3d.js"            "9d306f099a810774"
run_visual_case "669 mesh transform"        "669-mesh-transform"       "retroarch/conformance/669-mesh-transform.js"       "ee90a5f11f54ffc0"
run_visual_case "679 batch52 showcase"      "679-batch52-showcase"     "retroarch/conformance/679-batch52-showcase.js"     "96552bd3ce14f49b"
run_visual_case "680 instance extended"     "680-instance-extended"    "retroarch/conformance/680-instance-extended.js"    "880d55ff127a716d"
run_visual_case "681 lod stubs"             "681-lod-stubs"            "retroarch/conformance/681-lod-stubs.js"            "c10d990731cb67c7"
run_visual_case "691 batch53 showcase"      "691-batch53-showcase"     "retroarch/conformance/691-batch53-showcase.js"     "3d958a9b97867400"
run_visual_case "692 model stubs"           "692-model-stubs"          "retroarch/conformance/692-model-stubs.js"          "cc5edec7fff156b1"
run_visual_case "693 material stubs"        "693-material-stubs"       "retroarch/conformance/693-material-stubs.js"       "8d2ab48875561ead"
run_visual_case "703 batch54 showcase"      "703-batch54-showcase"     "retroarch/conformance/703-batch54-showcase.js"     "3604d0d93bd5de8f"
run_visual_case "704 ps3d basic"            "704-ps3d-basic"           "retroarch/conformance/704-ps3d-basic.js"           "9ac1b2692b19f394"
run_visual_case "705 debug3d"               "705-debug3d"              "retroarch/conformance/705-debug3d.js"              "58d3f68c8852823f"
run_visual_case "715 batch55 showcase"      "715-batch55-showcase"     "retroarch/conformance/715-batch55-showcase.js"     "3fe5dabc03fecf5b"
run_visual_case "716 scene hierarchy"       "716-scene-hierarchy"      "retroarch/conformance/716-scene-hierarchy.js"      "38e4161677a27ba4"
run_visual_case "717 audio utils"           "717-audio-utils"          "retroarch/conformance/717-audio-utils.js"          "a4e7b0695a2f2d33"
run_visual_case "727 batch56 showcase"      "727-batch56-showcase"     "retroarch/conformance/727-batch56-showcase.js"     "75dea62a70e6be48"
run_visual_case "728 batch57 showcase"      "728-batch57-showcase"     "retroarch/conformance/728-batch57-showcase.js"     "9f54c5277c114daa"
run_visual_case "739 batch58 showcase"      "739-batch58-showcase"     "retroarch/conformance/739-batch58-showcase.js"     "3584271616d5f682"
run_visual_case "740 collision3d"           "740-collision3d"          "retroarch/conformance/740-collision3d.js"          "aecb29be9aa8a4f0"
run_visual_case "741 steering"              "741-steering"             "retroarch/conformance/741-steering.js"             "e40908d026bbd559"
run_visual_case "742 mesh tags"             "742-mesh-tags"            "retroarch/conformance/742-mesh-tags.js"            "cd08ba2ab61ed053"
run_visual_case "743 cinematic"             "743-cinematic"            "retroarch/conformance/743-cinematic.js"            "f3699d1b6ea3de72"
run_visual_case "750 batch59 showcase"      "750-batch59-showcase"     "retroarch/conformance/750-batch59-showcase.js"     "3202333232c681d5"
run_visual_case "761 batch60 showcase"      "761-batch60-showcase"     "retroarch/conformance/761-batch60-showcase.js"     "5ec7ce4a1f0d1043"
run_visual_case "772 batch61 showcase"      "772-batch61-showcase"     "retroarch/conformance/772-batch61-showcase.js"     "b9236962f90f60cc"
run_visual_case "783 batch62 showcase"      "783-batch62-showcase"     "retroarch/conformance/783-batch62-showcase.js"     "99e1214edce68aaa"
run_visual_case "784 physics2d"            "784-physics2d"            "retroarch/conformance/784-physics2d.js"            "f0e2ce75a334f327"
run_visual_case "785 splines"              "785-splines"              "retroarch/conformance/785-splines.js"              "1bae1d1802757627"
run_visual_case "786 world labels"         "786-world-labels"         "retroarch/conformance/786-world-labels.js"         "5541adec56346cec"
run_visual_case "787 camera helpers"       "787-camera-helpers"       "retroarch/conformance/787-camera-helpers.js"       "a272b9e331aadb33"
run_visual_case "794 batch63 showcase"     "794-batch63-showcase"     "retroarch/conformance/794-batch63-showcase.js"     "fa9f3a47fba6f02a"
run_visual_case "805 batch64 showcase"     "805-batch64-showcase"     "retroarch/conformance/805-batch64-showcase.js"     "93822bc5717d158d"
run_visual_case "816 batch65 showcase"     "816-batch65-showcase"     "retroarch/conformance/816-batch65-showcase.js"     "8bda3f6966c5108c"
run_visual_case "827 batch66 showcase"     "827-batch66-showcase"     "retroarch/conformance/827-batch66-showcase.js"     "9edeb2dcd3a0d9aa"
run_visual_case "788 camera path"          "788-camera-path"          "retroarch/conformance/788-camera-path.js"          "8d262bc78d28e0d6"
run_visual_case "838 batch67 showcase"     "838-batch67-showcase"     "retroarch/conformance/838-batch67-showcase.js"     "551d57aa0d99257e"
run_visual_case "789 mesh follower"        "789-mesh-follower"        "retroarch/conformance/789-mesh-follower.js"        "25cb13bd7dfed650"
run_visual_case "849 batch68 showcase"     "849-batch68-showcase"     "retroarch/conformance/849-batch68-showcase.js"     "a22d6d6a074303ec"
run_visual_case "790 trail2d"              "790-trail2d"              "retroarch/conformance/790-trail2d.js"              "6d94b6c95a60d64b"
run_visual_case "860 batch69 showcase"     "860-batch69-showcase"     "retroarch/conformance/860-batch69-showcase.js"     "d24f748da86c2f6e"
run_visual_case "791 mesh flash"           "791-mesh-flash"           "retroarch/conformance/791-mesh-flash.js"           "7ff7c78c720d68c0"
run_visual_case "871 batch70 showcase"     "871-batch70-showcase"     "retroarch/conformance/871-batch70-showcase.js"     "d3a8b864a1d1fc09"
run_visual_case "792 color ramp"           "792-color-ramp"           "retroarch/conformance/792-color-ramp.js"           "c516f247a1aa12fc"
run_visual_case "882 batch71 showcase"     "882-batch71-showcase"     "retroarch/conformance/882-batch71-showcase.js"     "a3ab2a4d8b20cabd"
run_visual_case "793 screen wipe"          "793-screen-wipe"          "retroarch/conformance/793-screen-wipe.js"          "fab09443b66a7b96"
run_visual_case "893 batch72 showcase"     "893-batch72-showcase"     "retroarch/conformance/893-batch72-showcase.js"     "fdc011cc58c3e1b3"
run_visual_case "795 gauge"                "795-gauge"                "retroarch/conformance/795-gauge.js"                "082c2872e114140c"
run_visual_case "904 batch73 showcase"     "904-batch73-showcase"     "retroarch/conformance/904-batch73-showcase.js"     "7bb798c222f58a73"
run_visual_case "796 typewriter"           "796-typewriter"           "retroarch/conformance/796-typewriter.js"           "a2196c812127aace"
run_visual_case "915 batch74 showcase"     "915-batch74-showcase"     "retroarch/conformance/915-batch74-showcase.js"     "ef6753d5cd17e98c"
run_visual_case "797 counter"              "797-counter"              "retroarch/conformance/797-counter.js"              "d764ad793d5b2abd"
run_visual_case "926 batch75 showcase"     "926-batch75-showcase"     "retroarch/conformance/926-batch75-showcase.js"     "857eb80229d18cc7"
run_visual_case "798 bullet pool"          "798-bullet-pool"          "retroarch/conformance/798-bullet-pool.js"          "7e5f318bdcb065e3"
run_visual_case "937 batch76 showcase"     "937-batch76-showcase"     "retroarch/conformance/937-batch76-showcase.js"     "a4eb0dccde4b67ea"
run_visual_case "799 hp bar"               "799-hp-bar"               "retroarch/conformance/799-hp-bar.js"               "25c0537f30c61323"
run_visual_case "948 batch77 showcase"     "948-batch77-showcase"     "retroarch/conformance/948-batch77-showcase.js"     "e7a838f39a2c9db8"
run_visual_case "800 starfield"            "800-starfield"            "retroarch/conformance/800-starfield.js"            "e9bbd58fff2bee3e"
run_visual_case "959 batch78 showcase"     "959-batch78-showcase"     "retroarch/conformance/959-batch78-showcase.js"     "e46339bfe60c938c"
run_visual_case "801 inventory"            "801-inventory"            "retroarch/conformance/801-inventory.js"            "49a9d2c02da8cc91"
run_visual_case "970 batch79 showcase"     "970-batch79-showcase"     "retroarch/conformance/970-batch79-showcase.js"     "6e0df3ac3de9bb76"
run_visual_case "802 dialogue"             "802-dialogue"             "retroarch/conformance/802-dialogue.js"             "b06bcbb8f3cab85f"
run_visual_case "981 batch80 showcase"     "981-batch80-showcase"     "retroarch/conformance/981-batch80-showcase.js"     "f5a45add2c20b39c"
run_visual_case "803 toast"                "803-toast"                "retroarch/conformance/803-toast.js"                "3b60b3af46d271de"
run_visual_case "992 batch81 showcase"     "992-batch81-showcase"     "retroarch/conformance/992-batch81-showcase.js"     "744b3464ce2aa5b3"
run_visual_case "804 combo"                "804-combo"                "retroarch/conformance/804-combo.js"                "2a16ea080650e9c6"
run_visual_case "1003 batch82 showcase"    "1003-batch82-showcase"    "retroarch/conformance/1003-batch82-showcase.js"    "949735ff6e09187e"
run_visual_case "805 bar"                  "805-bar"                  "retroarch/conformance/805-bar.js"                  "3a6b6251f322559d"
run_visual_case "1014 batch83 showcase"    "1014-batch83-showcase"    "retroarch/conformance/1014-batch83-showcase.js"    "b542184345bb29bf"
run_visual_case "806 glow"                 "806-glow"                 "retroarch/conformance/806-glow.js"                 "d7af007fb151405e"
run_visual_case "1025 batch84 showcase"    "1025-batch84-showcase"    "retroarch/conformance/1025-batch84-showcase.js"    "4828fe3b3562ddc3"
run_visual_case "807 burst"                "807-burst"                "retroarch/conformance/807-burst.js"                "c08e994a2aa6cb9f"
run_visual_case "1036 batch85 showcase"    "1036-batch85-showcase"    "retroarch/conformance/1036-batch85-showcase.js"    "2ca61a3919d1c31a"
run_visual_case "808 textfx"               "808-textfx"               "retroarch/conformance/808-textfx.js"               "5cfd1cbd90b7da09"
run_visual_case "1047 batch86 showcase"    "1047-batch86-showcase"    "retroarch/conformance/1047-batch86-showcase.js"    "496ae9b8f17dcd5d"
run_visual_case "809 speechbubble"         "809-speechbubble"         "retroarch/conformance/809-speechbubble.js"         "05d51583d0fd925e"
run_visual_case "1058 batch87 showcase"    "1058-batch87-showcase"    "retroarch/conformance/1058-batch87-showcase.js"    "03dd0251ac29fb35"
run_visual_case "810 smoothcam"            "810-smoothcam"            "retroarch/conformance/810-smoothcam.js"            "bade1a0148d36612"
run_visual_case "1069 batch88 showcase"    "1069-batch88-showcase"    "retroarch/conformance/1069-batch88-showcase.js"    "73929c49b0affe33"
run_visual_case "811 spotlight"            "811-spotlight"            "retroarch/conformance/811-spotlight.js"            "97f772b65122851c"
run_visual_case "1080 batch89 showcase"    "1080-batch89-showcase"    "retroarch/conformance/1080-batch89-showcase.js"    "efb2c3af72bca999"
run_visual_case "812 wavemgr"              "812-wavemgr"              "retroarch/conformance/812-wavemgr.js"              "362831a6bf8cf9b4"
run_visual_case "813 tight text"           "813-tight-text"           "retroarch/conformance/813-tight-text.js"           "0941661bd8f54b16"
run_visual_case "814 glow text scale"      "814-glow-text-scale"      "retroarch/conformance/814-glow-text-scale.js"      "6d22128444356212"
run_visual_case "815 draw namespace textfx" "815-draw-namespace-textfx" "retroarch/conformance/815-draw-namespace-textfx.js" "c1913cd545eb788f"
run_visual_case "1091 batch90 showcase"    "1091-batch90-showcase"    "retroarch/conformance/1091-batch90-showcase.js"    "6b598704e72fafdc"
run_visual_case "1092 scaled text"         "1092-scaled-text"         "retroarch/conformance/1092-scaled-text.js"         "305d05942969cdcd"

echo "Conformance passed."
