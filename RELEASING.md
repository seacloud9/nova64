# Releasing Nova64 RetroArch cores

This repo ships pre-built libretro cores for eight platforms via a GitHub
Actions workflow. End users download from the [GitHub Releases page](https://github.com/seacloud9/nova64/releases);
this doc tells you how to publish a release.

For deeper validation steps before tagging (build, conformance suite,
performance checks), see [`retroarch/RELEASE_CHECKLIST.md`](retroarch/RELEASE_CHECKLIST.md).

---

## Quick start — cut a release

```bash
# 1. Make sure main is clean and conformance passes locally
git status
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh

# 2. Tag and push
git tag v0.5.2
git push origin v0.5.2

# 3. Watch the workflow run
gh workflow view "Release RetroArch cores" --web
```

Within ~8–10 minutes, a new GitHub Release will appear with `.so`, `.dll`,
and `.dylib` cores attached, a `SHA256SUMS.txt`, and a drop-in install
README.

The same `v*.*.*` tag also publishes the `nova64` package to **npm** — but
**only after every platform core has built green**. The `npm-publish` job lives
in `release-cores.yml` and is gated with `needs: build`, so if any core (even
iOS/tvOS) fails, the npm publish is skipped. This errs on safety: npm and the
binary cores ship together, or not at all.

Before tagging, run `pnpm ci:check --release` locally — it validates the npm
publish path (lint, `test:all`, version-not-already-published, `npm publish
--dry-run`) and compiles the host core, so you don't burn the expensive CI
matrix on an avoidable failure. (`publish.yml` is now a manual-only,
`workflow_dispatch` fallback for a deliberate ungated hotfix publish.)

Requires the `NPM_TOKEN` repo secret (Settings → Secrets → Actions).

---

## What gets built

The [`Release RetroArch cores`](.github/workflows/release-cores.yml)
workflow runs a build matrix across three runners. **Eight** core
binaries are produced per release:

| Platform | Built filename | Asset name | How |
|----------|----------------|------------|-----|
| Linux x86_64 | `nova64_libretro.so` | `nova64_libretro_linux_x86_64.so` | native gcc on `ubuntu-latest` |
| Linux aarch64 (Pi 4/5) | `nova64_libretro.so` | `nova64_libretro_linux_aarch64.so` | `dockcross/linux-arm64` image |
| Linux armhf (Pi 2/3/Zero 2, 32-bit OS) | `nova64_libretro.so` | `nova64_libretro_linux_armhf.so` | `dockcross/linux-armv7` image |
| Windows x86_64 | `nova64_libretro.dll` | `nova64_libretro_windows_x86_64.dll` | mingw cross-compile on `ubuntu-latest` |
| macOS universal (x86_64 + arm64) | `nova64_libretro.dylib` | `nova64_libretro_macos_universal.dylib` | `macos-latest` with `-arch x86_64 -arch arm64` |
| Android arm64-v8a | `nova64_libretro_android.so` | `nova64_libretro_android_arm64-v8a.so` | NDK `aarch64-linux-android21-clang` |
| Android armeabi-v7a | `nova64_libretro_android.so` | `nova64_libretro_android_armeabi-v7a.so` | NDK `armv7a-linux-androideabi21-clang` |
| Android x86_64 | `nova64_libretro_android.so` | `nova64_libretro_android_x86_64.so` | NDK `x86_64-linux-android21-clang` |

Plus `SHA256SUMS.txt` covering every binary and a drop-in install
`README.md` generated at release time.

For desktop targets (Linux x86_64, Windows, macOS) the release also
includes the canonical un-prefixed filename (`nova64_libretro.so`,
`nova64_libretro.dll`, `nova64_libretro.dylib`) so users can drop the
file straight into RetroArch's `cores/` directory without renaming.

---

## Triggers

### Automatic — push a `v*.*.*` tag

```bash
git tag v0.5.2
git push origin v0.5.2
```

The workflow runs, all eight platforms build in parallel, and a non-prerelease
GitHub Release is published.

### Manual — Actions tab

Useful for a one-off core-only release without retagging (e.g. cores-only
patch release, or smoke-testing the pipeline before a real version bump).

1. Go to **Actions → Release RetroArch cores → Run workflow**.
2. Enter a `tag_name` (e.g. `cores-2026-06-01-test`).
3. Leave **Mark as pre-release** checked so it doesn't appear in the
   "latest release" badge.
4. Click **Run workflow**.

Artifacts are also uploaded as workflow artifacts (30-day retention) even
when the release step skips, so you can grab the binaries from the Actions
UI without creating a release.

---

## Adding a new target platform

Each row in the build matrix is a `matrix.include` entry with the same
shape; add a new entry to ship a new platform.

The shape is:

```yaml
- target: <slug>             # used for filenames + job names
  runner: ubuntu-latest      # or macos-latest
  kind: native|dockcross|android
  built_name: <what the Makefile writes>
  asset_name: <what the release publishes it as>
  # kind-specific:
  make_args: '<flags passed to make>'              # native + dockcross
  apt_deps: '<space-separated apt packages>'       # native (optional)
  dockcross_image: dockcross/<name>                # dockcross only
  zlib_cc_candidates: '<compiler names>'           # dockcross only
  zlib_prefix: /tmp/zlib-<target>                  # dockcross only
  ndk_clang: <abi>-linux-android21-clang           # android only
```

The job uses conditional steps gated on `matrix.kind`:

- `native` — `apt install` + `make`.
- `dockcross` — `docker pull` + `docker run dockcross/* make …`.
- `android` — resolve `ANDROID_NDK_LATEST_HOME`, pick the right per-ABI
  clang, pass it as `CC=` to `make platform=android`.

Adding another dockcross Linux target follows the same shape as the ARM SBC
rows already in the matrix:

```yaml
- target: linux-riscv64
  runner: ubuntu-latest
  kind: dockcross
  dockcross_image: dockcross/linux-riscv64
  zlib_cc_candidates: 'riscv64-unknown-linux-gnu-gcc riscv64-linux-gnu-gcc'
  zlib_prefix: /tmp/zlib-linux-riscv64
  built_name: nova64_libretro.so
  asset_name: nova64_libretro_linux_riscv64.so
  make_args: ''
```

---

## Troubleshooting

### A build job fails

Check the **Build core (\<target\>)** job logs. The `fail-fast: false` strategy
keeps the other platforms going so you can see which ones still work.

Common failure modes:

- **Linux aarch64**: dockcross image pull is rate-limited from anonymous
  Docker Hub. Solution: log in with a `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN`
  secret pair, then add a `docker/login-action@v3` step before the
  `docker run`. (Not currently set up — only needed if rate-limits hit.)
- **macOS**: build fails with "ld: building for macOS-x86_64 but attempting
  to link with file built for macOS-arm64". The Makefile's `osx` branch must
  see both `-arch` flags. Verify `make_args` still has
  `CC=cc\ -arch\ x86_64\ -arch\ arm64` (backslash-escaped spaces are
  important — without them, only the first token becomes `CC=`).
- **Android**: `NDK clang not found at …`. The runner image rolled and the
  NDK path changed, or the version-suffixed clang names rolled (e.g.
  `aarch64-linux-android21-clang` →
  `aarch64-linux-android22-clang`). Update the `ndk_clang` value in the
  matrix entry.

### The release step fails with "fail_on_unmatched_files"

A platform build job didn't produce an artifact. Re-run only the failing
build job from the Actions UI, then re-run the publish job.

### Release shows up but is missing a platform

Could mean the build job succeeded but uploaded a 0-byte or wrong-name
file. Download the workflow artifacts from the Actions run and inspect
the `staging/` contents.

---

## Verifying a release after publish

```bash
# Pick the latest release tag
TAG=$(gh release list --limit 1 --json tagName -q '.[0].tagName')

# Download the checksums
gh release download "$TAG" -p SHA256SUMS.txt

# Download a binary and verify
gh release download "$TAG" -p nova64_libretro.dll
sha256sum -c SHA256SUMS.txt 2>&1 | grep dll
```

Expected: `nova64_libretro.dll: OK`.

---

## Mempalace memory

If you do anything notable during release prep — surprising failures,
re-baselines, last-minute cart fixes — capture it after the fact:

```bash
pnpm run mempalace:mine:retroarch
```

The miner picks up recent commits and folds them into the project's
memory wing so the next agent session starts with the latest context.
