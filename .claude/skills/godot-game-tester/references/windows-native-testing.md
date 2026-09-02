# Windows native testing

Read this reference only for native Godot testing on Windows.

## Launch choices

Prefer a user-provided launch command. Otherwise, common forms are:

```powershell
# Run a project with the installed editor binary.
& 'C:\path\to\Godot.exe' --path 'C:\path\to\project'

# Pass project-specific user arguments after `--`.
& 'C:\path\to\Godot.exe' --path 'C:\path\to\project' -- 'scenario-name'

# Run an exported build from beside its PCK and dependencies.
Start-Process -FilePath 'C:\path\to\Game.exe' -WorkingDirectory 'C:\path\to'
```

Use the native Windows Godot executable for a native Windows playtest. WSL remains useful for repository inspection and build commands, but WSL GUI behavior is not evidence for the Windows export.

## Foreground safety

Windows can deny background focus changes. Never assume `SetForegroundWindow` succeeded; compare the actual foreground handle to the target handle before sending keys. If focus cannot be established, stop and ask the user to activate the game window.

Release `Win`, `Alt`, `Ctrl`, and `Shift` before a scenario. A stuck modifier can redirect gameplay keys into Windows Search or another system shortcut.

`scripts/windows_playback.ps1` accepts either a JSON array or `{ "actions": [...] }`:

```json
[
  { "action": "wait", "duration_ms": 800 },
  { "action": "tap", "key": "F3" },
  { "action": "tap", "key": "Space", "after_ms": 1200 },
  { "action": "hold", "keys": ["W", "A"], "duration_ms": 1500 },
  { "action": "tap", "key": "Q" }
]
```

Use `tap` for one or more simultaneous keys, `hold` for a timed hold, and `wait` for loading or animation. `after_ms` adds a delay after an action.

## Capture

Prefer Godot Movie Maker mode when the project already supports deterministic recording. For an ordinary interactive session, `scripts/windows_capture.ps1` records either the desktop or a named window through FFmpeg `gdigrab`.

Desktop capture requires an interactive, unlocked session. Capture a short proof first and inspect it before recording a long run. If the taskbar or window chrome is visible, use an exact crop or a deliberate window size; do not guess a crop that removes HUD content.

The helper records video only. State clearly that the result is silent unless a separate, verified audio-capture path is configured.

After recording:

1. Extract frames near the beginning, middle, and end.
2. Confirm the intended game is visible and changes over time.
3. Run `scripts/verify_video.ps1` for metadata and full decode validation.

## Useful evidence

- Godot/editor log and process exit status
- screenshot before input
- screenshot after each material checkpoint
- short raw gameplay recording
- finished, decode-verified MP4
- exact build or commit tested

Do not report a visual pass based only on process responsiveness or file existence.
