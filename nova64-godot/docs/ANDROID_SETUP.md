# Nova64 Godot — Android Setup & Run Guide

This document covers the **Android export project**: how the GDExtension `.so`
artifacts are wired into Godot's Android export, how to produce an APK, and how
to run it on either a physical device or the WSL/Windows emulator.

> Status (G4): Toolchain installed, libraries built (arm64 + x86_64), export
> presets templated, measurement script ready. Actual on-device measurement is
> deferred until a real device or a booted emulator is available.

---

## 1. Native Libraries

`gdextension/SConstruct` builds two ABIs for Android:

| ABI       | Use case                          | Build command                                        |
| --------- | --------------------------------- | ---------------------------------------------------- |
| `arm64`   | Physical devices, Pixel emulators | `scons platform=android arch=arm64  target=template_*` |
| `x86_64`  | Standard Android Studio emulator  | `scons platform=android arch=x86_64 target=template_*` |

`scripts/build-all.sh android` and `scripts/build-all.sh matrix` build **both**
ABIs and **both** debug+release targets. Output lives in:

```
godot_project/bin/libnova64.android.template_{debug,release}.{arm64,x86_64}.so
```

`godot_project/nova64.gdextension` declares all four entries so Godot picks the
right `.so` per export ABI.

---

## 2. Export Presets

Real `export_presets.cfg` is gitignored. The committed
`godot_project/export_presets.cfg.example` defines two presets:

| Index | Name                          | ABI       | Output                                |
| ----- | ----------------------------- | --------- | ------------------------------------- |
| 0     | `Android ARM64`               | arm64-v8a | `bin/export/nova64-host.apk`          |
| 1     | `Android x86_64 (Emulator)`   | x86_64    | `bin/export/nova64-host-x86_64.apk`   |

To activate locally:

```bash
cd nova64-godot/godot_project
cp export_presets.cfg.example export_presets.cfg
```

---

## 3. One-Time Setup (CLI-Only — No Android Studio, No Godot Editor UI)

The full Android pipeline runs from the shell. You never need to open Android
Studio or the Godot editor.

```bash
# 1. NDK r23c + scons toolchain
bash scripts/install-android-toolchain.sh

# 2. platform-tools, build-tools, platforms
bash scripts/install-android-sdk-packages.sh

# 3. Godot export templates (downloads ~700 MB tpz, extracts to user data dir)
bash scripts/install-godot-templates.sh

# 4. emulator package + AVD nova64-test (skip if you only target physical devices)
bash scripts/install-android-emulator.sh

# 5. activate the export presets template
cp godot_project/export_presets.cfg.example godot_project/export_presets.cfg
```

`install-godot-templates.sh` writes templates to:

- WSL with Windows host visible: `$APPDATA/Godot/export_templates/4.4.1.stable/`
  (so the Windows `Godot_v4.4.1-stable_console.exe` finds them too)
- pure Linux: `~/.local/share/godot/export_templates/4.4.1.stable/`

Override the version with `GODOT_VERSION=4.4.1 GODOT_FLAVOR=stable`.

Package id is `org.nova64.host`, version `0.4.9`.

### Optional: Open Editor Once

If you prefer to verify presets in the editor (not required), open
`godot_project/project.godot` in Godot 4.4.1 once and confirm both presets
appear under *Project → Export*. Skip this for fully automated CI runs.

---

## 4. Producing the APK

### Headless (preferred, CLI-only)

```bash
# Both presets, debug
bash scripts/export-android.sh

# Single ABI / mode
bash scripts/export-android.sh arm64           # device-only debug APK
bash scripts/export-android.sh x86_64 release  # emulator release APK
```

Outputs:

- `nova64-godot/bin/export/nova64-host.apk` (arm64-v8a)
- `nova64-godot/bin/export/nova64-host-x86_64.apk` (emulator)

### Editor (optional fallback)

*Project → Export* → select preset → **Export Project**. Same output paths.

---

## 5. Running on the Emulator (Method A — WSL)

Toolchain installer:

```bash
bash scripts/install-android-emulator.sh   # adds emulator pkg + arm64-v8a image, creates AVD nova64-test
```

Boot it headlessly with one command:

```bash
bash scripts/boot-android-emulator.sh                # boots nova64-test, blocks until ready
AVD=Super_Tablet bash scripts/boot-android-emulator.sh   # different AVD
```

The script runs `emulator -no-window -no-audio -gpu swiftshader_indirect` in
the background and waits for `sys.boot_completed=1`. Logs are saved to
`bench/emulator-<ts>.log`. If a device is already attached and booted, the
script exits immediately.

> WSL has no KVM; an arm64 image runs in pure software emulation and is slow
> (~5–10 fps). It is sufficient to validate that the bridge loads and to
> capture `[nova64-perf]` log lines, but absolute frame times will not be
> representative of real hardware.

If you have Android Studio's emulator installed on Windows already (this repo's
host does — `C:\Users\brend\AppData\Local\Android\Sdk\emulator\emulator.exe`
with the `Super_Tablet` x86_64 AVD), prefer that path: it uses WHPX, runs at
near-native speed, and is reachable from WSL via `adb -H 127.0.0.1` once you
run `adb start-server` in PowerShell.

---

## 6. Install & Measure

Install the APK and capture 30s of `logcat` filtered on the bridge tags:

```bash
bash scripts/measure-android.sh 04-instances
# → nova64-godot/bench/android-04-instances-<timestamp>.log
```

The log includes:

- Device props: `model`, `soc`, `os`
- Every `[nova64-perf]` line (emitted by `Nova64Host` every 60 frames)
- A tail of `nova64_carts.log` from `run-as org.nova64.host`

### One-Shot Pipeline

For a fully unattended run (build → export → boot → install → measure):

```bash
bash scripts/android-all.sh                          # x86_64 emulator, 04-instances
CART=08-capabilities bash scripts/android-all.sh     # different cart
ABI=arm64 SKIP_BOOT=1 bash scripts/android-all.sh    # physical arm64 device
SKIP_BUILD=1 bash scripts/android-all.sh             # reuse existing .so
```

Skip flags: `SKIP_BUILD`, `SKIP_EXPORT`, `SKIP_BOOT`, `SKIP_MEASURE`.

---

## 7. Status & Next

- [x] arm64 + x86_64 `.so` build green (debug + release)
- [x] Export preset templates committed
- [x] AVD `nova64-test` (arm64-v8a, android-34) provisioned
- [x] Measurement harness (`scripts/measure-android.sh`) ready
- [ ] Run measure-android against a booted emulator or physical device
- [ ] iOS export (deferred to macOS host)

When a device or emulator is up, the only step left for G4 is running
`scripts/measure-android.sh` and committing the resulting bench log under
`nova64-godot/bench/`.
