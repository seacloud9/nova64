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

make -C retroarch clean all
cc -Iretroarch -o "${HARNESS}" retroarch/tests/harness.c -ldl

mkdir -p "${PACKAGE_DIR}"
rm -rf "${SAVE_DIR}"
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
PY

run_case() {
  local label="$1"
  local cart="$2"
  local checksum="$3"
  echo "== ${label}"
  "${HARNESS}" "${CORE}" "${cart}" --expect "${checksum}"
}

run_command_log_case() {
  local label="$1"
  local cart="$2"
  local expected_sha="$3"
  local renderer="${4:-}"
  local log_path="retroarch/build/${label}.commands"
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
  echo "== ${label}"
  "${HARNESS}" "${CORE}" "${cart}" --expect "${checksum}" --capture "${ppm}"
  python3 retroarch/tests/ppm_to_png.py "${ppm}" "${png}"
  rm -f "${ppm}"
}

run_key_case() {
  local label="$1"
  local cart="$2"
  local key="$3"
  local checksum="$4"
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
run_audio_case "12 audio" "retroarch/conformance/12-audio.js" "c0e5bade62febc47" "a18315634c550da3"
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
  echo "== ${label}"
  "${HARNESS}" "${CORE}" "${cart}" --mouse-x 5 --mouse-y -3 --mouse-btn left --expect "${checksum}"
}

run_mouse_case "25 mouse" "retroarch/conformance/25-mouse.js" "c921e3d3b2b7c551"
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

echo "Conformance passed."
