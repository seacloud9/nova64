---
name: nova64-mempalace
description: Guides alpha loop agents on using the mempalace knowledge graph for cross-session learning. Search before implementing 3D/runtime issues; capture non-obvious discoveries afterward. Graceful-skip if WSL/pipenv unavailable.
---

# Mempalace Integration for Alpha Loop

Mempalace is a persistent semantic knowledge graph that stores discoveries across sessions. Alpha Loop agents should use it to avoid rediscovering known patterns and to record non-obvious findings for future agents.

## When to search

Search mempalace **before** exploring the codebase when the issue involves:
- 3D rendering, shaders, materials, or the Three.js backend
- The `rgba8()` color system or BigInt color types
- Runtime API gaps (functions referenced in carts but not in source)
- Performance, memory leaks, or mesh lifecycle issues
- Any issue labeled "3D" or "runtime"

## How to search

```bash
pnpm mempalace:search "your search terms here"
```

Examples:
```bash
pnpm mempalace:search "rgba8 BigInt color material"
pnpm mempalace:search "setMeshEmissive missing API"
pnpm mempalace:search "cls3D transparent 3D cart"
pnpm mempalace:search "mesh leak draw update"
```

If the command fails (mempalace not running), skip gracefully — do not abort. Log a note: `[mempalace unavailable, skipping search]` and continue with codebase exploration.

## When to capture a discovery

Write a mempalace diary entry **after** implementation when you found:
- A runtime function that was called in carts but not defined in source
- A type boundary issue (BigInt, String vs Number, etc.) at an API seam
- A pattern that required reading >3 files to understand
- A bug that would have been prevented by this knowledge

```bash
pnpm mempalace:mine
```

Or, if the mempalace diary MCP tools are available, write directly:
```
mempalace_diary_write(entry: "Nova64 setMeshEmissive: was missing from transforms.js. Must be added to transforms module, registered in namespace.js and backend-surface.js, and capabilities.js must include meshOptions:true for Three.js. Carts must destructure it from nova64.scene, not call as bare global.")
```

If `pnpm mempalace:mine` is unavailable, skip — the implementation is still complete.

## Key known patterns (as of 2026-07)

These are already in mempalace. Do NOT re-search them if the issue is clearly something else:

- `rgba8()` returns BigInt, not Number — use `normalizeColorToHex()` from `materials.js` at any 3D/material API boundary
- `cls(0x000000)` in a 3D cart blacks out the 3D scene — use `cls3D()` instead
- `setMeshEmissive` must be destructured from `nova64.scene`, not called as a bare global
- Fog color, material color, emissive color: all need `normalizeColorToHex()` if accepting rgba8 input
- `meshOptions` must be in `THREEJS_BACKEND_CAPABILITIES` for `setMeshEmissive`/`setMeshColor`/`setMeshOpacity` to appear in `nova64.scene`
