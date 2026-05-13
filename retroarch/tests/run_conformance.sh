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
run_command_log_case "09-overlay-scene" "retroarch/conformance/09-overlay-scene.js" "75f2e45b1f3d6886fd8ddefc8044d2c84678777a7809e440eb769a1e7706b6d9"
run_command_log_case "10-lighting" "retroarch/conformance/10-lighting.js" "c3b5455237fb125ad64b303ffb6fa2b1c27d40167cc57d17f0d1a2f132f7e4cb"
run_command_log_case "14-plane-dimensions" "retroarch/conformance/14-plane-dimensions.js" "94835ee0bf8960cc331a649fe1126cc3b4303da162f611151d7664f24c68dc3a"
run_command_log_case "15-primitive-args" "retroarch/conformance/15-primitive-args.js" "84d93b15ba8d0386354ee36284b98983f24f628a0c86380abc704bbbe9b76e36"
run_command_log_case "06-cube-vulkan12" "retroarch/conformance/06-cube.js" "e1b52dec66dd3bfc13c7d65d620c3d46d1d16f210ac366a4fe1575076207a050" "vulkan12"
run_case "nova fallback" "${PACKAGE_DIR}/cube-fallback.nova" "53584f0993f3ff6a"
run_case "nova manifest main" "${PACKAGE_DIR}/cube-manifest.nova" "53584f0993f3ff6a"
run_command_log_case "nova-asset-manifest" "${PACKAGE_DIR}/asset-manifest.nova" "63fb45ba2bf01151f4dba5bdd9a0cc4e061c731c16d65b3e02884b48881526cb"

echo "Conformance passed."
