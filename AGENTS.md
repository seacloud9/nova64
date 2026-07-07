# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

Tradeoff: These guidelines bias toward caution over speed. For trivial tasks, use judgment.

1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

State your assumptions explicitly. If uncertain, ask.
If multiple interpretations exist, present them - don't pick silently.
If a simpler approach exists, say so. Push back when warranted.
If something is unclear, stop. Name what's confusing. Ask.
2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

No features beyond what was asked.
No abstractions for single-use code.
No "flexibility" or "configurability" that wasn't requested.
No error handling for impossible scenarios.
If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

3. Surgical Changes
Touch only what you must. Clean up only your own mess.

When editing existing code:

Don't "improve" adjacent code, comments, or formatting.
Don't refactor things that aren't broken.
Match existing style, even if you'd do it differently.
If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:

Remove imports/variables/functions that YOUR changes made unused.
Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

4. Goal-Driven Execution
Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

"Add validation" → "Write tests for invalid inputs, then make them pass"
"Fix the bug" → "Write a test that reproduces it, then make it pass"
"Refactor X" → "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

Shared instructions for coding agents working in the Nova64 repository.

## Single Source of Truth

`AGENTS.md` is the only canonical source for agent-facing repository instructions. Tool-specific files such as `CLAUDE.md`, `CODEX.md`, `COPILOT.md`, and `GEMINI.md` must stay as thin pointers to this file, not independent guides.

When changing agent workflow, commands, architecture notes, or repository rules:

- Update `AGENTS.md` first.
- Keep tool-specific files limited to a short redirect to `AGENTS.md`.
- Do not copy large instruction blocks into tool-specific files.
- If another instruction file disagrees with `AGENTS.md`, verify against live source files and then reconcile the rule back here.

Current package version: `0.5.2`.

## 🖥️ **Windows Development Environment**

On Windows, always prefer WSL for repository work. Use WSL as the default shell for normal development, file inspection, search, `pnpm`, build, lint, format, and test commands.

```bash
# First, open WSL, then select Node 20
nvm use 20

# Now you can run pnpm commands
pnpm dev
```

Key points:

- Always use WSL for primary repo development on Windows.
- Prefer WSL even when a command could also run in PowerShell.
- Run `nvm use 20` before `pnpm` commands when working in WSL.
- Use native Windows tools only when the workflow specifically requires them, such as Godot `.exe` launches, Windows-only PowerShell scripts, or inspecting Windows-specific paths.
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
pnpm test:wad
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

## Selling / Distribution (Lemon Squeezy)

Nova64 sells prebuilt binaries (standalone desktop apps + RetroArch cores + Godot
source bundle) as **one product, one price** on Lemon Squeezy. Source stays public
(MIT) — buyers pay for ready-to-run convenience. **Honor system: no DRM, no license
keys, no webhook.** Lemon Squeezy hosts the download file; delivery is via its email
+ receipt page. Site deploys on Vercel (static).

One command builds and packages everything for upload:

```bash
pnpm release:lemon                # build desktop + cores + Godot → dist-lemon/nova64-<version>.zip
pnpm release:lemon --all-cores    # pull ALL platform cores (desktop+Android+Apple) from the latest GitHub Release
pnpm release:lemon --skip-build   # package existing artifacts only (no compilers)
```

Then upload `dist-lemon/nova64-<version>.zip` to Lemon Squeezy → Products → Nova64 →
replace the download file → Save. That is the entire recurring release job.

- Packager: `scripts/package-lemon-release.mjs`. Output: `dist-lemon/unified_export_build/`
  (`1-Run-Standalone/`, `2-RetroArch-Cores/{Desktop,Android,Apple}/`, `3-Godot-Source/`)
  + `START-HERE.txt`, `README.txt`, `SHA256SUMS.txt`, `LICENSE`. The Godot tier copies
  only **git-tracked** files (excludes the large third-party `godot_project/{assets,data}`).
- Standalone desktop `.exe`/Linux: `scripts/export-desktop.sh` + the `Windows Desktop` /
  `Linux/X11` presets (in `export_presets.cfg.example`; the live `.cfg` is gitignored).
  Needs Godot 4.5 export templates: `GODOT_VERSION=4.5 bash nova64-godot/scripts/install-godot-templates.sh`.
  One WSL/Linux host cross-exports BOTH Windows and Linux. macOS `.app` is a planned
  stretch (needs a Mac/CI runner + notarization).
- All RetroArch cores (incl. iOS/iPadOS arm64 + tvOS) build in
  `.github/workflows/release-cores.yml`; `--all-cores` pulls them into the bundle.
- Homepage Buy button lives in `index.html` `#cta` (`lemonsqueezy-button` + `?embed=1`)
  with lemon.js loaded before `</body>`.
- Full private runbook: `docs/LEMONSQUEEZY_SELLING.md` (**gitignored** — business ops doc).
  `dist-lemon/` and the desktop export output are gitignored too.

## CI preflight (know it's green before you push)

CI never runs on a local commit — it fires when you **push** (`ci.yml` on branch push;
`publish.yml` + `release-cores.yml` on a `v*.*.*` tag). So a **git pre-push hook**
(`.husky/pre-push`) runs `pnpm ci:check` ([`scripts/ci-preflight.mjs`](scripts/ci-preflight.mjs))
and only lets the push through if the gates are green — a red preflight blocks the push so you never
trigger a red CI.

- `pnpm ci:check` mirrors **ci.yml** blocking gates: `pnpm install --frozen-lockfile`, `pnpm test`,
  `pnpm build` (lint/format are reported but warn-only, matching `continue-on-error`).
- Pushing a **version tag** auto-runs `pnpm ci:check --release`, which adds the **npm publish**
  gates from `publish.yml`: lint becomes **blocking** (npm runs `prepublishOnly = lint && test:all
  && build`), runs `test:all`, checks the version isn't already on npm, and `npm publish --dry-run`.
- `pnpm ci:check --cores` also builds the host RetroArch core + conformance smoke.
- **Cannot be verified locally:** `release-cores.yml`'s macOS/iOS/tvOS jobs need a Mac + Xcode —
  they only go green on GitHub's `macos-latest` runner. The preflight says so explicitly rather than
  pretending. Bypass the hook for WIP with `git push --no-verify`.

## Secure commits

A `PreToolUse(Bash)` hook in `.claude/settings.json` runs `scripts/check-secure-commit.mjs`
before any `git commit` (including WSL-wrapped commits) and **blocks** the commit if staged
changes contain likely secrets (private keys, cloud/API tokens, hardcoded credentials, a real
`.env`). Placeholders like `YOUR_KEY`, `<redacted>`, and `*.env.example` are allowed. Never
commit with `--no-verify` to bypass it. Scan manually with `node scripts/check-secure-commit.mjs --scan`.

## MemPalace / MCP Memory

Nova64 uses MemPalace as the project memory layer. On Windows, launch MemPalace
through WSL, matching `.vscode/mcp.json` and the Codex MCP config:

```bash
cd ~/ai-tools
pipenv run mempalace-mcp
```

Useful repo scripts:

```bash
pnpm run mempalace:status
pnpm run mempalace:wake
pnpm run mempalace:repair-status
pnpm run mempalace:mine
pnpm run mempalace:mine:runtime
pnpm run mempalace:mine:retroarch
pnpm run mempalace:sync:retroarch
```

Memory workflow:

- Start coding sessions by checking `pnpm run mempalace:wake` when project history matters.
- Use `pnpm run mempalace:mine:retroarch` after meaningful RetroArch progress.
- Use `pnpm run mempalace:status` and `pnpm run mempalace:repair-status` when MCP startup or retrieval looks suspicious.
- Keep `.vscode/mcp.json` pointed at the WSL `mempalace-mcp` entrypoint so MCP clients can start the memory server automatically.

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
- Keep `CLAUDE.md`, `CODEX.md`, `COPILOT.md`, and `GEMINI.md` as short pointers to `AGENTS.md`.
- Treat root `BACKLOG.md` as the single source of truth for queued work across
  the whole project. Do not create per-area backlog files; add project,
  runtime, cart, Babylon, Godot, and RetroArch backlog items there.
- Keep lengthy tutorials, exhaustive API references, and speculative roadmaps in separate docs.
- If README or another non-agent doc diverges from the current repo, verify against live source files before carrying its content forward.
