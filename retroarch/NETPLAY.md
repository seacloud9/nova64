# Nova64 RetroArch — Netplay Compatibility Notes

## Overview

Nova64 supports RetroArch netplay (rollback and delay-based) through the
standard `retro_serialize` / `retro_unserialize` save-state interface. This
document describes what state is covered, what is non-deterministic, and how
to minimize desync.

---

## What Is Covered by Save States

A Nova64 save state (`retro_serialize`) captures the entire host-managed
runtime in a versioned binary block:

| Component | Covered? | Notes |
|---|---|---|
| Software framebuffer (640×360 RGBA) | **Yes** | Full pixel buffer |
| RGB565 conversion buffer | **Yes** | Derived from RGBA; re-derived on load |
| Audio voice state (16 voices) | **Yes** | PCM position, synth phase, all params |
| Input state (buttons, axes, triggers, all 4 ports) | **Yes** | Polled fresh each `retro_run` from callbacks |
| Camera state (pos, target, FOV, ortho) | **Yes** | |
| Scene meshes (handles, transforms, materials) | **Yes** | Geometry type + params; custom mesh CPU data |
| Point lights | **Yes** | Position, color, radius |
| Post-processing state (CRT, vignette, etc.) | **Yes** | |
| 2D draw state (camera, clip, blend, palette) | **Yes** | |
| RNG state (xorshift64 seed) | **Yes** | Deterministic after `--seed N` injection |
| Dev console ring buffer | **Yes** | |
| Cheevos RAM (`g_cheevos_ram[256]`) | **Yes** | |
| Frame counter | **Yes** | |
| Music state (position, volume, loop) | **Yes** | PCM pointer is re-resolved on load |
| **QuickJS heap (JS variables, closures)** | **No** | Not serialized — see below |
| Persistent storage (file-backed) | **No** | File system; not rolled back |
| Audio channel volume/pitch settings | **Yes** | Stored in `audio_channels[]` array |

---

## QuickJS Heap — The Primary Desync Risk

The JavaScript VM state (global variables, object graphs, function closures) is
**not** included in save states. This means:

- **Rollback** will restore the renderer, audio, and input state but **not** the
  cart's JS-side game logic (score, position, AI state, etc.).
- **Delay-based netplay** (frame delay rather than rollback) is largely unaffected
  because state is never rolled back — both peers run the same input sequence.

### Mitigation for cart authors

Carts that need netplay compatibility should mirror all game-logic state into
the Nova64 cheevos RAM via `poke(addr, value)` (addresses 0–255). This buffer
is included in save states and can be read back with `peek(addr)` after rollback.

Example pattern:

```js
// After every state-changing event:
poke(0, score & 0xFF);
poke(1, (score >> 8) & 0xFF);
poke(2, playerX & 0xFF);
poke(3, playerY & 0xFF);
```

For more than 256 bytes of state, a future `nova64.stateBuffer` API (planned)
will expose a larger host-managed serialized blob. Until then, carts should
keep rollback-critical state small.

---

## Non-Determinism Sources

The following inputs are the **only** sources of non-determinism in a Nova64
session. All other values are derived deterministically from inputs + initial seed:

| Source | How to make deterministic |
|---|---|
| `btn`, `btnp`, `axis`, `trigger` (all ports) | Injected by RetroArch netplay; same on both peers |
| `mouseX/Y`, `mouseBtn` | Not synchronized by default; avoid in netplay carts |
| `touchX/Y`, `touchCount` | Same caveat as mouse |
| `nova64.random.next()` | Seed both peers identically via `nova64.random.seed(n)` or harness `--seed N` |
| `nova64.time()` / wall clock | Do not use for game logic; use frame counter instead |
| File-backed storage reads | Results may differ if saves diverged; read only at cart init |

---

## Harness Determinism Testing

To verify that a cart produces bit-identical output from the same input sequence:

```bash
# Run twice from the same seed, compare checksums
retroarch/build/harness retroarch/nova64_libretro.so my-cart.nova --seed 42 --frames 60
retroarch/build/harness retroarch/nova64_libretro.so my-cart.nova --seed 42 --frames 60
```

Both runs should print the same `checksum=` value. If they differ, the cart
reads a non-deterministic source (time, file system, etc.) that must be removed
before enabling netplay.

---

## Save-State Versioning

Each save state begins with a `nova64_save_header` that includes a `version`
field (currently `1`). Mismatched versions produce a load failure with a log
message rather than silent corruption. This ensures that rolling back to a
state from an older core build fails loudly rather than quietly corrupting game
state.
