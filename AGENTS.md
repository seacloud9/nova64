# AGENTS.md

Shared instructions for coding agents working in the Nova64 repository.

This file is the canonical cross-agent guide for the repo. It is based primarily on the current `CLAUDE.md`, then cross-checked against `package.json`, `README.md`, and the live repository structure so it reflects the current Nova64 state more accurately than older tool-specific docs.

Current package version: `0.4.9`.

## 🖥️ **Windows Development Environment**

On Windows, always use WSL for normal `pnpm`-based repository work.

```bash
# First, open WSL, then select Node 20
nvm use 20

# Now you can run pnpm commands
pnpm dev
```

Key points:

- Always use WSL for primary repo development on Windows.
- Run `nvm use 20` before `pnpm` commands when working in WSL.
- Keep command guidance aligned with the scripts defined in `package.json`.
- Do not rewrite repository instructions around `npm` or `yarn` unless the repo itself changes.

## Development Commands

Always use `pnpm` for package management, development, testing, linting, and formatting.

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Core CLI-driven test suite
pnpm test
pnpm test:api
pnpm test:input
pnpm test:starfox
pnpm test:integration
pnpm test:voxel
pnpm test:resize
pnpm test:cli
pnpm test:all
pnpm test:watch

# Browser and Playwright coverage
pnpm test:playwright
pnpm test:playwright:ui
pnpm test:playwright:debug

# Babylon backend coverage
pnpm test:babylon
pnpm test:babylon:ui
pnpm test:babylon:api
pnpm test:babylon:perf
pnpm test:babylon:visual
pnpm test:babylon:gameplay
pnpm test:babylon:all

# Benchmarks
pnpm bench
pnpm bench:material
pnpm bench:instancing
pnpm bench:mesh

# Lint and format
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
pnpm validate
```

Additional guidance:

- Treat `package.json` as the source of truth for available scripts.
- Use the narrowest relevant script first when making targeted changes.
- Expand to broader validation when a change affects shared runtime behavior, rendering, or cross-backend compatibility.

## CLI Tool (`bin/nova64.js`)

The Nova64 CLI provides project scaffolding, template cloning, and local development workflows.

```bash
# Create a new empty project
nova64 init my-game

# Browse and clone from templates
nova64 template

# Clone a specific template directly
nova64 template star-fox-nova-3d

# Start the dev server in a project directory
cd my-game && nova64 dev

# Launch the full console with demos
nova64 --start-demo
```

### CLI Architecture (`bin/commands/`)

- `bin/nova64.js` - main entry point
- `bin/commands/init.js` - project scaffolding
- `bin/commands/template.js` - template picker and template cloning
- `bin/commands/dev.js` - local development server flow

### Scaffolded Project Structure

```text
my-game/
|-- code.js
|-- index.html
`-- package.json
```

Agents working on the CLI should keep `bin/`, `package.json`, and any related docs in sync.

## Debug Panel (`runtime/debug-panel.js`)

Nova64 includes an in-browser debug overlay for inspecting runtime state and scene behavior.

### Activation

- Press `F9` to toggle the debug panel.
- Add `?debug=1` to the URL to auto-open the panel on load.
- Use `Shift+X` for the developer console described in `README.md` and wired through `runtime/env.js`.

### Related Runtime Hooks

- `runtime/debug-panel.js` powers the overlay.
- `runtime/env.js` contains developer-console related behavior.
- `src/main.js` exposes Three.js globals used by devtools and inspection workflows.

### Typical Uses

- Inspect scene graph structure
- Review camera and light state
- Watch runtime stats and debug output
- Confirm that cart behavior changes are visible without stepping outside the browser

## Architecture Overview

Nova64 is a JavaScript 3D fantasy console built around a shared runtime, a cart-loading model, multiple rendering backends, browser-based tools, and a large example/demo surface.

### Core Components

GPU backends:

- `runtime/gpu-threejs.js` - public Three.js backend entrypoint
- `runtime/gpu-babylon.js` - public Babylon.js backend entrypoint
- `runtime/gpu-webgl2.js` - fallback backend
- `runtime/gpu-canvas2d.js` - compatibility fallback
- Babylon voxel parity work also has a guarded NOA investigation seam; read `docs/BABYLON_NOA_PROTOTYPE.md` before attempting a deeper Babylon-only voxel engine swap.

Backend adapter layer:

- `runtime/engine-adapter.js`
- `runtime/engine-adapter-babylon.js`
- `runtime/framebuffer.js`

Core runtime:

- `runtime/api.js`
- `runtime/api-2d.js`
- `runtime/api-3d.js`
- `runtime/api-effects.js`
- `runtime/api-filters.js`
- `runtime/api-gameutils.js`
- `runtime/api-generative.js`
- `runtime/api-particles-2d.js`
- `runtime/api-presets.js`
- `runtime/api-skybox.js`
- `runtime/api-sprites.js`
- `runtime/api-voxel.js`
- `runtime/audio.js`
- `runtime/cart-reset.js`
- `runtime/collision.js`
- `runtime/console.js`
- `runtime/data.js`
- `runtime/editor.js`
- `runtime/font.js`
- `runtime/input.js`
- `runtime/logger.js`
- `runtime/manifest.js`
- `runtime/namespace.js`
- `runtime/physics.js`
- `runtime/storage.js`
- `runtime/textinput.js`
- `runtime/tween.js`
- `runtime/ui.js`

Display and scene systems:

- `runtime/camera-2d.js`
- `runtime/canvas-ui.js`
- `runtime/fullscreen-button.js`
- `runtime/movie-clip.js`
- `runtime/screens.js`
- `runtime/stage.js`
- `runtime/store.js`

Media and assets:

- `runtime/assets.js`
- `runtime/asset-loader.js`
- `runtime/wad.js`

Advanced systems:

- `runtime/hype.js`
- `runtime/i18n.js`
- `runtime/mediapipe.js`
- `runtime/nft-seed.js`
- `runtime/xr.js`
- `runtime/voxel-mesh-worker.js`

Additional modular 3D implementation files:

- `runtime/api-3d/camera.js`
- `runtime/api-3d/instancing.js`
- `runtime/api-3d/lights.js`
- `runtime/api-3d/materials.js`
- `runtime/api-3d/models.js`
- `runtime/api-3d/particles.js`
- `runtime/api-3d/pbr.js`
- `runtime/api-3d/primitives.js`
- `runtime/api-3d/scene.js`
- `runtime/api-3d/transforms.js`
- `runtime/api-3d/tsl.js`

### Key Architectural Patterns

GPU contract expectations:

- GPU backends must provide `getFramebuffer()`.
- GPU backends must provide `supportsSpriteBatch()`.
- GPU backends must provide `beginFrame()` and `endFrame()`.
- GPU backends must provide `resize(w, h)`.

Runtime exposure:

- Many runtime modules expose APIs through `.exposeTo(globalThis)`.
- Shared cart-facing behavior should be treated as compatibility-sensitive.

Backend behavior:

- Three.js is the primary path.
- Babylon.js is a secondary experimental path that still needs serious compatibility attention.
- Babylon compatibility shims now live in `runtime/backends/babylon/compat.js`; if a cart or runtime helper depends on a Three-style object API, prefer extending that layer over adding scattered `if (backend === 'babylon')` branches.

Cart reset behavior:

- `runtime/console.js` now runs a shared cart-reset pipeline before each cart load.
- Default browser hooks are registered from `src/main.js`.
- If you add a runtime module with mutable global or long-lived cart state, register a cart reset hook instead of relying on page reloads or cart-local cleanup.
- Babylon voxel rendering now also has a dedicated backend helper in `runtime/backends/babylon/voxel.js`; if a change touches `runtime/api-voxel.js`, prefer routing chunk/entity mesh creation through backend-aware helpers instead of creating raw Three.js meshes in shared code.
- If a change touches rendering, adapters, materials, cameras, lights, or cart-facing 3D APIs, think about both backends.
- Babylon mode can be reached through `babylon_console.html` or the `?backend=babylon` URL parameter.

Change-management expectations:

- Avoid freezing brittle numeric claims into the shared doc when those counts will drift.
- If you add or rename scripts, update docs that mention them.
- If you change the CLI, keep command docs and implementation synchronized.
- If you change Babylon compatibility behavior, update `docs/BACKEND_RUNTIME.md` and the focused Playwright parity coverage alongside the code.
- If another instruction file disagrees with live code, verify against source files before copying it forward.

## Cart System

Nova64 carts are ES modules built around three lifecycle hooks:

- `init()` for long-lived setup
- `update(dt)` for game logic, input handling, and animation
- `draw()` for overlay and HUD rendering

Guidelines:

- Create long-lived 3D objects in `init()`, not in `draw()`.
- Put gameplay updates, movement, timers, and animation in `update(dt)`.
- Use `draw()` for 2D overlay work and cart-facing HUD behavior.
- When changing shared APIs, review both example carts and tests that depend on them.
- When changing rendering behavior, think about how the same cart should behave under both Three.js and Babylon.

## Cart Development

### Typical Workflow

1. Create or edit a cart under `examples/`.
2. Update the import path in `src/main.js` if you need to load a different cart locally.
3. Run the narrowest relevant test script first.
4. Expand to broader CLI, Playwright, or Babylon validation if the change affects shared behavior.

### Practical Validation Guidance

- Use `pnpm test` for the core CLI-driven suite.
- Use `pnpm test:playwright` for browser-level end-to-end coverage.
- Use the `pnpm test:babylon*` scripts for backend parity, API, performance, visual, and gameplay checks.
- Use `pnpm validate` when you need format, lint, and core test coverage together.

### Agent Working Rules

- Keep this file tool-neutral.
- Avoid assistant-branded instructions in the shared repo guide.
- Prefer stable rules over frozen snapshots that will age badly.
- If a change touches shared APIs, cart loading, or runtime behavior, inspect both code paths and tests before declaring the change complete.

## Project Structure

### Core Entry Points

- `src/main.js` - runtime bootstrap, cart loading, backend wiring
- `console.html` - main console page
- `babylon_console.html` - Babylon backend console page
- `cart-runner.html` - lightweight runner used by CLI dev flows
- `vite.config.js` - build configuration
- `package.json` - scripts, dependencies, package metadata

### Major Repository Areas

- `runtime/` - stable runtime/public layer, wrappers, shared APIs, runtime systems
- `runtime/backends/` - internal renderer-specific implementations for `threejs/` and `babylon/`
- `runtime/shared/` - cross-backend contracts and helpers used by multiple runtimes
- `src/` - application bootstrap and wiring
- `examples/` - carts and demos
- `tests/` - CLI-driven tests and Playwright coverage
- `os9-shell/` - Mac OS 9-style desktop shell and related tools
- `docs/` - architecture and reference documentation
- `public/` - public assets and shell payloads
- `bin/` - CLI entry and command implementations

### Documentation Expectations

- Treat `AGENTS.md` as the shared source of truth for cross-agent repo instructions.
- Keep lengthy tutorials, exhaustive API references, and speculative roadmaps in separate docs.
- If `CLAUDE.md`, `COPILOT.md`, README, or another instruction file diverges from the current repo, verify against live source files before carrying its content forward.
