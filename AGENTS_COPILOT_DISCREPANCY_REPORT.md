# AGENTS vs COPILOT Discrepancy Report

This report compares the new root `AGENTS.md` against the existing `COPILOT.md`.

## Scope and Source Choice

- `AGENTS.md` was derived primarily from `CLAUDE.md`, which was last updated on April 20, 2026 at 2:17 PM local time.
- `COPILOT.md` was last updated on April 20, 2026 at 2:14 PM local time.
- The new `AGENTS.md` was also cross-checked against `package.json`, `README.md`, and the current repository tree on April 22, 2026.
- There is currently no `.github/copilot-instructions.md` file in the repo.

## What `COPILOT.md` Contains That `AGENTS.md` Does Not

These are the main things present in `COPILOT.md` but not carried into `AGENTS.md`:

- A long tutorial-style API reference with large code samples for 3D objects, camera control, lighting, input, HUD, audio, and storage
- Extended gameplay and engine design patterns, including object pools, state management, and component-system examples
- Learning-resources sections with curated reading and example recommendations
- Deployment and distribution guidance
- Commit message formatting rules and quote-removal workflow
- A large "Systematic Improvement Plan" with proposed refactors, backlog items, and phased implementation ideas
- Historical version-roadmap sections that describe older and planned states of the engine

## Why Those Items Were Left Out of `AGENTS.md`

The omissions are intentional.

- `AGENTS.md` is meant to be a shared instruction file, not a full tutorial or product manual.
- Large code examples and exhaustive API catalogs are better kept in README or dedicated reference docs.
- Commit-message process rules are project workflow details, but they are not central enough to keep in the core shared agent instructions.
- Speculative roadmaps and improvement plans drift quickly and are better maintained as separate planning documents.
- Tool-specific framing for GitHub Copilot was removed to keep the shared file neutral across assistants.

## What `AGENTS.md` Adds or Updates

Compared with `COPILOT.md`, the new `AGENTS.md` is more current in a few important ways:

- It reflects the current package version `0.4.8`.
- It documents the current `package.json` script surface, including Playwright and Babylon-specific test commands.
- It keeps the current backend picture centered on Three.js plus the experimental Babylon backend.
- It explicitly calls out the need to think about backend parity when changing rendering behavior.
- It treats exact counts as re-verification items instead of freezing stale numbers into the shared doc.
- It establishes a single shared instruction file at the repo root for cross-agent use.

## Stale or Contradictory Material in `COPILOT.md`

Several parts of `COPILOT.md` appear stale relative to the current repo state:

- It presents `v0.2.0` as the current architecture and version history state, while `package.json` is currently `0.4.8`.
- It repeats `35/35 tests passing`, but the repository now includes a broader testing surface with Playwright and multiple Babylon-specific test scripts.
- Its architecture snapshot predates current repo expansion reflected in the README, including newer OS9 shell work, hyperNova-related updates, i18n work, and Babylon-focused browser tests.
- It uses a much more static documentation style with brittle counts and fixed snapshots that are harder to keep accurate as the repo changes.
- Parts of the improvement-plan section describe issues or missing files that no longer match the present tree, such as references to a missing `vite.config.js` even though `vite.config.js` exists.

Current repo facts checked during this update:

- `package.json` version: `0.4.8`
- Playwright and Babylon test scripts exist in `package.json`
- Example directories currently counted from `examples/`: `71`
- Runtime JavaScript files currently counted from `runtime/`: `55`

## Recommendation

- Keep `AGENTS.md` as the concise shared source of truth.
- Treat `COPILOT.md` as supplemental only until it is either trimmed down or rewritten to align with `AGENTS.md`.
- If `COPILOT.md` is retained, it should either be updated to match current repo facts or narrowed to Copilot-only behavior that does not duplicate the shared guidance.
