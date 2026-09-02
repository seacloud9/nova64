---
name: godot-trailer-maker
description: Turn Godot gameplay recordings into test reels, demo videos, short trailers, alternate cuts, and review-ready MP4s. Use for selecting gameplay moments, adding factual title cards and labels, formatting footage, optional authorized music, contact sheets, and delivery validation; do not use for recording or testing gameplay without an editing deliverable.
---

# Godot Trailer Maker

Create a truthful, watchable cut from real gameplay. Preserve the source recordings and make the edit reproducible from a manifest.

## Establish the cut

- Confirm the intended use: internal test reel, feature demo, store/social trailer, or alternate aspect-ratio cut.
- Use supplied footage when available. If new gameplay must be captured, use `$godot-game-tester` first and keep its raw takes separate from finished exports.
- Infer a 16:9, 1080p, H.264 deliverable only when the user gave no format. Ask before spending significant time on multiple aspect ratios, voice-over, or a long-form edit.
- Use only factual claims visible in the game or supplied by the user. Do not invent release dates, platform support, awards, testimonials, or performance claims.
- Do not download or add music unless the user supplied it or authorized a clearly licensed source. Record the music source/license in the handoff.

## Select footage

- Inspect source metadata and sample frames before editing.
- Prefer clips with immediate motion, readable framing, and a distinct feature or interaction.
- Remove loading, idle setup, desktop chrome, search panels, debug popups, accidental overlays, and failed takes from promotional cuts.
- For a test reel, retain evidence that matters to review and label the tested feature or route. Do not polish away a defect the reel is meant to demonstrate.
- Keep individual trailer shots concise. Let a shot run longer only when the viewer needs time to understand the mechanic.

## Build reproducibly

For a Windows FFmpeg edit, read [references/trailer-manifest.md](references/trailer-manifest.md), create a JSON manifest, and run `scripts/make_trailer.ps1`. The helper preserves aspect ratio with a blurred fill, adds optional title/outro cards and clip labels, supports optional user-authorized music, and exports H.264/AAC MP4.

Keep the manifest beside the deliverable or in the requested working folder. Never overwrite raw inputs. Use a new filename for materially different cuts.

## Verify before delivery

Run `scripts/verify_trailer.ps1` on each finished file. Inspect the generated beginning/middle/end contact sheet and confirm:

- the intended game and title cards are visible;
- clips change over time and cuts occur where expected;
- no other application or system UI appears;
- labels are readable and not covering critical HUD elements;
- orientation, resolution, duration, and audio state match the request;
- the full file decodes without error.

If the output is silent, state that plainly. Do not call a file promotionally complete when requested music, voice-over, captions, branding, or platform variants are still missing.

## Handoff

Provide clickable paths for the trailer, manifest, contact sheet, and retained raw-footage folder. Summarize duration, resolution, codec, audio status, included scenes, and any known limitations.
