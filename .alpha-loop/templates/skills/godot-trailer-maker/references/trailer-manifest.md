# Trailer manifest

Read this reference when using `scripts/make_trailer.ps1` on Windows.

## Format

Paths may be absolute or relative to the manifest file.

```json
{
  "output": "trailer.mp4",
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "background_color": "030612",
  "font_path": "C:\\Windows\\Fonts\\arialbd.ttf",
  "title": "NOVA64",
  "subtitle": "NATIVE GODOT DEMOS",
  "intro_seconds": 1.5,
  "outro_title": "NOVA64",
  "outro_subtitle": "BUILT WITH NOVA64 / RUNNING IN GODOT",
  "outro_seconds": 1.5,
  "transition_seconds": 0.35,
  "clips": [
    {
      "path": "raw/space-combat.mp4",
      "start": 4.0,
      "duration": 5.0,
      "label": "SPACE COMBAT"
    },
    {
      "path": "raw/racing.mp4",
      "start": 6.0,
      "duration": 5.0,
      "label": "ANTI-GRAVITY RACING"
    }
  ]
}
```

Required fields are `output` and a nonempty `clips` array. Every clip requires `path`, `start`, and `duration`; `label` is optional.

Defaults:

- `width`: 1920
- `height`: 1080
- `fps`: 30
- `background_color`: `030612`
- `font_path`: Windows Arial Bold
- `intro_seconds` / `outro_seconds`: 0 when the corresponding title is absent, otherwise 1.5
- `transition_seconds`: 0.35

An optional authorized music file can be added:

```json
{
  "music_path": "music/licensed-track.wav",
  "music_volume": 0.25
}
```

The helper loops and trims music to the trailer duration, fades it at both ends, and encodes AAC. It does not mix source gameplay audio. Omit `music_path` for a silent trailer.

## Editing guidance

- Use title cards sparingly; opening gameplay quickly is usually stronger.
- Labels should name visible features, not marketing claims.
- Keep source frame rates and aspect ratios heterogeneous if needed; the helper normalizes them into the declared canvas.
- For vertical or square exports, set `width` and `height` explicitly and inspect the contact sheet for critical content lost to the smaller foreground fit.
- Create a separate manifest for each materially different cut so outputs remain reproducible.
