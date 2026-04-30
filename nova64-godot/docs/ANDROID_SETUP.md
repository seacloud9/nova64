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

## 3. One-Time Godot Editor Setup

Android export needs the Godot Android export templates and an Android SDK +
JDK reachable from the editor.

1. Open `nova64-godot/godot_project/project.godot` in **Godot 4.4.1**.
2. *Editor → Manage Export Templates → Download* (matches the running editor
   version).
3. *Editor → Editor Settings → Export → Android*
   - **Android SDK Path**: e.g. `C:/Users/brend/AppData/Local/Android/Sdk`
   - **Java SDK Path**: an OpenJDK 17 install
   - **Debug Keystore**: leave default (Godot ships one); on first export Godot
     will offer to generate a debug keystore automatically.
4. *Project → Export* — both presets should now appear without red errors.

Package id is `org.nova64.host`, version `0.4.9`.

---

## 4. Producing the APK

### Editor (recommended)

*Project → Export* → select preset → **Export Project** (debug). Output goes to
`nova64-godot/bin/export/nova64-host[-x86_64].apk`.

### Headless

```bash
# arm64 device APK
godot --headless --path godot_project --export-debug "Android ARM64" \
  ../bin/export/nova64-host.apk

# x86_64 emulator APK
godot --headless --path godot_project --export-debug "Android x86_64 (Emulator)" \
  ../bin/export/nova64-host-x86_64.apk
```

Headless export only works after the editor has been opened once with the
Android export templates installed.

---

## 5. Running on the Emulator (Method A — WSL)

Toolchain installer:

```bash
bash scripts/install-android-emulator.sh   # adds emulator pkg + arm64-v8a image, creates AVD nova64-test
```

Boot headless under WSLg (no X server needed):

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
nohup "$ANDROID_HOME/emulator/emulator" -avd nova64-test \
  -no-audio -no-window -gpu swiftshader_indirect &
adb wait-for-device
adb shell getprop sys.boot_completed   # repeat until == 1
```

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
