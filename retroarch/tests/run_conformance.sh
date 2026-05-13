#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

CORE="retroarch/nova64_libretro.so"
HARNESS="retroarch/build/harness"
PACKAGE_DIR="retroarch/build/conformance-packages"
SAVE_DIR="retroarch/build/conformance-saves"

make -C retroarch clean all
cc -Iretroarch -o "${HARNESS}" retroarch/tests/harness.c -ldl

mkdir -p "${PACKAGE_DIR}"
rm -rf "${SAVE_DIR}"
mkdir -p "${SAVE_DIR}"
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

run_case "00 boot" "retroarch/conformance/00-boot.js" "eed98c91acf88bfb"
run_case "01 framebuffer" "retroarch/conformance/01-framebuffer.js" "4817a6cf4ba81cca"
run_case "02 input" "retroarch/conformance/02-input.js" "872fd1e2547c6371"
run_case "03 errors" "retroarch/conformance/03-errors.js" "f443942d0c7ee363"
run_case "06 cube" "retroarch/conformance/06-cube.js" "53584f0993f3ff6a"
run_case "07 cube plane" "retroarch/conformance/07-cube-plane.js" "5c9a36e84953c4c7"
run_case "08 sphere" "retroarch/conformance/08-sphere.js" "6ca539fe0bfe71f6"
run_case "09 overlay scene" "retroarch/conformance/09-overlay-scene.js" "7122077fc2c8b827"
run_case "10 lighting" "retroarch/conformance/10-lighting.js" "e3b1a52e585e46f2"
NOVA64_SAVE_DIR="${SAVE_DIR}" run_case "11 storage" "retroarch/conformance/11-storage.js" "5dd5226aa3467474"
run_audio_case "12 audio" "retroarch/conformance/12-audio.js" "c0e5bade62febc47" "a18315634c550da3"
run_case "13 assets" "${PACKAGE_DIR}/asset-runtime.nova" "294b9bd45b20fb27"
run_case "14 plane dimensions" "retroarch/conformance/14-plane-dimensions.js" "d4e415a9e874e0af"
run_case "15 primitive args" "retroarch/conformance/15-primitive-args.js" "1294ed2cc0033448"
run_case "16 transforms" "retroarch/conformance/16-transforms.js" "271707fd988ce378"
run_command_log_case "09-overlay-scene" "retroarch/conformance/09-overlay-scene.js" "fbdcfb7f45cf2ff965131eb405a9c0b62849e4fde47c7ae5610ffb03ae3bfe0a"
run_command_log_case "10-lighting" "retroarch/conformance/10-lighting.js" "240e48ca9dfc8be74fb8e87af8d5fd1cfee8637396aa32872800851666bc40f1"
run_command_log_case "14-plane-dimensions" "retroarch/conformance/14-plane-dimensions.js" "d6da317ee5ab2ddda0c17dee64d13c805ae9c485027ae339bbd6559f84853e30"
run_command_log_case "15-primitive-args" "retroarch/conformance/15-primitive-args.js" "9342601f0bebb73d5070c432b3132cc9e829d454ccb6dcbc26bcd67841094fc8"
run_command_log_case "16-transforms" "retroarch/conformance/16-transforms.js" "7b54f9b5dd0a6f90db159c4dda920200167275d1aa3b054ca2ab9065d7f3c13a"
run_command_log_case "06-cube-vulkan12" "retroarch/conformance/06-cube.js" "a3ea819e3501a15a0b7a5fa11a4b1f57c85bfd61770b8d3564a0fccb9a7e6dd4" "vulkan12"
run_case "nova fallback" "${PACKAGE_DIR}/cube-fallback.nova" "53584f0993f3ff6a"
run_case "nova manifest main" "${PACKAGE_DIR}/cube-manifest.nova" "53584f0993f3ff6a"
run_command_log_case "nova-asset-manifest" "${PACKAGE_DIR}/asset-manifest.nova" "4cc914bf7c53a2bc467eb405430593908f080b64f1101d1a0983f6abaa761314"

echo "Conformance passed."
