#!/usr/bin/env bash
# build-cores-local.sh — build every RetroArch core on a macOS host, mirroring
# .github/workflows/release-cores.yml, so a release never needs downloaded
# cores from an older tag.
#
#   bash scripts/build-cores-local.sh                 # all targets
#   bash scripts/build-cores-local.sh ios tvos        # a subset
#
# Targets: macos linux windows linux-aarch64 linux-armhf
#          android-arm64-v8a android-armeabi-v7a android-x86_64 ios tvos
# Output:  retroarch/dist-cores/<release asset name>  (gitignored)
#
# Needs: Xcode (iOS/tvOS SDKs), Docker (Linux/Windows/RPi), Android NDK
# (brew install --cask android-ndk, or ANDROID_NDK_HOME).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RA="$ROOT/retroarch"
OUT="$RA/dist-cores"
NDK="${ANDROID_NDK_HOME:-/opt/homebrew/share/android-ndk}"
ALL="macos linux windows linux-aarch64 linux-armhf android-arm64-v8a android-armeabi-v7a android-x86_64 ios tvos"
WANT="${*:-$ALL}"
mkdir -p "$OUT"

[ "$(uname)" = "Darwin" ] || { echo "✗ build-cores-local.sh is for macOS hosts" >&2; exit 1; }

failed=()
ok() { echo "✓ $1 ($(du -h "$OUT/$1" | cut -f1))"; }

# make in an isolated OBJDIR, then copy the product to its asset name.
build_native() { # target built_name asset_name make_args...
  local target=$1 built=$2 asset=$3; shift 3
  echo ">>> $target"
  make -C "$RA" OBJDIR="build-$target" "$@" clean >/dev/null
  make -C "$RA" OBJDIR="build-$target" -j"$(sysctl -n hw.ncpu)" "$@"
  cp "$RA/$built" "$OUT/$asset" && ok "$asset"
}

build_dockcross() { # target image asset zlib_cc_candidates...
  local target=$1 image=$2 asset=$3; shift 3
  local candidates="$*"
  echo ">>> $target ($image)"
  docker run --rm --platform linux/amd64 -v "$ROOT":/work -w /work "$image" bash ${CORES_TRACE:+-x} -c "
    set -euo pipefail
    # Worktree .git points outside the mount; git is only used for the version string.
    git config --global --add safe.directory /work 2>/dev/null || true
    ZLIB_CC=''
    for c in $candidates; do command -v \"\$c\" >/dev/null 2>&1 && { ZLIB_CC=\"\$c\"; break; }; done
    [ -z \"\$ZLIB_CC\" ] && [ -n \"\${CC:-}\" ] && ZLIB_CC=\"\$CC\"
    [ -n \"\$ZLIB_CC\" ] || { echo 'no cross compiler found'; exit 1; }
    curl -fsSL https://github.com/madler/zlib/archive/refs/tags/v1.3.1.tar.gz -o /tmp/zlib.tar.gz
    mkdir -p /tmp/zlib-src && tar -xzf /tmp/zlib.tar.gz -C /tmp/zlib-src --strip-components=1
    (cd /tmp/zlib-src && CC=\"\$ZLIB_CC\" CFLAGS='-O3 -fPIC' ./configure --static --prefix=/tmp/zlib >/dev/null && make -j\$(nproc) >/dev/null && make install >/dev/null)
    C_INCLUDE_PATH=/tmp/zlib/include CC=\"\$ZLIB_CC\" make -C retroarch OBJDIR=build-$target LIBM='-lm /tmp/zlib/lib/libz.a' clean all
    cp retroarch/nova64_libretro.so retroarch/dist-cores/$asset
    chown $(id -u):$(id -g) retroarch/dist-cores/$asset
  " && ok "$asset"
}

build_android() { # target ndk_clang asset
  local target=$1 clang=$2 asset=$3
  local cc="$NDK/toolchains/llvm/prebuilt/darwin-x86_64/bin/$clang"
  [ -x "$cc" ] || { echo "✗ NDK clang not found: $cc (brew install --cask android-ndk)" >&2; return 1; }
  build_native "$target" nova64_libretro_android.so "$asset" platform=android CC="$cc"
}

run() { local t=$1; shift; "$@" || { echo "✗ $t failed" >&2; failed+=("$t"); }; }

for t in $WANT; do
  case "$t" in
    macos) run "$t" build_native macos nova64_libretro.dylib nova64_libretro_macos_universal.dylib \
             platform=osx "CC=cc -arch x86_64 -arch arm64" ;;
    linux|windows)
      run "$t" bash "$ROOT/scripts/build-retroarch-docker.sh" "$t"
      if [ "$t" = linux ]; then cp "$RA/nova64_libretro.so" "$OUT/nova64_libretro_linux_x86_64.so" && ok nova64_libretro_linux_x86_64.so
      else cp "$RA/nova64_libretro.dll" "$OUT/nova64_libretro_windows_x86_64.dll" && ok nova64_libretro_windows_x86_64.dll; fi ;;
    linux-aarch64) run "$t" build_dockcross "$t" dockcross/linux-arm64 nova64_libretro_linux_aarch64.so \
             aarch64-unknown-linux-gnu-gcc aarch64-linux-gnu-gcc ;;
    linux-armhf) run "$t" build_dockcross "$t" dockcross/linux-armv7 nova64_libretro_linux_armhf.so \
             arm-linux-gnueabihf-gcc armv7-unknown-linux-gnueabihf-gcc arm-unknown-linux-gnueabihf-gcc ;;
    android-arm64-v8a) run "$t" build_android "$t" aarch64-linux-android21-clang nova64_libretro_android_arm64-v8a.so ;;
    android-armeabi-v7a) run "$t" build_android "$t" armv7a-linux-androideabi21-clang nova64_libretro_android_armeabi-v7a.so ;;
    android-x86_64) run "$t" build_android "$t" x86_64-linux-android21-clang nova64_libretro_android_x86_64.so ;;
    ios) run "$t" build_native ios nova64_libretro_ios9.dylib nova64_libretro_ios_arm64.dylib \
             platform=ios9 IOSSDK="$(xcrun --sdk iphoneos --show-sdk-path)" ;;
    tvos) run "$t" build_native tvos nova64_libretro_tvos.dylib nova64_libretro_tvos_arm64.dylib \
             platform=tvos-arm64 TVOSSDK="$(xcrun --sdk appletvos --show-sdk-path)" ;;
    *) echo "✗ unknown target $t" >&2; failed+=("$t") ;;
  esac
done

echo; ls -la "$OUT"
if [ ${#failed[@]} -gt 0 ]; then echo "✗ failed: ${failed[*]}" >&2; exit 1; fi
echo "✓ all requested cores built"
