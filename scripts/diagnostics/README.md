# scripts/diagnostics

Persistent debugging helpers for cart + backend render investigations.
Promoted out of `tmp/` (which is local-only scratch) so they don't get
discarded between sessions.

All scripts spin up a local Vite server on port 3017 and drive
`console.html` (Three.js) or `babylon_console.html` (Babylon.js) via
Playwright's bundled Chromium. They probe console messages, read canvas
pixels, capture screenshots, and assert specific cart states.

Run any of them from the repo root via WSL bash (Husky + nvm 20):

```
bash scripts/diagnostics/run-combat-proof.sh
bash scripts/diagnostics/run-babylon-shader-check.sh
bash scripts/diagnostics/run-indie-glb-combat-check.sh
node scripts/diagnostics/indie-level-visual-check.mjs
```

The `*.mjs` scripts can also be invoked directly if you already have Vite
running on the expected port (override with `NOVA64_TEST_BASE`).

## Scripts

### `run-combat-proof.sh` → `combat-visual-proof.mjs`

Loads indie-odyssey on Three.js, forces combat with `data_imp` +
`glitch_rat`, waits for both GLBs to reach `spriteStatus === 'ready'`,
then captures the actual `#screen` canvas bitmap via
`canvas.drawImage()` + `toDataURL()` and saves to
`screenshots/indie-odyssey-fix/combat_visual_proof.png`. Also reports
the centre-pixel RGBA so you can grep for "is it black or purple?"
without opening the image.

Use this whenever you change combat scene setup (lighting, skybox,
camera) and want to confirm the rendered output didn't regress to
black, or to compare colour pixel-precisely against a previous run.

### `run-babylon-shader-check.sh` → `babylon-shader-check.mjs`

Loads indie-odyssey on Babylon, forces combat, and samples 3 seconds
of console output. Filters for `error` / `warning` / shader-related
text (`shader|glsl|compile|program link|fragment|vertex|effect`).
Prints a summary so you can verify the cart boots cleanly on Babylon.

**Caveat**: Babylon emits some shader-compile failures via its
internal `BJS - [...]:` logger which arrives as `console.log` (not
`console.error`). The filter above catches the substring `compile`
but a clean exit isn't a guarantee Babylon's PBR shader actually
compiled — also check the browser DevTools console manually if you
see weirdly dark or untextured output.

### `run-indie-glb-combat-check.sh` → `indie-glb-combat-check.mjs`

Loops both backends (Three.js → Babylon), forces combat in each, and
asserts the cart's `__INDIE_ODYSSEY_STATE` indicates the GLB enemies
loaded correctly. Useful as a quick smoke test before running the
full Playwright suite.

### `indie-level-visual-check.mjs`

Loads indie-odyssey on both Three.js and Babylon, advances through the
story into the first dungeon view, captures `#screen`, and prints simple
brightness/glow statistics. Use this when tuning Babylon/Three visual
parity for the dungeon level. It writes:

- `screenshots/indie-odyssey-fix/threejs-level-current.png`
- `screenshots/indie-odyssey-fix/babylon-level-current.png`

## When to promote into the playwright suite

These are kept here (not in `tests/playwright/`) because they're
exploratory / interactive — they print to stdout, leave the
screenshot artefact behind, and are meant to be eyeballed. When a
particular signal becomes worth catching in CI, port the assertion
into `tests/playwright/indie-odyssey.spec.js` or a sibling spec.
