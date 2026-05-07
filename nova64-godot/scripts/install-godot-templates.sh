#!/usr/bin/env bash
# install-godot-templates.sh — download + install Godot export templates so
# headless `--export-debug` works without ever opening the editor UI.
#
# Defaults to Godot 4.4.1-stable (matches the editor referenced by GODOT.md).
# Override with GODOT_VERSION=4.4.1 GODOT_FLAVOR=stable.
#
# Templates are placed in Godot's user data dir:
#   - Linux:   ~/.local/share/godot/export_templates/<version>.<flavor>/
#   - WSL→Win: $APPDATA/Godot/export_templates/<version>.<flavor>/
#              (so the Windows Godot editor / godot.exe can find them too)
#
# Usage:
#   bash scripts/install-godot-templates.sh
#   GODOT_VERSION=4.4.1 bash scripts/install-godot-templates.sh

set -euo pipefail

GODOT_VERSION="${GODOT_VERSION:-4.4.1}"
GODOT_FLAVOR="${GODOT_FLAVOR:-stable}"
TPZ_NAME="Godot_v${GODOT_VERSION}-${GODOT_FLAVOR}_export_templates.tpz"
TPZ_URL="https://github.com/godotengine/godot/releases/download/${GODOT_VERSION}-${GODOT_FLAVOR}/${TPZ_NAME}"

# Pick install root. If $APPDATA is exposed (WSL with /mnt/c), prefer the
# Windows-visible Godot dir so the Windows editor binary sees the templates.
detect_target_dir() {
  if [ -n "${APPDATA:-}" ] && [ -d "${APPDATA}" ]; then
    echo "${APPDATA}/Godot/export_templates/${GODOT_VERSION}.${GODOT_FLAVOR}"
    return
  fi
  # WSL fallback: derive APPDATA from /mnt/c if a Windows user profile exists.
  if grep -qi microsoft /proc/version 2>/dev/null; then
    local winuser
    winuser="$(cmd.exe /c 'echo %USERNAME%' 2>/dev/null | tr -d '\r\n' || true)"
    if [ -n "$winuser" ] && [ -d "/mnt/c/Users/$winuser/AppData/Roaming" ]; then
      echo "/mnt/c/Users/$winuser/AppData/Roaming/Godot/export_templates/${GODOT_VERSION}.${GODOT_FLAVOR}"
      return
    fi
  fi
  echo "${HOME}/.local/share/godot/export_templates/${GODOT_VERSION}.${GODOT_FLAVOR}"
}

TARGET_DIR="$(detect_target_dir)"
mkdir -p "$TARGET_DIR"

if [ -f "${TARGET_DIR}/version.txt" ]; then
  echo "[=] Templates already installed at: ${TARGET_DIR}"
  echo "    Remove that directory to reinstall."
  exit 0
fi

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

echo "[+] Downloading ${TPZ_NAME} (~700 MB)..."
curl -fL --progress-bar "$TPZ_URL" -o "${WORK_DIR}/templates.tpz"

echo "[+] Extracting..."
unzip -q "${WORK_DIR}/templates.tpz" -d "$WORK_DIR"

# tpz extracts a 'templates/' folder. Move its contents (not the folder).
if [ ! -d "${WORK_DIR}/templates" ]; then
  echo "[!] Unexpected archive layout; expected 'templates/' inside ${TPZ_NAME}" >&2
  exit 1
fi

mv "${WORK_DIR}/templates/"* "$TARGET_DIR/"
echo "[+] Installed templates to: ${TARGET_DIR}"
ls "$TARGET_DIR" | head -20
