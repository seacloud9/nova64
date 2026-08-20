# Nova64 Standalone Electron, Agentic AI, and VS Code Extension Plan

- **Repository:** seacloud9/nova64
- **Analysis baseline:** `main` at `b453b8c`, Nova64 0.5.3
- **Prepared:** 2026-08-19
- **Tracking epic:** [#9](https://github.com/seacloud9/nova64/issues/9) · Phase 0 issues: [#7](https://github.com/seacloud9/nova64/issues/7) (loop-safe `ready`), [#8](https://github.com/seacloud9/nova64/issues/8) (`needs-human-input`)
- **Status:** Phase 0 kicked off

> This is the canonical plan. It refines the original design with two execution layers the
> repo already runs on: **Alpha Loop** (automated plan→implement→test→review→PR) and
> **MemPalace** (cross-session project memory). Read §A and §B before starting any phase —
> they change *how* the technical phases in §1–§16 actually get done here.

---

## A. Alpha Loop execution model (READ FIRST)

Nova64 runs [Alpha Loop](https://github.com/bradtaylorsf/alpha-loop) against `ready`-labeled
GitHub issues. The loop is powerful but **fenced**. `.alpha-loop.yaml` enforces:

- `auto_merge: false` — every PR is reviewed and merged **manually** by the user.
- `max_issues: 5`, `max_session_duration: 3600`.
- `test_command: pnpm test` (fast demoscene + CLI gate, ~30s, no GPU).
- **`protected_paths`** (the loop **cannot** touch these): `dist/**`, `retroarch/**`,
  `pnpm-lock.yaml`, `package.json`, `.github/workflows/**`, `AGENTS.md`, `CLAUDE.md`.
- **`allowed_paths`**: `src/**`, `runtime/**`, `examples/**`, `tests/**`, `docs/**`,
  `os9-shell/src/**`.
- `block_labels: [do-not-automate, needs-human-input, retroarch, native]` — any issue with
  one of these labels is **skipped** by the loop.

### The consequence that reshapes this whole plan

**Almost all of the desktop/VS Code *infrastructure* lives outside `allowed_paths`.** New
top-level trees (`apps/`, `extensions/`, `packages/`), the pnpm workspace, `package.json`
edits, `pnpm-lock.yaml`, `electron-builder.yml`, and CI workflow changes are all either
protected or simply not in the allow-list. **The loop cannot scaffold this platform.**

So every phase is split into two work classes:

| Class | Who does it | Labeling | Why |
|-------|-------------|----------|-----|
| **Human-scaffold** | User + Claude interactively (this session's style) | `needs-human-input` | Touches `package.json`, new top-level dirs, workspace config, CI, `.alpha-loop.yaml` |
| **Loop-safe** | Alpha Loop autonomously | `ready` | Confined to `os9-shell/src/**`, `runtime/**`, `src/**`, `tests/**`, `docs/**` |

**Rule of thumb:** if an issue only edits files under `allowed_paths` and is gated by
`pnpm test`, label it `ready`. Otherwise label it `needs-human-input` and do it by hand.

### Two required config changes (human-scaffold, one-time)

1. **Widen `allowed_paths`** in `.alpha-loop.yaml` to include the new shared trees once they
   exist: `packages/**`, `apps/desktop/src/**`, `extensions/vscode/src/**`. Until this lands,
   the loop physically cannot help with any new-tree code. _(This edit itself is human — the
   loop can't edit its own fence.)_
2. **Extend `protected_paths`** to also guard `apps/desktop/electron-builder.yml`,
   `**/*.entitlements`, signing configs, and any `.env*`, so the loop can never churn
   packaging/secrets even after the trees are allow-listed.

### How to run the loop on a loop-safe issue

```bash
# From WSL, nvm use 20
alpha-loop run --once --dry-run   # preview: what would it do, no changes
alpha-loop run --issue <N>        # process one specific issue
alpha-loop run --epic <N>         # process the epic's checklist top-to-bottom
```

The loop opens a PR on `agent/issue-N`; **the user reviews and merges**. Failed tests retry
3× then mark the issue `failed` — no bad PR is opened.

---

## B. MemPalace learning protocol (per phase)

MemPalace is the project memory layer (WSL: `cd ~/ai-tools && pipenv run mempalace-mcp`;
repo scripts `pnpm mempalace:wake|status|mine`). It already holds ~24k drawers incl. a
`plan` room and a `decisions` room. This is a long, multi-session program — memory is what
keeps it coherent across compactions and loop runs.

**Search-before-implement (every phase, every non-trivial loop issue):**

- Before Electron/security work: `mempalace_search` for prior Electron, CSP, IPC, sandbox,
  and `postMessage` findings.
- Before Monaco/editor work: search os9-shell GameStudio + CodeMirror history.
- Before runtime-protocol work: search `EXECUTE_*` / `CART_LOG` message-flow history.
- The `nova64-mempalace` skill wraps this for loop agents — cart/runtime issues should load it.

**Capture-after (every merged phase slice):**

- `mempalace_diary_write` — what shipped, what was learned, what's next. Do this every 3–4
  commits (per token-efficiency preference), and at every phase boundary.
- `mempalace_kg_add` for durable decisions (e.g. "Preview renderer runs with no preload;
  `new Function` is confined there"). `mempalace_kg_invalidate` when a decision is superseded.
- Store phase-completion notes in the `plan` room; security decisions in `decisions`.

**Bridge to Claude auto-memory:** phase-level status + gotchas that affect *how I work* also
get a one-line pointer in `MEMORY.md` (this session's persistent index), so the next cold
session knows the program exists and where the plan lives.

---

## 1. Executive recommendation

Build **one shared Nova64 application platform** with two host applications:

- A **standalone Electron desktop app** with two isolated surfaces:
  - **OS** — the existing OS 9 shell.
  - **Dev** — Monaco editor, project files, runtime preview, console, and AI agent.
- A **VS Code extension** exposing the same core through native VS Code editors, commands,
  views, previews, and secure storage.

Do **not** build Electron and VS Code as separate implementations. Extract a small **shared
headless core** (workspace ops, runtime control, AI providers, agent tools, protocol types,
settings). Electron and VS Code provide **host adapters** for filesystem, secrets, process
execution, dialogs, and UI messaging.

Primary command: `nova64 desktop build` (all web builds, compile Electron, stage runtime
assets, package for current platform). Targeted:

```bash
nova64 desktop build --platform linux --arch arm64 --target deb
nova64 desktop build --preset rpi
nova64 desktop build --platform linux --arch x64 --target appimage
nova64 vscode package
```

Repo-dev pnpm mirrors: `pnpm desktop:dev|build|package:rpi`, `pnpm vscode:dev|package`.
_(All of these edit `package.json` → **human-scaffold**.)_

## 2. Current codebase assessment

**Strengths (already built):** published Vite fantasy console with CLI dispatcher in
`bin/nova64.js`; `os9-shell` is a separate React+TS Vite app with app registry, window
manager, virtual FS, desktop, menus, workspaces; `GameStudio.tsx` edits/saves/forks/exports
with live preview + console; Studio↔runtime message protocol (`EXECUTE_READY`,
`EXECUTE_CODE`, `EXECUTE_SUCCESS`, `EXECUTE_ERROR`, `CART_LOG`); `runtime/index.d.ts` for
Monaco/VS Code typings; simple CLI dispatcher ready for `desktop`/`vscode` families; existing
native-target + release staging to extend.

**Gaps:** no Electron main/preload/packaging/test harness; Game Studio uses **CodeMirror 6**,
not Monaco; single-document editor on localStorage + OS virtual FS (no real workspace, tree,
multi-model, dirty state, rename/delete, watching, conflict handling); OS shell base fixed to
`/os9-shell/` (fine for site, not for packaged app); **Studio receiver does not validate
sender/origin before executing code**; user code runs via `new Function` in the renderer; no
AI provider/secrets/approval/agent/history/context; no VS Code extension; root vs os9-shell
use different React/Zustand majors (shared core must avoid both); a tracked root `.env` must
be audited and excluded from every package.

**Security prerequisite (Electron):** `nodeIntegration:false`, `contextIsolation:true`,
`sandbox:true`, strict CSP, narrow `contextBridge` preload, sender+origin validation, schema
validation + size limits, navigation/new-window denial, explicit permission handlers,
network restriction for the cart-preview session. (Per official Electron security checklist +
preload guide.)

## 3. Target UX

**Desktop:** one window, persistent activity rail — **OS** icon (full OS 9 shell), **Dev**
icon (workspace), optional **AI** icon (focuses the Dev AI panel, *not* a third product
surface), project indicator, run status (stopped/starting/running/paused/failed). OS and Dev
keep their own nav, editor state, scroll, and layout across switches.

**Dev surface:** file explorer · editor tabs · Monaco · runtime preview · console/diagnostics
· AI chat/agent activity · status bar · Run/Stop/Reload/Build .nova/Export/Open-in-OS.
Default layout: left explorer+commands, center Monaco tabs, right preview/AI, bottom
console/diagnostics/tests/agent. Resizable, persisted per workspace.

**Isolation:** OS, Dev, and Preview are **separate renderer contexts**; switching changes the
visible view without reloading; only typed host messages cross. Use Electron **WebContentsView**
(not deprecated BrowserView). Persistent session partitions for OS and Dev; a separate
**restricted** partition for Preview with **no privileged preload**.

## 4. Repository structure (pnpm workspace; root `nova64` stays publishable)

```
nova64/
  apps/desktop/          src/{main,preload,navigation,dev-renderer}/ resources/ electron-builder.yml
  extensions/vscode/     src/{extension,views}/ media/
  packages/
    app-contracts/       # versioned message schemas, command ids, events, errors, capabilities
    workspace-core/      # project model, files, tabs, recents, watch contracts, cart discovery, build reqs
    runtime-host/        # run/stop/reload/preview messaging, logs, screenshots, runtime state
    agent-core/          # agent loop, tool registry, approval policy, context, run history, cancel, budgets
    ai-providers/        # provider config, model discovery, normalized streaming, errors, usage, adapters
    shared-ui/           # AI chat, approval cards, provider picker, run timeline (host-neutral React)
  os9-shell/  runtime/  bin/  scripts/  pnpm-workspace.yaml
```

**Hard rule:** `app-contracts`, `workspace-core`, `runtime-host`, `agent-core` import **no**
React/Electron/VS Code. That is what makes VS Code a real peer, not a rewrite.
_(Creating these trees + workspace = **human-scaffold**; the loop can only help **inside**
them after `allowed_paths` is widened per §A.)_

## 5. CLI & build command design (human-scaffold — edits `bin/` + `package.json`)

Extend `bin/nova64.js` with `desktop` and `vscode` families: `desktop dev|build|doctor`,
`vscode package|install`, plus `--preset rpi`, `--platform`, `--arch`, `--target`.

- `desktop dev`: start root runtime Vite + OS shell Vite + Dev renderer Vite, health-check
  all three, then launch Electron; tear down children on exit.
- `desktop build`: verify Node 20 + pnpm → desktop test gate → build root web runtime → OS
  shell (desktop mode) → Dev renderer → compile Electron main+preload → stage
  runtime/examples/OS/Dev/icons/license/metadata → package platform/arch/target → SHA256 +
  manifest → print artifact paths.
- `desktop doctor`: Node/pnpm, Electron cache, packaging tools, Linux desktop libs, signing
  env presence (no secrets printed), RPi arch/bitness, write perms.

Flags: `--platform current|linux|windows|mac`, `--arch current|x64|arm64`,
`--target unpacked|appimage|deb|rpm|snap|flatpak|dmg|zip|nsis`,
`--preset rpi|linux-store|desktop-all`, `--skip-tests`, `--dir`, `--publish never|draft|release`.

**RPi = Raspberry Pi OS 64-bit / ARM64 only** for the first release (deb + tar.gz). No ARMv7
promise until a real device test passes. **Packaging tool: electron-builder** (needs ARM64
Linux + AppImage/deb/Snap/Flatpak). Isolate the call behind `scripts/build-desktop.mjs` so
the tool is swappable.

## 6. Electron implementation (human-scaffold app code; loop-safe adapters where they touch `runtime/`/`src/`)

**Main-process services:** WindowController, ViewLayoutController, ProtocolService
(`nova64-app://`), WorkspaceService (real-path resolve, reject traversal, enforce workspace
boundary), RuntimeService, AgentService (AI + tools **outside** renderers), SecretService
(Electron `safeStorage`, ciphertext only), SettingsService, DialogService, BuildService
(approved Nova64 commands, structured streaming).

**Preload** exposes a **small** `NovaDesktopAPI` (`workspace.{open,read,write,list,watch}`,
`runtime.{run,stop,reload,onEvent}`, `agent.{start,cancel,approve,onEvent}`) via
`contextBridge`. **Never** expose raw fs, shell exec, arbitrary IPC, tokens, or provider
clients.

**Hosted assets:** two OS-shell build modes — `web` (`/os9-shell/` base, site) and `desktop`
(relative / custom-protocol URLs). Same for runtime resources. Production desktop **must not**
start Vite or hit localhost (dev mode may). Stage files via explicit manifest — **never**
wildcard the repo; exclude `.git`, `.env`, tests, store-build source maps, release staging,
dev creds.

**OS filesystem adapter (loop-safe candidate):** refactor the OS virtual FS behind a
`NovaFileSystem` interface (`read/write/list/mkdir/remove/move/exists`) with three adapters —
`IndexedDbFileSystem` (**keep** — hosted web OS must keep working), `ElectronFileSystem`,
`VSCodeFileSystem` (`vscode.workspace.fs`). The interface + IndexedDB adapter refactor lives
in `os9-shell/src/**` → **loop-safe**.

## 7. Monaco editor plan (mostly loop-safe — `os9-shell/src/**`)

Swap CodeMirror→Monaco **only after** workspace core exists (a direct swap freezes the
single-file limit and forces rework). Required Monaco: multi-tab, one model per URI,
JS/TS/JSON/MD/GLSL/HTML/CSS/text, dirty indicators, close variants, rename/delete/duplicate/
new, split preview, find/replace/palette/minimap/format/keybindings, per-file view state,
read-only demo + fork, diagnostics, Nova64 completions + hover, go-to-def for local modules,
format-on-save, disk-conflict prompt.

**Nova64 language support:** generate a Monaco lib bundle from `runtime/index.d.ts` at build,
inject via `addExtraLib`; stable model URIs so TS resolves project files. Snippets for
init/update/draw, scene, cameras/lights, input, sprites/UI, particles/effects, voxels, XR,
cart manifest. Use `nova64.*` namespaced APIs as canonical completions — **no** retired bare
globals in new snippets.

**Migration sequence:** extract Studio doc/run state from React → add workspace+tab tests on
the *current* CodeMirror UI → introduce `EditorAdapter` → implement `MonacoEditorAdapter` →
remove CodeMirror only after parity tests pass. _(Adding Monaco as a dep = `package.json` =
human-scaffold; the adapter + tests are loop-safe.)_

## 8. Runtime preview & execution hardening (⭐ the loop-safe starting point)

The Preview boundary intentionally runs user code — it is the most sensitive surface, **and**
the part of Phase 0 that lives entirely in `os9-shell/src/**` + `tests/**`, so it is the
ideal first Alpha Loop work.

**Changes:** versioned protocol in `app-contracts` (initially an inline module in
`os9-shell/src` until the package tree is allow-listed); schema-validate every message;
require `runId` + generation id on every request/response; verify sender is the known Dev
renderer / main port; **remove wildcard target origins in production**; reject messages
outside Studio mode; limit source + log-event size; deterministically supersede older runs;
reset shared cart state via the existing cart-reset pipeline; Preview runs with **no Node.js**
and **no privileged preload**; block navigation/popups/downloads/unapproved network in the
Preview session; watchdog that can destroy+recreate an unresponsive Preview. **Keep
`new Function` only inside this restricted renderer** — the agent and OS renderer never eval
generated source.

```ts
type RuntimeCommand =
  | { version:1; type:'runtime.run';    runId:string; source:string; entry:string }
  | { version:1; type:'runtime.stop';   runId:string }
  | { version:1; type:'runtime.reload'; runId:string };
type RuntimeEvent =
  | { version:1; type:'runtime.ready' }
  | { version:1; type:'runtime.started'; runId:string }
  | { version:1; type:'runtime.log';     runId:string; level:string; message:string }
  | { version:1; type:'runtime.error';   runId:string; error:SerializedError }
  | { version:1; type:'runtime.stopped'; runId:string };
```

## 9. Multi-provider agentic AI

**Architectural rule:** AI runs in a **privileged host process** — never in OS/Dev/Preview or
a VS Code webview renderer. UI sends requests to the host and receives normalized streaming.

Use **Vercel AI SDK 6** (`ToolLoopAgent`, multi-step tools + approvals) as the initial
provider/agent abstraction, wrapped by Nova64's own `ProviderRegistry` + `AgentHost` so the
product isn't coupled to one SDK. Providers, in order: OpenAI-compatible endpoint · OpenAI ·
local **MLX-LM** · **Ollama** (OpenAI compat) · **LM Studio** · other user endpoints ·
Anthropic · Google Gemini · optional Vercel AI Gateway. OpenAI-compat adapter: configurable
base URL, optional key (local), `/v1/models` discovery when available, manual model id,
connection test, streaming, tool-capability detection, gen settings, timeout+cancel. **Never
hardcode model ids.**

Contracts: `ProviderDefinition`, `ModelConfiguration`, `SecretStore`. Electron uses encrypted
`safeStorage`; VS Code uses `ExtensionContext.secrets` (encrypted, not synced).

**Agent modes:** Ask (read-only Q&A) · Plan (inspect + propose, no edits) · Edit (reviewed
edits) · Agent (bounded plan w/ tools+tests+runtime feedback). Each run: explicit workspace
root, provider+model snapshot, system-prompt version, step limit, token/cost budget (where
available), wall-clock timeout, cancellation, approval policy, append-only event log, final
summary + changed-file list.

**Tools:** read-only auto-allowed (`list_files`, `read_file`, `search_files`,
`get_diagnostics`, `get_runtime_logs`, `read_nova64_api`, `inspect_cart_manifest`); mutation
approval-required (`create_file`, `apply_patch`, `rename_file`, `delete_file`, `format_file`);
execution approval-required (`run_cart`, `run_tests`, `build_cart`, `package_cart`). **No
unrestricted shell tool at start** — a constrained runner with registered ops + arg schemas;
arbitrary commands only later behind an advanced setting + per-call approval.

**Approval UI:** name · reason · affected files/command · preview/patch · risk · Allow
once / Allow for run / Deny. Deletion, external writes, installs, arbitrary commands, and
publishing **always** require explicit approval.

**Context:** active file+selection, open files, manifest+tree, relevant search, Nova64 types +
selected API docs, diagnostics/logs/diff. Use **`rg` lexical search first**; add optional
local embeddings only with evidence lexical is insufficient (keeps RPi predictable).

**Verify loop (edit):** inspect → short plan → approve mutations → minimal patches → narrowest
tests → run/reload cart → inspect errors/logs → repair within budget → present changed files,
tests, risks, rollback.

## 10. VS Code extension (functional parity, not pixel parity)

Use **native VS Code editors** (already Monaco: tabs, search, format, keybindings, SCM,
a11y) — recreating an editor in a webview would be worse. Webviews **only** for runtime
Preview, Nova OS, and AI UI.

**Activity Bar container:** Projects/Carts tree · Runtime view · AI Agent view ·
Examples/Templates view. **Commands:** Create Cart, Create From Template, Run/Stop/Reload,
Open Runtime Preview, Open Nova OS, Build .nova, Validate Cart, Ask About Selection, Plan
Change, Run Agent, Select AI Provider, Configure Local Provider. **Editor:** Nova64 typings +
completions via generated type package + workspace config; snippets; CodeLens Run/Build;
diagnostics for missing lifecycle exports + manifest problems; symbol provider only if TS
doesn't cover it. **Preview:** webview panel, strict CSP, local resource roots, nonce
scripts, structured messaging; host owns files+commands. **Nova OS:** bundle desktop-mode OS
shell into a webview; VS Code FS adapter via host messages; never expose the VS Code API
globally in the webview. **AI:** run `agent-core` + `ai-providers` in the extension host;
reuse `shared-ui` React in a WebviewView; use `workspace.fs`, `WorkspaceEdit`, diagnostics,
tasks/commands, `secrets`, output channels. **.nova:** read-only custom editor **after** the
core extension is stable.

## 11. Packaging & store strategy (human-scaffold — CI + signing + `package.json`)

**Phase 1 artifacts:** RPi OS 64-bit/ARM64 → deb + tar.gz; Linux x64 → AppImage + deb; Linux
ARM64 → AppImage + deb; Windows x64 → NSIS + portable zip; macOS arm64/x64 → signed+notarized
DMG/zip. **Phase 2 stores:** Snap (x64+ARM64, confinement-tested), Flathub (x64+ARM64,
documented perms), Microsoft Store (MSIX after signing/identity), Mac App Store (separate
sandbox/entitlement/signing/review). RPi: ship ARM64 deb first; repo/Pi-Apps listing later.
**Store packaging ≠ producing an executable** — each needs metadata, icons, screenshots,
perms, signing, review, update policy.

**CI matrix on native runners:** Ubuntu x64 (Linux x64), Linux ARM64 / self-hosted Pi (ARM64
validation), Windows (signed), macOS (sign+notarize). Don't assume cross-build of ARM64 from
x64 once native deps exist. Keep initial shared packages **pure TypeScript** to reduce
arch-specific failures.

## 12. Testing & quality gates

**Shared core:** protocol schema, path-traversal/workspace-boundary, provider normalization,
streaming cancellation, tool-approval state, agent step/budget, deterministic patch tests.
**OS/Dev renderers:** existing OS tests green; workspace tree ops; Monaco model lifecycle;
dirty/conflict; tab restoration; run/stop lifecycle; AI streaming + approval UI. **Electron
(Playwright):** launch; OS↔Dev switch w/o reload; open/edit/save/reopen; run cart + logs;
reject forged runtime message; Preview has no Node globals; nav/popup blocking; API key never
in renderer storage/logs; per-target package smoke. **VS Code (`@vscode/test-electron`):**
command registration; workspace fs ops; preview messaging; OS panel launch; SecretStorage
adapter; agent edit via `WorkspaceEdit`; VSIX install smoke.

**Release gates:** `pnpm test` · `pnpm --filter nova64-os9-shell test` · `pnpm --filter
@nova64/desktop test` · `pnpm --filter @nova64/vscode test` · `pnpm desktop:build --dir` ·
`pnpm vscode:package`. Add new gates to `pnpm ci:check` **only after** they're reliable —
don't slow cart-only changes with packaging tests. **The Alpha Loop gate stays `pnpm test`
(fast)**; packaging gates are human/CI, never wired into the loop.

## 13. Delivery phases (each maps to Alpha Loop labeling)

Legend: 🤖 = loop-safe (`ready`) · 👤 = human-scaffold (`needs-human-input`).

- **Phase 0 — Protocol hardening.** 👤 pnpm workspace + `app-contracts` + widen
  `allowed_paths`. 🤖 harden browser Studio messaging (sender/origin validation, versioned
  schema, size limits, no wildcard targets) + forged-message regression tests. **Accept:** web
  Game Studio still runs carts; untrusted messages can't execute; root + OS tests pass.
- **Phase 1 — Minimal secure Electron shell.** 👤 main/preload/Navigation/OS-view/Dev-
  placeholder, `nova64-app://`, `desktop dev`, `desktop build --dir`. **Accept:** packaged app
  starts serverless; OS boots; OS/Dev keep state on switch; secure Electron defaults.
- **Phase 2 — Workspace + Monaco Dev.** 👤 workspace-core + Electron adapter + Monaco dep.
  🤖 file explorer, tabs, Monaco integration, Nova64 types/completions/snippets/diagnostics,
  disk save + watch. **Accept:** open a cart folder, edit multiple files w/ dirty state,
  reopen restores workspace, hosted OS unchanged.
- **Phase 3 — Sandboxed Preview.** 👤 separate Preview renderer + host-routed protocol +
  watchdog + nav/network policy. **Accept:** run demo carts from Monaco; hung cart stoppable/
  restartable; cart code can't reach Node or host fs.
- **Phase 4 — Providers + AI chat.** 👤 provider registry, OpenAI-compat/Anthropic/Google/
  Gateway, MLX-LM discovery, secure keys. 🤖 shared-ui streaming chat + cancel. **Accept:**
  switch providers w/o restart; local endpoint w/o key; no secret in renderer/logs/files.
- **Phase 5 — Agent tools + approvals.** 👤 agent-core wiring. 🤖 Ask/Plan/Edit/Agent modes,
  read/search/diagnostics/patch/test/build/runtime tools, approval cards, run history.
  **Accept:** agent edits a cart, runs tests, launches it, inspects errors, repairs; every
  mutation reviewable; cancel stops streaming + pending tools; deletion/external needs approval.
- **Phase 6 — VS Code core.** 👤 extension scaffold + VSIX. 🤖 activity container, cart tree,
  commands, runtime preview, OS panel, Nova64 language support. **Accept:** create/run/stop/
  reload/package a cart; open OS panel; native editors w/ Nova64 completions.
- **Phase 7 — VS Code agent parity.** 🤖 shared AI UI, provider config, SecretStorage adapter,
  tools via VS Code APIs. **Accept:** same provider profiles + agent modes both hosts; same
  request → equivalent patches; edits participate in undo/save/diagnostics.
- **Phase 8 — Linux + RPi packages.** 👤 ARM64 deb+tarball, x64/ARM64 AppImage, smoke scripts,
  RPi device test. **Accept:** cold launch on RPi OS 64-bit; WebGL cart preview runs; Monaco
  usable within memory targets; local AI optional, non-blocking.
- **Phase 9 — Stores + signed releases.** 👤 Snap/Flatpak manifests, signing/notarization,
  store metadata, update/rollback docs. **Accept:** store perms match features; signed
  artifacts install clean; manifest + checksums published.

## 14. Issue breakdown (the epic's checklist)

One epic + these implementation issues (label per §13; `#`s filled at creation):

1. 👤 pnpm workspace + `app-contracts` + widen `allowed_paths` — **#8**
2. 🤖 Harden Game Studio runtime messaging + forged-message tests — **#7**
3. 👤 Scaffold Electron main/preload/`nova64-app://`
4. 👤 OS/Dev WebContentsView switching
5. 👤 `desktop dev`/`build` CLI
6. 🤖 Extract OS `NovaFileSystem` interface (keep IndexedDB adapter)
7. 👤 Electron workspace adapter
8. 🤖 Dev file explorer + tab model
9. 🤖 Monaco integration + Nova64 typings _(dep add is 👤)_
10. 👤 Sandboxed Preview view + watchdog
11. 👤 Provider registry + encrypted secrets
12. 👤 OpenAI-compat (local + cloud) provider
13. 👤 Anthropic + Google providers
14. 🤖 AI chat + streaming UI (shared-ui)
15. 🤖 Agent tools, approvals, run history
16. 👤 VS Code extension scaffold + commands
17. 👤 VS Code runtime Preview + OS panel
18. 🤖 VS Code agent parity
19. 👤 Linux x64/ARM64 packages
20. 👤 RPi device CI / release smoke
21. 👤 Store manifests + signed release workflows

Each issue states its narrow verify command and never mixes security-boundary work with
visual redesign.

## 15. Definition of success

A user installs Nova64 on a 64-bit Raspberry Pi or desktop Linux, opens OS or Dev, edits a
real cart in Monaco, runs it in a sandboxed preview, asks an agent for a reviewed change using
a cloud **or** local model, and does the same essential workflow from VS Code — with **no**
second runtime or agent implementation.

## 16. Kickoff checklist (this session)

- [x] Plan written to `plans/NOVA64_DESKTOP_VSCODE_PLAN.md`
- [x] GitHub epic **#9** created; Phase 0 issues created (**#7** `ready`, **#8** `needs-human-input`)
- [x] MemPalace: diary entry recorded in `nova64`/`plan` (baseline `b453b8c` + phase map). NB: write tools require `agent_name` — omitting it returns a fake `-32000` error, not corruption.
- [x] `MEMORY.md` pointer added so cold sessions find this program
- [x] Phase 0 **#7 MERGED** to `main` via PR #10 (implemented by hand; loop was credit-blocked). 390/390 green.
- [x] Phase 0 **#8 done** on branch `scaffold/issue-8-workspace`: pnpm workspace + `packages/app-contracts` (re-exports `runtime/studio-protocol.js`, adds §8 `RuntimeCommand`/`RuntimeEvent` types) + widened `allowed_paths`. app-contracts smoke + root 390/390 + os9-shell 208/208 green. Awaiting your push + PR.
- [x] **Phase 1 done** (#11) on branch `feat/phase-1-electron-shell` (stacked on #8): `apps/desktop` secure Electron shell — activity rail + isolated OS/Dev `WebContentsView`s, `nova64-app://` serverless protocol, `nova64 desktop dev|build --dir` CLI. Headless smoke boot green (Electron v33).
- [x] **Phase 2 done** (#12) on branch `feat/phase-2-workspace-monaco` (stacked on #11): `@nova64/workspace-core` (model + path safety, 13 tests) + Electron `WorkspaceService` (disk I/O, containment guard, watch) + Dev surface (explorer, tabs, dirty tracking, save, session restore) via an `EditorAdapter` seam. Smoke: OS + Dev load clean, exit 0. **Monaco itself is the documented drop-in follow-up (`MonacoEditorAdapter`).**
- [ ] **NEXT: `MonacoEditorAdapter`** (Nova64 typings/completions/diagnostics from `runtime/index.d.ts`) → then **Phase 3** (sandboxed runtime Preview). Also pending: `@nova64/app-contracts` consumer rewire (from #8); top up alpha-loop API credits. See [`HANDOFF_2026-08-19.md`](./HANDOFF_2026-08-19.md).
