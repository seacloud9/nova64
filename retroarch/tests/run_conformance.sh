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
run_visual_case "106 render target"   "106-render-target"   "retroarch/conformance/106-render-target.js"       "44044eca0be4f87f"
run_visual_case "107 instanced mesh"  "107-instanced-mesh"  "retroarch/conformance/107-instanced-mesh.js"      "4fd99c7a95f90255"
run_visual_case "108 skybox"          "108-skybox"          "${PACKAGE_DIR}/skybox.nova"                        "38f18480f256541a"
run_visual_case "109 blend modes"     "109-blend-modes"     "retroarch/conformance/109-blend-modes.js"          "fa453f7b8dbaf14d"
NOVA64_SAVE_DIR="${SAVE_DIR}" run_case "110 storage compressed" "retroarch/conformance/110-storage-compressed.js" "8845ba9c4e550a4b"
run_visual_case "111 noise"           "111-noise"           "retroarch/conformance/111-noise.js"                "4847bd983f0c57e0"
run_visual_case "112 particles 2d"   "112-particles2d"     "retroarch/conformance/112-particles2d.js"          "184ec762e5008344"

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
run_gles_case "106 render target"     "106-render-target"      "retroarch/conformance/106-render-target.js"      "f05b3c17d784bd72"
run_gles_case "107 instanced mesh"    "107-instanced-mesh"     "retroarch/conformance/107-instanced-mesh.js"     "f01a0e0dc49c9e0e"
run_gles_case "108 skybox"            "108-skybox"             "${PACKAGE_DIR}/skybox.nova"                      "a4ad0833d5acff46"
run_gles_case "109 blend modes"       "109-blend-modes"        "retroarch/conformance/109-blend-modes.js"        "92a54db75fa95ea1"

run_visual_case "113 math utils"    "113-math-utils"    "retroarch/conformance/113-math-utils.js"    "00d37dc756a875d0"
run_visual_case "114 camera orbit"  "114-camera-orbit"  "retroarch/conformance/114-camera-orbit.js"  "700cde1a721f5d04"
run_visual_case "115 camera shake"  "115-camera-shake"  "retroarch/conformance/115-camera-shake.js"  "9aaa5169a1fccf9f"
run_visual_case "116 tweens"        "116-tweens"        "retroarch/conformance/116-tweens.js"        "207a23c0db80b5f2"
run_visual_case "117 spr transform" "117-spr-transform" "retroarch/conformance/117-spr-transform.js" "ef5eefc1c8114453"
run_visual_case "118 path draw"     "118-path-draw"     "retroarch/conformance/118-path-draw.js"     "d23b07ee034d6e57"
run_visual_case "119 screen flash"  "119-screen-flash"  "retroarch/conformance/119-screen-flash.js"  "d47c00d3fed78dbc"
run_visual_case "120 color hsv"     "120-color-hsv"     "retroarch/conformance/120-color-hsv.js"     "66e6a074cdcc7d74"
run_visual_case "121 draw fill poly" "121-draw-fill-poly" "retroarch/conformance/121-draw-fill-poly.js" "bb89cb3322b46dcb"
run_visual_case "122 screen pixelate" "122-screen-pixelate" "retroarch/conformance/122-screen-pixelate.js" "2544efee1fe138ef"
run_visual_case "123 text box"      "123-text-box"      "retroarch/conformance/123-text-box.js"      "2926263c73799bac"
run_visual_case "124 arc"           "124-arc"           "retroarch/conformance/124-arc.js"           "f0aa02a5dada96ff"
run_visual_case "125 spline"        "125-spline"        "retroarch/conformance/125-spline.js"        "96e28181a5705f48"
run_visual_case "126 color lerp2d"  "126-color-lerp2d"  "retroarch/conformance/126-color-lerp2d.js"  "5a1a7dd34eca9313"
run_visual_case "127 stamp text"    "127-stamp-text"    "retroarch/conformance/127-stamp-text.js"    "158b69c572d1f8e4"
run_visual_case "128 timers"        "128-timers"        "retroarch/conformance/128-timers.js"        "9b3c11980dd22361"
run_visual_case "129 grid"          "129-grid"          "retroarch/conformance/129-grid.js"          "bd89f08e64c79c8c"
run_visual_case "130 measure text"  "130-measure-text"  "retroarch/conformance/130-measure-text.js"  "de2a65891af55681"
run_visual_case "131 pixels print right" "131-pixels-print-right" "retroarch/conformance/131-pixels-print-right.js" "12d34e344a273c53"
run_visual_case "132 screen blur"   "132-screen-blur"   "retroarch/conformance/132-screen-blur.js"   "460220c63c35fc1d"
run_visual_case "133 canvas"        "133-canvas"        "retroarch/conformance/133-canvas.js"        "cb823500597436f8"
run_visual_case "134 nine slice"    "134-nine-slice"    "retroarch/conformance/134-nine-slice.js"    "6866435d8d75ceef"

run_visual_case "135 tilemap getters"      "135-tilemap-getters"      "retroarch/conformance/135-tilemap-getters.js"      "6567f5e36838809f"
run_visual_case "136 btn repeat"           "136-btn-repeat"           "retroarch/conformance/136-btn-repeat.js"           "ef95620d2e70e8a2"
run_visual_case "137 str utils"            "137-str-utils"            "retroarch/conformance/137-str-utils.js"            "4c5f365ce5ebeaaf"
run_visual_case "138 hotspots"             "138-hotspots"             "retroarch/conformance/138-hotspots.js"             "bf65c07646f33cd1"
run_visual_case "139 chromatic aberration" "139-chromatic-aberration" "retroarch/conformance/139-chromatic-aberration.js" "2c3ed453ce593223"
run_visual_case "140 dashed lines"         "140-dashed-lines"         "retroarch/conformance/140-dashed-lines.js"         "4dc213673bbd763b"
run_visual_case "141 screen wave"          "141-screen-wave"          "retroarch/conformance/141-screen-wave.js"          "aa1d9dc4f4bccc2b"
run_visual_case "142 frame utils"          "142-frame-utils"          "retroarch/conformance/142-frame-utils.js"          "a4d463bb8e715300"
run_visual_case "143 color utils"          "143-color-utils"          "retroarch/conformance/143-color-utils.js"          "cbcdd87f2736def5"
run_visual_case "144 screen dissolve"      "144-screen-dissolve"      "retroarch/conformance/144-screen-dissolve.js"      "80a99081fa353431"
run_visual_case "145 number format"        "145-number-format"        "retroarch/conformance/145-number-format.js"        "106bfc58765e3b24"
run_visual_case "146 spr flip"             "146-spr-flip"             "retroarch/conformance/146-spr-flip.js"             "c4a83a0fcefc6501"

run_visual_case "147 scroll text"       "147-scroll-text"       "retroarch/conformance/147-scroll-text.js"       "7bef7ffc086ec71f"
run_visual_case "148 bit ops"           "148-bit-ops"           "retroarch/conformance/148-bit-ops.js"           "6393c327b7d2f640"
run_visual_case "149 print lines"       "149-print-lines"       "retroarch/conformance/149-print-lines.js"       "df728746c0750fe8"
run_visual_case "150 pattern fills"     "150-pattern-fills"     "retroarch/conformance/150-pattern-fills.js"     "2a32759d86eb8f23"
run_visual_case "151 circle gradient"   "151-circle-gradient"   "retroarch/conformance/151-circle-gradient.js"   "4f1ddb6468bfc546"
run_visual_case "152 easing"            "152-easing"            "retroarch/conformance/152-easing.js"            "d76eab00cb11122d"
run_visual_case "153 color hex"         "153-color-hex"         "retroarch/conformance/153-color-hex.js"         "6d8edcf039a63815"
run_visual_case "154 screen border"     "154-screen-border"     "retroarch/conformance/154-screen-border.js"     "226d059fa15c0320"
run_visual_case "155 spr scale"         "155-spr-scale"         "retroarch/conformance/155-spr-scale.js"         "931cc8bb705ff224"
run_visual_case "156 format time"       "156-format-time"       "retroarch/conformance/156-format-time.js"       "fd5d19929439db24"
run_visual_case "157 draw arrow"        "157-draw-arrow"        "retroarch/conformance/157-draw-arrow.js"        "1b2beec67eec3c5c"
run_visual_case "158 color pulse"       "158-color-pulse"       "retroarch/conformance/158-color-pulse.js"       "7393c430d41f8d1a"
run_visual_case "159 create anim"   "159-create-anim"   "retroarch/conformance/159-create-anim.js"   "fc9083b50c14aa9f"
run_visual_case "160 float text"    "160-float-text"    "retroarch/conformance/160-float-text.js"    "38e06acb1ca93877"
run_visual_case "161 dialog"        "161-dialog"        "retroarch/conformance/161-dialog.js"        "99da9011e3aafd25"
run_visual_case "162 fsm"           "162-fsm"           "retroarch/conformance/162-fsm.js"           "d3a567c3d719aff7"
run_visual_case "163 vstick"        "163-vstick"        "retroarch/conformance/163-vstick.js"        "3585819a812fc8ef"
run_visual_case "164 seeded rng"    "164-seeded-rng"    "retroarch/conformance/164-seeded-rng.js"    "1339be7d444e052c"
run_visual_case "165 draw grid"     "165-draw-grid"     "retroarch/conformance/165-draw-grid.js"     "bafeb6c9bbd62149"
run_visual_case "166 math globals"  "166-math-globals"  "retroarch/conformance/166-math-globals.js"  "e5ed66f27db1827b"
run_visual_case "167 screen mosaic" "167-screen-mosaic" "retroarch/conformance/167-screen-mosaic.js" "ef81f266c324aa47"
run_visual_case "168 color inspect" "168-color-inspect" "retroarch/conformance/168-color-inspect.js" "b4459211b89d14da"
run_visual_case "169 star burst"    "169-star-burst"    "retroarch/conformance/169-star-burst.js"    "66a67c79aca4a6bd"
run_visual_case "170 color maps"    "170-color-maps"    "retroarch/conformance/170-color-maps.js"    "40bfbc6f14e73c45"
run_visual_case "171 draw bezier"      "171-draw-bezier"      "retroarch/conformance/171-draw-bezier.js"      "e48f249c44f6100d"
run_visual_case "172 polyline"         "172-polyline"         "retroarch/conformance/172-polyline.js"         "69c2e1db96f1047c"
run_visual_case "173 print wrap"       "173-print-wrap"       "retroarch/conformance/173-print-wrap.js"       "15b508d927d1adf4"
run_visual_case "174 math helpers"     "174-math-helpers"     "retroarch/conformance/174-math-helpers.js"     "877cde8d3e10fef4"
run_visual_case "175 geometry tests"   "175-geometry-tests"   "retroarch/conformance/175-geometry-tests.js"   "7c3a64d0d15e7e81"
run_visual_case "176 color blend mode" "176-color-blend-mode" "retroarch/conformance/176-color-blend-mode.js" "9d8e4ac820cd90b4"
run_visual_case "177 flood fill"       "177-flood-fill"       "retroarch/conformance/177-flood-fill.js"       "11d605e9ba329901"
run_visual_case "178 str utils 2"      "178-str-utils2"       "retroarch/conformance/178-str-utils2.js"       "832fdc2c59fa25cb"
run_visual_case "179 angle helpers"    "179-angle-helpers"    "retroarch/conformance/179-angle-helpers.js"    "4cf1dd083668818b"
run_visual_case "180 vec2"             "180-vec2"             "retroarch/conformance/180-vec2.js"             "3906a7f26c289928"
run_visual_case "181 draw arc"         "181-draw-arc"         "retroarch/conformance/181-draw-arc.js"         "7007168b2922b738"
run_visual_case "182 curves showcase"  "182-curves-showcase"  "retroarch/conformance/182-curves-showcase.js"  "27be06a6e66a936f"
run_visual_case "183 cubic bezier"     "183-cubic-bezier"     "retroarch/conformance/183-cubic-bezier.js"     "70eb50514aa2f43d"
run_visual_case "184 spline point"     "184-spline-point"     "retroarch/conformance/184-spline-point.js"     "3ffe20671eaade4b"
run_visual_case "185 hex grid"         "185-hex-grid"         "retroarch/conformance/185-hex-grid.js"         "f79854454db18de0"
run_visual_case "186 draw graph"       "186-draw-graph"       "retroarch/conformance/186-draw-graph.js"       "5313917a4aba8a15"
run_visual_case "187 color saturation" "187-color-saturation" "retroarch/conformance/187-color-saturation.js" "b7dde5e17da1bccf"
run_visual_case "188 waveform plot"    "188-waveform-plot"    "retroarch/conformance/188-waveform-plot.js"    "e850a4a820a0dc8a"
run_visual_case "189 char utils"       "189-char-utils"       "retroarch/conformance/189-char-utils.js"       "a6c75f054396327c"
run_visual_case "190 print bold"       "190-print-bold"       "retroarch/conformance/190-print-bold.js"       "ae6d0cb2f9ead7ea"
run_visual_case "191 dot grid"         "191-dot-grid"         "retroarch/conformance/191-dot-grid.js"         "9f93e6e02bfeb06c"
run_visual_case "192 clamp color"      "192-clamp-color"      "retroarch/conformance/192-clamp-color.js"      "5eb0d16908ebc781"
run_visual_case "193 batch11 showcase" "193-batch11-showcase" "retroarch/conformance/193-batch11-showcase.js" "23daf7f5c186fce1"
run_visual_case "194 spline showcase"  "194-spline-showcase"  "retroarch/conformance/194-spline-showcase.js"  "f18b774715f78bb0"
run_visual_case "195 print italic"     "195-print-italic"     "retroarch/conformance/195-print-italic.js"     "954b3f7bb86f3aea"
run_visual_case "196 print underline"  "196-print-underline"  "retroarch/conformance/196-print-underline.js"  "202d0bf55ac0df29"
run_visual_case "197 progress bar"     "197-progress-bar"     "retroarch/conformance/197-progress-bar.js"     "9eb2fa59ac1a6b3c"
run_visual_case "198 grid snap"        "198-grid-snap"        "retroarch/conformance/198-grid-snap.js"        "9b06bcd53583a42b"
run_visual_case "199 color matrix"     "199-color-matrix"     "retroarch/conformance/199-color-matrix.js"     "c622ca926a885d0b"
run_visual_case "200 neon glow"        "200-neon-glow"        "retroarch/conformance/200-neon-glow.js"        "392520dbc72c0887"
run_visual_case "201 bar chart"        "201-bar-chart"        "retroarch/conformance/201-bar-chart.js"        "674d637a2a612609"
run_visual_case "202 str format"       "202-str-format"       "retroarch/conformance/202-str-format.js"       "24d655b314d58a9c"
run_visual_case "203 color mix3"       "203-color-mix3"       "retroarch/conformance/203-color-mix3.js"       "5728c1f0549ae783"
run_visual_case "204 draw noise"       "204-draw-noise"       "retroarch/conformance/204-draw-noise.js"       "8968f4e2bef0f959"
run_visual_case "205 batch12 showcase" "205-batch12-showcase" "retroarch/conformance/205-batch12-showcase.js" "5c294f39c2cd6be6"
run_visual_case "206 color matrix fx"  "206-color-matrix-fx"  "retroarch/conformance/206-color-matrix-effects.js" "b31b0c5e4ffbe66c"
run_visual_case "207 color with alpha"  "207-color-with-alpha"  "retroarch/conformance/207-color-with-alpha.js"  "e7bf8df7f32bc081"
run_visual_case "208 draw capsule"      "208-draw-capsule"      "retroarch/conformance/208-draw-capsule.js"      "2c80afb37b857862"
run_visual_case "209 fill capsule"      "209-fill-capsule"      "retroarch/conformance/209-fill-capsule.js"      "50d89a01fbcadacd"
run_visual_case "210 draw ring"         "210-draw-ring"         "retroarch/conformance/210-draw-ring.js"         "69366f0c5fcf9d3f"
run_visual_case "211 blur region"       "211-blur-region"       "retroarch/conformance/211-blur-region.js"       "6e3f5bb1e966c433"
run_visual_case "212 gradient line"     "212-draw-gradient-line" "retroarch/conformance/212-draw-gradient-line.js" "6eede2f08c254347"
run_visual_case "213 color contrast"    "213-color-contrast"    "retroarch/conformance/213-color-contrast.js"    "1b93214f04ab8c05"
run_visual_case "214 pixelate region"   "214-pixelate-region"   "retroarch/conformance/214-pixelate-region.js"   "b4e1d686dc3d006e"
run_visual_case "215 fill plus"         "215-fill-plus"         "retroarch/conformance/215-fill-plus.js"         "5ed9dada6279b31d"
run_visual_case "216 text vertical"     "216-draw-text-vertical" "retroarch/conformance/216-draw-text-vertical.js" "8ed50218f3c12270"
run_visual_case "217 draw star"         "217-draw-star"         "retroarch/conformance/217-draw-star.js"         "c67a5215dd98714e"
run_visual_case "218 batch13 showcase"  "218-batch13-showcase"  "retroarch/conformance/218-batch13-showcase.js"  "17ff32843fb39ce9"
run_visual_case "219 color shift"       "219-color-shift"       "retroarch/conformance/219-color-shift.js"       "ff88da0d2b73660f"
run_visual_case "220 color luminance"   "220-color-luminance"   "retroarch/conformance/220-color-luminance.js"   "3915d5198e07e3e6"
run_visual_case "221 ease back sine"    "221-ease-back-sine"    "retroarch/conformance/221-ease-back-sine.js"    "14cd9255661cdb0f"
run_visual_case "222 hex cell"          "222-hex-cell"          "retroarch/conformance/222-hex-cell.js"          "1236c2a519b623bb"
run_visual_case "223 x mark"            "223-x-mark"            "retroarch/conformance/223-x-mark.js"            "eeadfb97919d38b2"
run_visual_case "224 draw chevron"      "224-draw-chevron"      "retroarch/conformance/224-draw-chevron.js"      "5e258d1f641b14b2"
run_visual_case "225 color sepia"       "225-color-sepia"       "retroarch/conformance/225-color-sepia.js"       "3d4944ce13d600a7"
run_visual_case "226 color vibrance"    "226-color-vibrance"    "retroarch/conformance/226-color-vibrance.js"    "43478185a559dd20"
run_visual_case "227 screen hsv"        "227-screen-hsv"        "retroarch/conformance/227-screen-hsv.js"        "358a9236aba04bf9"
run_visual_case "228 batch14 showcase"  "228-batch14-showcase"  "retroarch/conformance/228-batch14-showcase.js"  "2ed4922513d0afb2"
run_visual_case "229 copy pixels"       "229-copy-pixels"       "retroarch/conformance/229-copy-pixels.js"       "0cd4aba1e513eade"
run_visual_case "230 color add rgb"     "230-color-add-rgb"     "retroarch/conformance/230-color-add-rgb.js"     "1f81e8631a6a9584"
run_visual_case "231 lozenge"           "231-lozenge"           "retroarch/conformance/231-lozenge.js"           "1561e6b2754ef4cd"
run_visual_case "232 draw spiral"       "232-draw-spiral"       "retroarch/conformance/232-draw-spiral.js"       "067c66e72d2d56ee"
run_visual_case "233 color warm cool"   "233-color-warm-cool"   "retroarch/conformance/233-color-warm-cool.js"   "fd48ff52fcab888d"
run_visual_case "234 ease expo power"   "234-ease-expo-power"   "retroarch/conformance/234-ease-expo-power.js"   "62cdb647aee4b213"
run_visual_case "235 fill tri gradient" "235-fill-tri-gradient" "retroarch/conformance/235-fill-tri-gradient.js" "c2d283d2258430d7"
run_visual_case "236 invert region"     "236-invert-region"     "retroarch/conformance/236-invert-region.js"     "8024892e5c98cead"
run_visual_case "237 screen retro"      "237-screen-retro"      "retroarch/conformance/237-screen-retro.js"      "c2463015dc011755"
run_visual_case "238 batch15 showcase"  "238-batch15-showcase"  "retroarch/conformance/238-batch15-showcase.js"  "4f3e249dea234e74"
run_visual_case "239 draw thick line"    "239-draw-thick-line"    "retroarch/conformance/239-draw-thick-line.js"    "3816db1e57c86335"
run_visual_case "240 draw arrow filled"  "240-draw-arrow-filled"  "retroarch/conformance/240-draw-arrow-filled.js"  "d796cb3dcadd2e3d"
run_visual_case "241 draw check"         "241-draw-check"         "retroarch/conformance/241-draw-check.js"         "4df6fee21edfb40f"
run_visual_case "242 wave functions"     "242-wave-functions"     "retroarch/conformance/242-wave-functions.js"     "e96d90095d11b7b7"
run_visual_case "243 screen filters"     "243-screen-filters"     "retroarch/conformance/243-screen-filters.js"     "2b8c7ed12a35577d"
run_visual_case "244 draw cloud"         "244-draw-cloud"         "retroarch/conformance/244-draw-cloud.js"         "052be8b39773e579"
run_visual_case "245 screen night vision" "245-screen-night-vision" "retroarch/conformance/245-screen-night-vision.js" "0485d33c02ccd71b"
run_visual_case "246 color from hsl"     "246-color-from-hsl"     "retroarch/conformance/246-color-from-hsl.js"     "5a615f3d98fd5846"
run_visual_case "247 batch16 showcase"   "247-batch16-showcase"   "retroarch/conformance/247-batch16-showcase.js"   "44ade16f54350a4b"
run_visual_case "248 reflect rotate"    "248-reflect-rotate-vector" "retroarch/conformance/248-reflect-rotate-vector.js" "9ea634ee12cd8300"
run_visual_case "249 color blend modes" "249-color-blend-modes"  "retroarch/conformance/249-color-blend-modes.js"     "5ea294e3de76c511"
run_visual_case "250 trig helpers"      "250-trig-helpers"       "retroarch/conformance/250-trig-helpers.js"          "d340ba0ca0906d4e"
run_visual_case "251 screen glow"       "251-screen-glow"        "retroarch/conformance/251-screen-glow.js"           "9f125e222275afc1"
run_visual_case "252 draw ruler"        "252-draw-ruler"         "retroarch/conformance/252-draw-ruler.js"            "cacf931e7c320da4"
run_visual_case "259 batch17 showcase"  "259-batch17-showcase"   "retroarch/conformance/259-batch17-showcase.js"      "2bb81b13794cdc7c"
run_visual_case "260 vec from angle"       "260-vec-from-angle"   "retroarch/conformance/260-vec-from-angle.js"   "2184e2cf3a068d0d"
run_visual_case "261 draw trail"           "261-draw-trail"       "retroarch/conformance/261-draw-trail.js"       "4802319c297ee779"
run_visual_case "262 color dodge burn"     "262-color-dodge-burn" "retroarch/conformance/262-color-dodge-burn.js" "03e7def95720e1c9"
run_visual_case "263 radial gradient"      "263-radial-gradient"  "retroarch/conformance/263-radial-gradient.js"  "a2f0018c5639d5f0"
run_visual_case "264 screen crt oil"       "264-screen-crt-oil"   "retroarch/conformance/264-screen-crt-oil.js"   "1640e81536d979cf"
run_visual_case "265 draw gear"            "265-draw-gear"        "retroarch/conformance/265-draw-gear.js"        "6ecad55c69626bcf"
run_visual_case "271 batch18 showcase"     "271-batch18-showcase" "retroarch/conformance/271-batch18-showcase.js" "7e31b8c432a65316"
run_visual_case "272 color lighten darken" "272-color-lighten-darken" "retroarch/conformance/272-color-lighten-darken.js" "b328b4a129b215dc"
run_visual_case "273 screen brightness"    "273-screen-brightness"    "retroarch/conformance/273-screen-brightness.js"    "b7044cbac57e1b9a"
run_visual_case "274 wave draw"            "274-wave-draw"            "retroarch/conformance/274-wave-draw.js"            "bf8208cc0c90ba5b"
run_visual_case "275 bubble connector"     "275-bubble-connector"     "retroarch/conformance/275-bubble-connector.js"     "17b2e6120412c252"
run_visual_case "283 batch19 showcase"     "283-batch19-showcase"     "retroarch/conformance/283-batch19-showcase.js"     "4a1e01e69489a958"
run_visual_case "284 target spider"     "284-target-spider"     "retroarch/conformance/284-target-spider.js"     "76564a87e90dff2e"
run_visual_case "285 brick wave flame"  "285-brick-wave-flame"  "retroarch/conformance/285-brick-wave-flame.js"  "77260fcf0abb591e"
run_visual_case "286 color lab zoom"    "286-color-lab-zoom"    "retroarch/conformance/286-color-lab-zoom.js"    "07eaad071349141f"
run_visual_case "287 dot line"          "287-dot-line"          "retroarch/conformance/287-dot-line.js"          "88deebe6a1334fb3"
run_visual_case "295 batch20 showcase"  "295-batch20-showcase"  "retroarch/conformance/295-batch20-showcase.js"  "3a0d515e3c49acd2"
run_visual_case "296 nested rects"            "296-nested-rects"            "retroarch/conformance/296-nested-rects.js"            "e41e7f26442bf10f"
run_visual_case "297 parallelogram trapezoid" "297-parallelogram-trapezoid" "retroarch/conformance/297-parallelogram-trapezoid.js" "a798c1b71a8df5c4"
run_visual_case "298 concentric checker"      "298-concentric-checker"      "retroarch/conformance/298-concentric-checker.js"      "6ede4f1126b019cd"
run_visual_case "299 neon duotone"            "299-neon-duotone"            "retroarch/conformance/299-neon-duotone.js"            "f499ee0c080f180e"
run_visual_case "307 batch21 showcase"        "307-batch21-showcase"        "retroarch/conformance/307-batch21-showcase.js"        "564a81e91af5818b"
run_visual_case "308 distance intersect"  "308-distance-intersect"  "retroarch/conformance/308-distance-intersect.js"  "5610b76c00b65abc"
run_visual_case "309 pentagram"           "309-pentagram"           "retroarch/conformance/309-pentagram.js"           "56050cfe84bfb3da"
run_visual_case "310 crescent"            "310-crescent"            "retroarch/conformance/310-crescent.js"            "041bcaef69df0c3d"
run_visual_case "311 bloom complement"    "311-bloom-complement"    "retroarch/conformance/311-bloom-complement.js"    "aeaa67a414ebaf81"
run_visual_case "312 bit utils"           "312-bit-utils"           "retroarch/conformance/312-bit-utils.js"           "bc9f12b61b92f8c8"
run_visual_case "319 batch22 showcase"    "319-batch22-showcase"    "retroarch/conformance/319-batch22-showcase.js"    "c27db12c2e47d8af"
run_visual_case "320 lerp2d color utils"  "320-lerp2d-color-utils"  "retroarch/conformance/320-lerp2d-color-utils.js"  "25ba54cab2602476"
run_visual_case "321 comet"               "321-comet"               "retroarch/conformance/321-comet.js"               "dc9ecdc37517064c"
run_visual_case "322 rainbow helix"       "322-rainbow-helix"       "retroarch/conformance/322-rainbow-helix.js"       "8bcb86f5e300d153"
run_visual_case "323 progress spiral wave" "323-progress-spiral-wave" "retroarch/conformance/323-progress-spiral-wave.js" "7897af39e548093a"
run_visual_case "324 dither glow"         "324-dither-glow"         "retroarch/conformance/324-dither-glow.js"         "ba4e4f0a7b43893d"
run_visual_case "331 batch23 showcase"    "331-batch23-showcase"    "retroarch/conformance/331-batch23-showcase.js"    "131e01f03670feed"
run_visual_case "332 dna vortex"          "332-dna-vortex"          "retroarch/conformance/332-dna-vortex.js"          "e20a393e52081586"
run_visual_case "333 mandala halftone"    "333-mandala-halftone"    "retroarch/conformance/333-mandala-halftone.js"    "629f7c3c9e6e036c"
run_visual_case "334 label tag cloud"     "334-label-tag-cloud"     "retroarch/conformance/334-label-tag-cloud.js"     "d0b4862e236fccf0"
run_visual_case "335 noise wheel pulse"   "335-noise-wheel-pulse"   "retroarch/conformance/335-noise-wheel-pulse.js"   "cc19097ff0641c14"
run_visual_case "343 batch24 showcase"    "343-batch24-showcase"    "retroarch/conformance/343-batch24-showcase.js"    "031c51cb25102734"
run_visual_case "344 explosion lightning" "344-explosion-lightning" "retroarch/conformance/344-explosion-lightning.js" "7d90857c26061106"
run_visual_case "345 hex tri grid"        "345-hex-tri-grid"        "retroarch/conformance/345-hex-tri-grid.js"        "00ae8e57cd10d0f4"
run_visual_case "346 border sobel"        "346-border-sobel"        "retroarch/conformance/346-border-sobel.js"        "096de02deb34ad8e"
run_visual_case "347 color shift diamond" "347-color-shift-diamond" "retroarch/conformance/347-color-shift-diamond.js" "8b316a00a6609123"
run_visual_case "355 batch25 showcase"    "355-batch25-showcase"    "retroarch/conformance/355-batch25-showcase.js"    "34a87fefe76b57ab"
run_visual_case "356 star2 rosette"       "356-star2-rosette"       "retroarch/conformance/356-star2-rosette.js"       "80861c643af9dcbc"
run_visual_case "357 fractal tree"        "357-fractal-tree"        "retroarch/conformance/357-fractal-tree.js"        "f8188da0d8a775af"
run_visual_case "358 screen flip thermal" "358-screen-flip-thermal" "retroarch/conformance/358-screen-flip-thermal.js" "e14e417db68c0441"
run_visual_case "359 color fade arrow"    "359-color-fade-arrow"    "retroarch/conformance/359-color-fade-arrow.js"    "ad5c8b647aaffb04"
run_visual_case "367 batch26 showcase"    "367-batch26-showcase"    "retroarch/conformance/367-batch26-showcase.js"    "25f6b4b1a49b82ca"
run_visual_case "368 sweep lissajous"     "368-sweep-lissajous"     "retroarch/conformance/368-sweep-lissajous.js"     "6e3fb3794d927051"
run_visual_case "369 ellipse arc starburst" "369-ellipse-arc-starburst" "retroarch/conformance/369-ellipse-arc-starburst.js" "dd47733674ef36a3"
run_visual_case "370 sepia hex ease"      "370-sepia-hex-ease"      "retroarch/conformance/370-sepia-hex-ease.js"      "170242c6a1bea939"
run_visual_case "379 batch27 showcase"    "379-batch27-showcase"    "retroarch/conformance/379-batch27-showcase.js"    "41fdf827afec38d1"
run_visual_case "380 bezier poly"         "380-bezier-poly"         "retroarch/conformance/380-bezier-poly.js"         "117ae30900f0c31d"
run_visual_case "381 kaleidoscope spoke"  "381-kaleidoscope-spoke"  "retroarch/conformance/381-kaleidoscope-spoke.js"  "8f162ee0737943ba"
run_visual_case "382 pixelate vibrancy"   "382-pixelate-vibrancy-invert" "retroarch/conformance/382-pixelate-vibrancy-invert.js" "6198c48c065ee8c7"
run_visual_case "391 batch28 showcase"    "391-batch28-showcase"    "retroarch/conformance/391-batch28-showcase.js"    "d95589eb9819df0f"
run_visual_case "392 vector math"         "392-vector-math"         "retroarch/conformance/392-vector-math.js"         "ea074a2aa728a4fc"
run_visual_case "393 charts"              "393-charts"              "retroarch/conformance/393-charts.js"              "c7adc9804bef2a14"
run_visual_case "394 fibonacci penrose"   "394-fibonacci-penrose"   "retroarch/conformance/394-fibonacci-penrose.js"   "6683a2ac09402464"
run_visual_case "403 batch29 showcase"    "403-batch29-showcase"    "retroarch/conformance/403-batch29-showcase.js"    "86cceb358d279594"
run_visual_case "404 matrix rain quantize" "404-matrix-rain-quantize" "retroarch/conformance/404-matrix-rain-quantize.js" "41405d5773aee464"
run_visual_case "405 ripple sparkle"       "405-ripple-sparkle"       "retroarch/conformance/405-ripple-sparkle.js"       "17e267a412f775cc"
run_visual_case "406 tilt wirebox"         "406-tilt-wirebox"         "retroarch/conformance/406-tilt-wirebox.js"         "b51387e7e7fb51d0"
run_visual_case "407 crosshatch"           "407-crosshatch"           "retroarch/conformance/407-crosshatch.js"           "1dc5620e64f728cf"
run_visual_case "415 batch30 showcase"     "415-batch30-showcase"     "retroarch/conformance/415-batch30-showcase.js"     "6a783f3ef2c7e9f9"
run_visual_case "416 snowflake venn"       "416-snowflake-venn"       "retroarch/conformance/416-snowflake-venn.js"       "a39fcf048bbeffbb"
run_visual_case "417 pinwheel"             "417-pinwheel"             "retroarch/conformance/417-pinwheel.js"             "daa817b93353d057"
run_visual_case "418 iso tile tunnel"      "418-iso-tile-tunnel"      "retroarch/conformance/418-iso-tile-tunnel.js"      "5171e03cd5ce5941"
run_visual_case "419 bokeh neon"           "419-bokeh-neon"           "retroarch/conformance/419-bokeh-neon.js"           "82784eb69b89ecd8"
run_visual_case "427 batch31 showcase"     "427-batch31-showcase"     "retroarch/conformance/427-batch31-showcase.js"     "400f3323db41f207"
run_visual_case "428 dot grid zigzag"      "428-dot-grid-zigzag"      "retroarch/conformance/428-dot-grid-zigzag.js"      "04795eff2c95133a"
run_visual_case "429 bullseye needle"      "429-bullseye-needle"      "retroarch/conformance/429-bullseye-needle.js"      "440df98a7eb1ed33"
run_visual_case "430 vhs echo cycle"       "430-vhs-echo-cycle"       "retroarch/conformance/430-vhs-echo-cycle.js"       "39176a88a8f79d2b"
run_visual_case "431 conveyor arc arrow"   "431-conveyor-arc-arrow"   "retroarch/conformance/431-conveyor-arc-arrow.js"   "98a3a88d8fbb0cb2"
run_visual_case "439 batch32 showcase"     "439-batch32-showcase"     "retroarch/conformance/439-batch32-showcase.js"     "8adf585f75108d04"
run_visual_case "440 meteor corona"        "440-meteor-corona"        "retroarch/conformance/440-meteor-corona.js"        "d143de6fd87f021d"
run_visual_case "441 crystal crt"          "441-crystal-crt"          "retroarch/conformance/441-crystal-crt.js"          "873d7d70ef5a0a67"
run_visual_case "442 galaxy orbit atom"    "442-galaxy-orbit-atom"    "retroarch/conformance/442-galaxy-orbit-atom.js"    "79a1f668c66900ee"
run_visual_case "443 radar sunburst"       "443-radar-sunburst"       "retroarch/conformance/443-radar-sunburst.js"       "fecc8579ea148bf6"
run_visual_case "451 batch33 showcase"     "451-batch33-showcase"     "retroarch/conformance/451-batch33-showcase.js"     "7c06411ac9804ed1"
run_visual_case "452 aurora windmill"      "452-aurora-windmill"      "retroarch/conformance/452-aurora-windmill.js"      "e5014eed3a8c9ef0"
run_visual_case "453 honeycomb"            "453-honeycomb"            "retroarch/conformance/453-honeycomb.js"            "213fd9af3334cef4"
run_visual_case "454 chroma saturate"      "454-chroma-saturate"      "retroarch/conformance/454-chroma-saturate.js"      "1eb9669736aeabbf"
run_visual_case "455 nebula rain checker"  "455-nebula-rain-checker"  "retroarch/conformance/455-nebula-rain-checker.js"  "72bc8c88bea2bbe6"
run_visual_case "463 batch34 showcase"     "463-batch34-showcase"     "retroarch/conformance/463-batch34-showcase.js"     "8af303b1b1879e83"
run_visual_case "464 matrix stack"         "464-matrix-stack"         "retroarch/conformance/464-matrix-stack.js"         "54705be9b15af924"
run_visual_case "465 noise control"        "465-noise-control"        "retroarch/conformance/465-noise-control.js"        "9635c0a9a238dd53"
run_visual_case "466 curve ellipse hsb"    "466-curve-ellipse-hsb"    "retroarch/conformance/466-curve-ellipse-hsb.js"    "12a6b7ae9145b847"
run_visual_case "475 batch35 showcase"     "475-batch35-showcase"     "retroarch/conformance/475-batch35-showcase.js"     "af655cf53a5881cc"
run_visual_case "476 lerp ease arc bezier" "476-lerp-ease-arc-bezier" "retroarch/conformance/476-lerp-ease-arc-bezier.js" "0e5dd53f77feb977"
run_visual_case "477 noisemap flowfield"   "477-noisemap-flowfield-color" "retroarch/conformance/477-noisemap-flowfield-color.js" "911a3295dc3a2ddb"
run_visual_case "478 gradient hexcolor"    "478-gradient-hexcolor"    "retroarch/conformance/478-gradient-hexcolor.js"    "4dd92565e29367d0"
run_visual_case "487 batch36 showcase"     "487-batch36-showcase"     "retroarch/conformance/487-batch36-showcase.js"     "470296c2d0deb764"
run_visual_case "488 shake cooldown"       "488-shake-cooldown"       "retroarch/conformance/488-shake-cooldown.js"       "54cea062dee8a7cb"
run_visual_case "489 hit state"            "489-hit-state"            "retroarch/conformance/489-hit-state.js"            "9a232d43a09942a7"
run_visual_case "499 batch37 showcase"     "499-batch37-showcase"     "retroarch/conformance/499-batch37-showcase.js"     "488f0232d6bbb428"
run_visual_case "500 emitter2d"            "500-emitter2d"            "retroarch/conformance/500-emitter2d.js"            "e5a44e2f955c1612"
run_visual_case "501 pool sm healthbar"    "501-pool-statemachine-healthbar" "retroarch/conformance/501-pool-statemachine-healthbar.js" "b8ab69d427e929e7"
run_visual_case "511 batch38 showcase"     "511-batch38-showcase"     "retroarch/conformance/511-batch38-showcase.js"     "6fe00d7b3fa9aa3f"
run_visual_case "512 math utils"           "512-math-utils"           "retroarch/conformance/512-math-utils.js"           "17f6485e996bb536"
run_visual_case "513 draw shapes"          "513-draw-shapes"          "retroarch/conformance/513-draw-shapes.js"          "82edfc7f11e16e2e"
run_visual_case "523 batch39 showcase"     "523-batch39-showcase"     "retroarch/conformance/523-batch39-showcase.js"     "6a4424090558f209"
run_visual_case "524 spawner cooldownset"  "524-spawner-cooldownset"  "retroarch/conformance/524-spawner-cooldownset.js"  "dcf55beed556de83"
run_visual_case "525 flash border hsl poly" "525-flash-border-hsl-poly" "retroarch/conformance/525-flash-border-hsl-poly.js" "b33bcf298972006f"
run_visual_case "535 batch40 showcase"     "535-batch40-showcase"     "retroarch/conformance/535-batch40-showcase.js"     "23507732e1b44bdb"
run_visual_case "536 draw text shapes"     "536-draw-text-shapes"     "retroarch/conformance/536-draw-text-shapes.js"     "b0b12f5051a40f54"
run_visual_case "537 floating texts"       "537-floating-texts"       "retroarch/conformance/537-floating-texts.js"       "c8b3677f09a6c654"
run_visual_case "547 batch41 showcase"     "547-batch41-showcase"     "retroarch/conformance/547-batch41-showcase.js"     "8ad86f62f83c0a72"
run_visual_case "548 rand delta minimap"   "548-rand-delta-minimap"   "retroarch/conformance/548-rand-delta-minimap.js"   "7a6e5e574e5f1a7c"
run_visual_case "549 oscillator trigger vec" "549-oscillator-trigger-vec" "retroarch/conformance/549-oscillator-trigger-vec.js" "af4a6148600ab8a3"
run_visual_case "559 batch42 showcase"     "559-batch42-showcase"     "retroarch/conformance/559-batch42-showcase.js"     "8d549d449322615c"
run_visual_case "560 hittest colorpool"    "560-hittest-colorpool"    "retroarch/conformance/560-hittest-colorpool.js"    "d5cb8b3b7cdc411e"
run_visual_case "561 shuffle vec2"        "561-shuffle-vec2"         "retroarch/conformance/561-shuffle-vec2.js"         "c75348b4ee7bb57d"
run_visual_case "571 batch43 showcase"    "571-batch43-showcase"     "retroarch/conformance/571-batch43-showcase.js"     "7028ea5e138fda55"
run_visual_case "572 camera2d"            "572-camera2d"             "retroarch/conformance/572-camera2d.js"             "f806e9022487a2c3"
run_visual_case "573 tween vec2"          "573-tween-vec2"           "retroarch/conformance/573-tween-vec2.js"           "a007066d88dc9c7f"
run_visual_case "583 batch44 showcase"    "583-batch44-showcase"     "retroarch/conformance/583-batch44-showcase.js"     "affa9caca735a9aa"
run_visual_case "584 aabb drawrect"       "584-aabb-drawrect"        "retroarch/conformance/584-aabb-drawrect.js"        "c6c1d256a9c39fca"
run_visual_case "585 rng seed"            "585-rng-seed"             "retroarch/conformance/585-rng-seed.js"             "c93e26444571f963"
run_visual_case "595 batch45 showcase"    "595-batch45-showcase"     "retroarch/conformance/595-batch45-showcase.js"     "20947972acaf6806"
run_visual_case "596 circle camera path"    "596-circle-camera-path"   "retroarch/conformance/596-circle-camera-path.js"   "15fc3628debf0930"
run_visual_case "597 reflect trigger color" "597-reflect-trigger-color" "retroarch/conformance/597-reflect-trigger-color.js" "1a84235822494610"
run_visual_case "607 batch46 showcase"      "607-batch46-showcase"     "retroarch/conformance/607-batch46-showcase.js"     "50f33c55204226e3"

run_visual_case "608 camera2d hype"         "608-camera2d-hype"        "retroarch/conformance/608-camera2d-hype.js"        "5752f013176a0bdd"
run_visual_case "609 hype registry"         "609-hype-registry"        "retroarch/conformance/609-hype-registry.js"        "8af1be9d34eb9d0c"
run_visual_case "619 batch47 showcase"      "619-batch47-showcase"     "retroarch/conformance/619-batch47-showcase.js"     "be608021362ec97c"

run_visual_case "620 raycast proximity"     "620-raycast-proximity"    "retroarch/conformance/620-raycast-proximity.js"    "dc6aef34f49c2f35"
run_visual_case "621 seed input"            "621-seed-input"           "retroarch/conformance/621-seed-input.js"           "e129a3375564ea43"
run_visual_case "631 batch48 showcase"      "631-batch48-showcase"     "retroarch/conformance/631-batch48-showcase.js"     "725146c25fb115a6"

run_visual_case "632 vec3 math"             "632-vec3-math"            "retroarch/conformance/632-vec3-math.js"            "f6f71b992dd4c734"
run_visual_case "633 input sticks"          "633-input-sticks"         "retroarch/conformance/633-input-sticks.js"         "fbfe02ef7241a6c5"
run_visual_case "643 batch49 showcase"      "643-batch49-showcase"     "retroarch/conformance/643-batch49-showcase.js"     "909c9c10b4eb830d"

run_visual_case "644 vec3 advanced"         "644-vec3-advanced"        "retroarch/conformance/644-vec3-advanced.js"        "bf38c7c1e93a4b54"
run_visual_case "645 screen manager"        "645-screen-manager"       "retroarch/conformance/645-screen-manager.js"       "b6ad9b104bdf46b9"
run_visual_case "655 batch50 showcase"      "655-batch50-showcase"     "retroarch/conformance/655-batch50-showcase.js"     "1a5bcfc145f96383"

echo "Conformance passed."
