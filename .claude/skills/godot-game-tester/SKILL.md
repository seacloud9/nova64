---
name: godot-game-tester
description: Launch, play, record, and test native Godot games or exported builds. Use for interactive smoke tests, scripted keyboard playthroughs, crash and visual checks, gameplay evidence capture, or promotional footage; do not use for purely headless unit tests or scene editing without a playtest.
---

# Godot Game Tester

Test the game a player would actually experience. A running process alone is not a pass: verify rendered content, input-driven state changes, and the absence of blocking overlays, crashes, or obvious visual failures.

## Establish the target

- Identify whether the user wants the editor-run project, a debug build, or the shipped export. Prefer the shipped export when release behavior is in scope.
- Inspect `project.godot`, launch scripts, input actions, visible control hints, and relevant gameplay code before automating input.
- Define a short observable route: initial screen, start action, movement or interaction, and one feature-specific checkpoint.
- Preserve saves and account state. Do not erase progress, accept purchases, or enter external accounts unless explicitly authorized.

## Choose the test depth

- **Smoke:** launch, wait through loading, confirm a nonblank game frame, capture evidence, inspect logs, and exit cleanly.
- **Playthrough:** perform a minimal control route and verify that the scene or HUD changes in response.
- **Capture:** record a deliberate gameplay pass, inspect frames from the beginning/middle/end, and decode-check the finished video.
- **Regression:** reproduce the reported path first, then repeat it after the requested fix using comparable evidence.

Headless execution can validate startup or scripts, but it cannot substitute for a rendered playtest when visuals, input, camera behavior, or performance are in scope.

## Run and interact

1. Launch from the project directory and retain stdout/stderr or the Godot log when practical.
2. Wait for the real game window, not merely the process.
3. Capture a pre-input screenshot to catch blank frames, missing assets, import dialogs, or the wrong foreground app.
4. Before every automated input sequence, verify the Godot window is foreground. Release modifier keys first. Stop rather than type into an unverified window.
5. Exercise only the controls needed for the route. Verify the expected state change with a screenshot, HUD value, scene transition, log event, or video frame.
6. Stop the game after the test unless the user asked to keep it open.

On Windows, read [references/windows-native-testing.md](references/windows-native-testing.md) before native automation. Use `scripts/windows_playback.ps1` for guarded keyboard scenarios, `scripts/windows_capture.ps1` for silent FFmpeg capture, and `scripts/verify_video.ps1` to probe and fully decode a finished recording.

## Evidence and verdict

Report:

- target and exact launch path;
- route and controls exercised;
- observed checkpoints;
- pass, fail, or blocked, with the specific reason;
- logs, screenshots, and video paths;
- whether testing used an export or the project runtime;
- limitations such as silent capture, untested controller input, or unavailable platform hardware.

Treat any of these as failures or blockers rather than silently working around them:

- the capture shows another application, system search, a debug popup, or a persistent developer overlay;
- the game stays blank or static when motion is expected;
- inputs do not produce an observable response;
- the process exits unexpectedly or emits relevant engine/script errors;
- an export omits content that exists in the project. In particular, verify that symlinked resources were embedded in the PCK instead of assuming export success.

Retry only after identifying a concrete cause. Keep retries short and preserve the failed evidence when it helps explain the defect.
