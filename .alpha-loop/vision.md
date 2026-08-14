# Nova64 — Project Vision

## What Nova64 Is

Nova64 is a JavaScript 3D fantasy console — a platform that lets you write short, self-contained game "carts" that run in the browser, as a RetroArch core, inside Godot, and eventually in XR. Think PICO-8 but 3D-first, with a modern GPU pipeline (Three.js primary, Babylon.js secondary), 2D HUD overlays, and a rich library of built-in API functions that carts call directly.

Nova64 sells prebuilt binaries (desktop apps + RetroArch cores + Godot source bundle) as a single product on Lemon Squeezy. The source stays public (MIT). Buyers pay for ready-to-run convenience.

## What Autoloop Should Work On

Alpha Loop is the right tool for any issue in these areas:

- **Cart creation / improvement** — new `examples/<cart>/` directories, improving existing demos (better gameplay, sfx, high scores, visuals, post-processing)
- **Runtime bugfixes** — fixes to `runtime/*.js` that don't touch rendering backends
- **CLI improvements** — `bin/commands/` work, `nova64 init`, `nova64 template`
- **Test additions** — new test scripts or expanding existing ones in `tests/`
- **Docs** — `docs/`, `CHEATSHEET.md`, `AGENTS.md` prose updates
- **`os9-shell/`** — shell UI improvements

## What Autoloop Must NOT Touch

These areas require human review before any PR is opened:

- `dist/**` — built artifacts; the agent must never edit these directly (they're written by `pnpm sync:dist` or `pnpm build`)
- `retroarch/**` — native C core; the agent cannot build or modify
- `pnpm-lock.yaml`, `package.json` — dependency changes need human sign-off
- `.github/workflows/**` — CI/deploy pipeline changes need human sign-off
- `AGENTS.md`, `CLAUDE.md` — single sources of truth; change manually only
- Any change involving auth, billing, production deploy, or secrets

## Cart Development Rules (for implementers)

The single most important rule for cart work:

> **Every edit to `examples/<cart>/code.js` must be followed immediately by `pnpm sync:dist <cart>`.** The browser console loads from `dist/`; `examples/` is the source. `pnpm test` will catch drift, but sync first.

Additional cart rules:
- Use `cls3D()` in 3D carts — `cls(0x000000)` is opaque and blocks all 3D rendering
- Create meshes in `init()` only — never in `update()` or `draw()`
- Call `destroyMesh(handle)` on all old mesh handles before `init()` recreates the scene
- Use the `nova64-cart-dev` skill for API reference and patterns

## Success Criteria for a Cart Issue

A cart issue is done when:
1. `examples/<cart>/code.js` implements the acceptance criteria
2. `dist/examples/<cart>/code.js` is byte-identical (verified by `pnpm sync:dist:check`)
3. `pnpm test` passes (includes dist-sync check and demoscene regression)
4. The PR references the issue number

## Technology Stack

- **Runtime**: Three.js (primary), Babylon.js (secondary experimental)
- **Build**: Vite, pnpm (never npm or yarn)
- **Tests**: Node.js scripts + Playwright
- **Hosting**: Vercel (static)
- **Cart language**: ES modules, no bundler — just `export function init/update/draw`

## Scope Limits

Nova64 is a focused project. Agents should:
- Not add new npm dependencies without human sign-off
- Not change the cart API surface without updating both `runtime/api*.js` and `docs/CHEATSHEET.md`
- Not introduce abstractions or features beyond what the issue explicitly asks for
- Follow AGENTS.md § "Simplicity First" — minimum code that solves the problem
