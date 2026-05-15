# Nova64 Netplay Compatibility Notes

RetroArch netplay uses save-state rollback. This file documents which cart-facing
state is captured in save states, which state is non-deterministic, and what that
means for netplay correctness.

## Save-state coverage

The libretro save-state interface (`retro_serialize` / `retro_unserialize`) is
**not yet implemented** in nova64_libretro. Netplay rollback therefore cannot
restore Nova64 game state. Carts run in netplay will stay in sync only as long
as inputs are identical on all peers — a natural desync on any state divergence
will not be recoverable via rollback.

### State categories

| Category                  | In save state? | Notes                                           |
|---------------------------|----------------|-------------------------------------------------|
| JS heap (cart variables)  | ❌ No          | QuickJS runtime state not serialised            |
| 2D framebuffer            | ❌ No          | Reconstructed each frame from draw calls        |
| GLES GPU state            | ❌ No          | Not serialisable via RetroArch                  |
| Audio mixer state         | ❌ No          | Voice/channel positions not captured            |
| Input edge state (btnp)   | ❌ No          | Frame-edge tracking in g_prev_joypad not saved  |
| `nova64_storage` keys     | ❌ No          | Backed by disk files outside save-state scope   |
| cheevos RAM (peek/poke)   | ❌ No          | g_cheevos_ram not serialised                    |
| RNG state (--seed)        | ❌ No          | Seeded once at init; not re-seeded on rollback  |

## Non-deterministic sources

- **`Date.now()` / `performance.now()`**: returns wall-clock time. Carts using
  time for animation will diverge between peers with any timing skew.
- **Audio playback position**: voices advance in real time; not synced to frames.
- **File I/O (storage, assets)**: reads from disk — not deterministic across peers
  if storage state diverges.

## Recommendations for cart authors (netplay-aware)

1. Drive all game logic from the `dt` parameter in `update(dt)`, not from
   `Date.now()`. Accumulate a frame counter instead of reading wall-clock time.
2. Seed RNG with `--seed N` in conformance and document the expected seed for
   netplay peers.
3. Avoid reading `nova64_storage` during gameplay logic that affects game state.
4. Treat `getVoicePitch` / `getVoiceVolume` as display-only; do not feed them
   back into game logic that must stay in sync.

## Roadmap

- `retro_serialize` / `retro_unserialize`: Requires serializing the QuickJS
  runtime heap. This is a significant future milestone, not planned for M8.
- Deterministic audio: `playSound` could be frame-aligned once save-states land.
- Until save-states are implemented, netplay is best-effort (frame-sync only).
