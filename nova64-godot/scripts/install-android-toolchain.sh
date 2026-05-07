#!/usr/bin/env bash
# Installs Android cmdline-tools + NDK r23c into ~/Android/Sdk for the
# Nova64 GDExtension Android build. Idempotent. No sudo required.
#
# This script is robust against two common pitfalls:
#   1. Python's zipfile (used here when `unzip` isn't installed) does not
#      preserve unix exec bits, so we explicitly chmod the cmdline-tools.
#   2. Python's zipfile.extractall does not preserve symlinks, but the NDK
#      ships thousands of them (clang++ -> clang, libc++.so -> libc++.so.1).
#      The inline Python helper walks ZipInfo external_attr to detect
#      S_IFLNK entries and recreates them as real symlinks.
#
# Outputs:
#   ANDROID_HOME      = ~/Android/Sdk
#   ANDROID_NDK_ROOT  = ~/Android/Sdk/ndk/23.2.8568313  (godot-cpp-pinned)
set -euo pipefail

SDK_ROOT="${HOME}/Android/Sdk"
NDK_VERSION="23.2.8568313"          # godot-cpp 4.3 expects this exact dir name
CMDLINE_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
NDK_URL="https://dl.google.com/android/repository/android-ndk-r23c-linux.zip"

mkdir -p "${SDK_ROOT}/cmdline-tools"
cd /tmp

# --- cmdline-tools ---------------------------------------------------------
if [ ! -x "${SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager" ]; then
  echo "[+] Downloading Android cmdline-tools..."
  [ -f cmdline-tools.zip ] || wget -q "${CMDLINE_URL}" -O cmdline-tools.zip
  python3 -c 'import zipfile,os; zipfile.ZipFile("/tmp/cmdline-tools.zip").extractall(os.path.expanduser("~/Android/Sdk/cmdline-tools"))'
  rm -rf "${SDK_ROOT}/cmdline-tools/latest"
  mv "${SDK_ROOT}/cmdline-tools/cmdline-tools" "${SDK_ROOT}/cmdline-tools/latest"
  chmod +x "${SDK_ROOT}/cmdline-tools/latest/bin/"*
  echo "[+] cmdline-tools ready at ${SDK_ROOT}/cmdline-tools/latest"
else
  echo "[=] cmdline-tools already installed"
fi

# --- NDK r23c (Godot 4.4 pinned) ------------------------------------------
NDK_DIR="${SDK_ROOT}/ndk/${NDK_VERSION}"
if [ ! -d "${NDK_DIR}/build" ]; then
  echo "[+] Downloading NDK r23c (~1 GB)..."
  [ -f ndk-r23c.zip ] || wget -q "${NDK_URL}" -O ndk-r23c.zip
  mkdir -p "${SDK_ROOT}/ndk"
  python3 - <<'PYEOF'
import os, stat, shutil, zipfile
from pathlib import Path
DEST = Path.home()/"Android"/"Sdk"/"ndk"
TARGET = DEST/"23.2.8568313"
if TARGET.exists():
    shutil.rmtree(TARGET)
old = DEST/"android-ndk-r23c"
if old.exists():
    shutil.rmtree(old)
DEST.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile("/tmp/ndk-r23c.zip") as zf:
    for info in zf.infolist():
        out = DEST/info.filename
        mode = (info.external_attr >> 16) & 0xFFFF
        if info.is_dir():
            out.mkdir(parents=True, exist_ok=True); continue
        out.parent.mkdir(parents=True, exist_ok=True)
        if stat.S_ISLNK(mode):
            target = zf.read(info).decode()
            if out.exists() or out.is_symlink():
                out.unlink()
            os.symlink(target, out)
        else:
            with zf.open(info) as src, open(out, "wb") as dst:
                shutil.copyfileobj(src, dst)
            if mode:
                os.chmod(out, mode & 0o7777)
src = DEST/"android-ndk-r23c"
if src.exists():
    src.rename(TARGET)
PYEOF
  echo "[+] NDK ready at ${NDK_DIR}"
else
  echo "[=] NDK already installed"
fi

cat <<EOF

Done.
  ANDROID_HOME=${SDK_ROOT}
  ANDROID_NDK_ROOT=${NDK_DIR}

Add to ~/.bashrc if you want them persistent:
  export ANDROID_HOME="\$HOME/Android/Sdk"
  export ANDROID_NDK_ROOT="\$ANDROID_HOME/ndk/${NDK_VERSION}"
  export PATH="\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$PATH"

Next: bash scripts/install-android-sdk-packages.sh
      to fetch platform-tools / android-34 / build-tools 34.0.0
      (required for Godot APK export).
EOF
