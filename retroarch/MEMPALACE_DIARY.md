# MemPalace Diary: RetroArch Rollout Preferences

This is a memory/progress note for MemPalace mining, not a replacement for the
canonical repository instructions in `../AGENTS.md`.

- Use WSL for Nova64 repo work on Windows.
- Before `pnpm` commands, run `nvm use 20`.
- Use `pnpm`, not npm or yarn.
- During RetroArch feature rollout, prefer fast batches:
  - Add several focused features at a time.
  - Add focused conformance carts and screenshots as features land.
  - Run `pnpm run retroarch:test:recent` for iteration.
  - Save the full `pnpm run retroarch:test` suite for the commit gate or when the
    user explicitly asks for full validation.
- Keep screenshots under `screenshots/retroarch/`.
- Use `pnpm run mempalace:mine:retroarch` after meaningful RetroArch progress.
- The current rollout is expanding the native libretro API surface with many
  small deterministic visual/runtime helpers, prioritizing quick conformance
  coverage and visible screenshots.
