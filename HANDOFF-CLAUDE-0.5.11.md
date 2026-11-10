# Claude handoff — Nova64 0.5.11 and parity continuation

## Current continuation: restored demos and Godot parity

- Restored 112 missing tracked files from the Git index, using exclusive file creation so existing files could not be overwritten: 97 under `examples/`, 14 under `dist/examples/`, and one tracked source map. Includes all missing QWEN and Metaverse files and nine `.nova` bundles.
- Restored example files match Git exactly. No new restoration commit is needed; they were already tracked. The latest Metaverse work (`0ddbebb7`, core/plugins, Supabase auth and multiplayer lobby) is already an ancestor of remote main.
- Babylon emissive parity is committed as `a6d75790`; Godot sky presets, emissive parity and sky animation are committed as `cad6367f`.
- Restoration checks passed: all 11 Metaverse test files, all 22 Godot shim parity cases, and distribution sync. Normal pre-push validation passed and `cad6367f` was pushed to `origin/main`. Repository formatting remains a warn-only failure.
- The cause of the deletions is unknown; restoration does not establish which process removed them. No force push is needed.
- Claude's next planned work: add a missing-example safety check around Godot validation, then RetroArch tests and WASM release integration. Those changes are not implemented by this recovery.
- Keep generated distribution outputs and unrelated local plans/backups separate from source commits. Earlier release evidence below remains applicable to npm 0.5.11; newer Babylon/Godot commits require a future release to reach npm.

---


Release complete. This supersedes the publishing tasks and deferred bloom task in
`HANDOFF-NPM-0.5.10.md` and the older `HANDOFF-RELEASE.md`. Read `AGENTS.md` for repository instructions.

- **Main and tag:** `v0.5.11`, commit `324fb37bffe3e79c99e58b905d75fb46ad7bd7bb`, pushed to origin.
- **npm:** [nova64@0.5.11](https://www.npmjs.com/package/nova64/v/0.5.11) is publicly available and was verified as `latest`.
- **Release workflow:** [42774693679](https://github.com/seacloud9/nova64/actions/runs/42774693679) passed, including all ten native core targets and npm visibility verification.

Shipped the owner-approved Three.js bloom/material correction: authored `intensity`
and `emissive: true` preserve the intended glow and mesh palette; material caching
distinguishes emission intensities. Legacy shading and opacity remain intact.
Babylon emission behavior is unchanged. Source changes are in
`runtime/backends/threejs/gpu-threejs.js` and `materials.js`; regression coverage
is in `tests/test-color-compat.js`, with visual evidence in `tests/artifacts/bloom/`.

Refreshed the README for npm with current setup, demos, API and host support, plus
prominent links to [nova64.io](https://nova64.io/) and [live documentation](https://nova64.io/docs).
Both the installed package README and npm registry README contain those links.
The separate nova64.io website deployment was not changed.

Validation: full release/pre-push gates passed; a fresh public-registry installation
passed CLI scaffolding/server regression and browser smoke checks (22 vault links,
Super Plumber on Three.js, Space Harrier on Babylon), with zero runtime errors.
Downloaded macOS core matched its published SHA256. Fresh-install evidence is at
`/tmp/nova64-registry-review-0.5.11/report.json` (temporary local artifact).

Known caveats: local npm homepage still has the existing analytics and
`{{ heroSrc }}` placeholder 404s. Repository-wide formatting reports remain
nonblocking. npm can take several minutes to validate an accepted upload;
the workflow now allows ten minutes. No force push or duplicate publish was needed.

No release work remains. Preserve the original checkout's unrelated dirty `dist/`
files, QuickJS submodule, plans, and stale cart directory. The isolated release
worktree is `/tmp/nova64-release-0.5.10`, branch `release/npm-0.5.11`.
The approved local preview was left running at http://127.0.0.1:3207/console.html.
