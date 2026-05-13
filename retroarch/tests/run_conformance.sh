#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

CORE="retroarch/nova64_libretro.so"
HARNESS="retroarch/build/harness"
PACKAGE_DIR="retroarch/build/conformance-packages"

make -C retroarch clean all
cc -Iretroarch -o "${HARNESS}" retroarch/tests/harness.c -ldl

mkdir -p "${PACKAGE_DIR}"
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

run_case "00 boot" "retroarch/conformance/00-boot.js" "eed98c91acf88bfb"
run_case "01 framebuffer" "retroarch/conformance/01-framebuffer.js" "4817a6cf4ba81cca"
run_case "02 input" "retroarch/conformance/02-input.js" "872fd1e2547c6371"
run_case "03 errors" "retroarch/conformance/03-errors.js" "f443942d0c7ee363"
run_case "06 cube" "retroarch/conformance/06-cube.js" "53584f0993f3ff6a"
run_case "07 cube plane" "retroarch/conformance/07-cube-plane.js" "cc715d97cf852c67"
run_case "08 sphere" "retroarch/conformance/08-sphere.js" "6ca539fe0bfe71f6"
run_case "09 overlay scene" "retroarch/conformance/09-overlay-scene.js" "12f25aad2651ae13"
run_case "10 lighting" "retroarch/conformance/10-lighting.js" "2e18d84a07860616"
run_command_log_case "09-overlay-scene" "retroarch/conformance/09-overlay-scene.js" "d3858bec86c219de492c73202e8b424cc19fdcb1a7fb6f29e288559df6b13c38"
run_command_log_case "10-lighting" "retroarch/conformance/10-lighting.js" "35413019eb4ac6513431241983366b3e3d5acff64f141fccc250429c8a1fe386"
run_command_log_case "06-cube-vulkan12" "retroarch/conformance/06-cube.js" "e1b52dec66dd3bfc13c7d65d620c3d46d1d16f210ac366a4fe1575076207a050" "vulkan12"
run_case "nova fallback" "${PACKAGE_DIR}/cube-fallback.nova" "53584f0993f3ff6a"
run_case "nova manifest main" "${PACKAGE_DIR}/cube-manifest.nova" "53584f0993f3ff6a"
run_command_log_case "nova-asset-manifest" "${PACKAGE_DIR}/asset-manifest.nova" "e6155762859c730a8796ad9de88e672dfaa89de75dec9b5ea312ec7a3e09d234"

echo "Conformance passed."
