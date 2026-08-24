# @nova64/desktop

Nova64 standalone desktop application (Electron). Phase 1 of the desktop/VS Code
platform program — see [`plans/NOVA64_DESKTOP_VSCODE_PLAN.md`](../../plans/NOVA64_DESKTOP_VSCODE_PLAN.md)
§6 and the [handoff](../../plans/HANDOFF_2026-08-19.md).

## What Phase 1 delivers

One secure window with a persistent **activity rail** switching between two
**isolated renderer surfaces**:

- **OS** — the existing OS 9 shell (`os9-shell`).
- **Dev** — placeholder for now; Monaco + preview + console + AI land in Phase 2+.

Switching surfaces changes visibility only; neither reloads, so each keeps its
scroll, editor, and layout state.

## Architecture (`src/main/`)

| Module | Responsibility |
| --- | --- |
| `main.js` | App entry; single-instance lock; registers protocol; creates the window; smoke/devtools hooks. |
| `window-controller.js` | Frameless window; creates the chrome frame + OS/Dev/Settings `WebContentsView`s; switches surfaces; owns `nav:*` + `window:action` IPC. |
| `view-layout.js` | Bounds on resize: chrome fills the window; content is inset below the titlebar / right of the rail. |
| `protocol.js` | `nova64-app://` scheme — serves chrome (`nav`), `dev`, `settings`, `shared`, `lib`, `agent` from source and the `os` surface from the built web app, with path-traversal containment. |
| `security.js` | Shared secure `webPreferences`, per-`webContents` hardening (deny popups/navigation/webviews/permissions), and a strict CSP. |
| `settings-service.js` | Persists app settings (theme) to `userData/settings.json`; broadcasts `settings:changed`; owns `settings:*` IPC. |
| `workspace-service.js` | Disk I/O for the Dev surface (read/write/list/search/remove) with a workspace-containment guard; `workspace:*` IPC. |
| `secret-service.js` | Encrypted secret storage (API keys) at `userData`. |
| `ai-service.js` | Host-side LLM providers (`@nova64/ai-providers`); streams normalized chat events to Dev; injects the mode + tool system prompt (`@nova64/agent-core`); `ai:*` IPC. |
| `agent-tool-service.js` | Backs `@nova64/agent-core`'s ToolRunner with the workspace (read/list/search/write/delete), gated by mode + approval; `agent:run-tool` IPC, Dev-trusted only. |
| `preload/{chrome,dev,settings}-preload.js` | Sandboxed CommonJS bridges — `novaShell` (nav + window controls), `novaWorkspace`, `novaAi`, `novaAgent`, `novaSettings`, and the shared `novaTheme`. Never expose `ipcRenderer`, Node, or fs. |

## Security posture

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` on **every** view.
- `WebContentsView` (not `BrowserView`, not `<webview>`).
- Narrow `contextBridge` preload only on the rail; content surfaces have no privileged preload.
- IPC handlers verify the sender is the rail's `webContents` and validate the target.
- Popups denied, navigation restricted to allowed origins, `<webview>` blocked, permissions denied.
- Strict CSP; `object-src 'none'`; `frame-ancestors 'none'`.
- No localhost/server in production — assets load over `nova64-app://`.

## Running

From the repo root (WSL, `nvm use 20`):

```bash
pnpm install            # installs Electron into apps/desktop
pnpm osBuild            # build the OS 9 shell into public/os9-shell (once / when it changes)

# Dev — local server + Electron (recommended for review, --devtools opens the inspector):
nova64 desktop dev --devtools    # or: node bin/nova64.js desktop dev --devtools

# Serverless — stage assets, then launch with no server:
nova64 desktop build --dir
pnpm --filter @nova64/desktop start
```

> On Windows, launch the GUI from the native Windows shell so Electron uses the
> Windows binary. Under WSL without an X server the window cannot display.

### Dev mode vs serverless

- **Dev mode** (`nova64 desktop dev`) serves the *entire* Nova64 root (OS shell **and** the
  runtime — `console.html`, `cart-runner.html`, assets) from one origin, so the OS apps that
  embed the runtime (Nova64 Console, Game Studio) work end to end. Use this for review.
- **Serverless** (`build --dir` + `start`) currently stages only the OS shell, so OS apps that
  iframe the runtime won't fully resolve. The protocol maps os9-shell's hardcoded `/os9-shell/`
  base onto the staged root; a full desktop-mode OS/runtime build (relative base, runtime
  staged) is the follow-up — see plan §6.3.

### Reviewing under WSL (WSLg)

Windows 11 WSLg renders the Linux Electron window on your Windows desktop. Notes:

- Pass `--no-sandbox` (or `ELECTRON_DISABLE_SANDBOX=1`) — the pnpm-store Electron's SUID
  sandbox isn't configured under WSL. `--disable-gpu` avoids a benign GPU-init warning.
- On Linux the app auto-applies two WSLg fixes (`src/main/main.js`): `--force-device-scale-factor=1`
  (WSLg reports a fractional scale that otherwise blows the window past the viewport) and
  `--enable-unsafe-swiftshader` (WSLg has no hardware GPU, and Chromium's software-WebGL fallback
  — required by the 3D cart preview — is now gated behind this flag). The window also opens capped
  to the screen work area and centered, so it never exceeds the visible viewport.
- **Emoji icons need a color-emoji font.** The OS shell uses emoji app icons; a stock WSL has
  no emoji font, so they render as empty boxes. Install one (no sudo needed):
  ```bash
  mkdir -p ~/.local/share/fonts
  curl -fsSL -o ~/.local/share/fonts/NotoColorEmoji.ttf \
    https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf
  fc-cache -f ~/.local/share/fonts
  ```
  This is a WSL-only display gap — on native Windows the emoji render via Segoe UI Emoji.

## Shell, theming & settings

- **Edge-to-edge frameless window** (`frame: false`): the chrome view renders a custom
  draggable titlebar with min/max/close controls (`window:action` IPC); content is inset below
  the titlebar and right of the activity rail. No native OS chrome.
- **Activity rail:** OS · Dev · ⚙️ Settings (gear, bottom).
- **Theming** is centralized in `src/shared/theme.css` as CSS-variable tokens, with built-in
  themes `dark` · `midnight` · `light` · `high-contrast`. `SettingsService` persists the choice
  to `userData/settings.json` and broadcasts `settings:changed`; the shared `theme-apply.js`
  (loaded by every surface) sets `<html data-theme>`, so the whole app restyles **live**.
  - **Add a theme:** copy a `[data-theme='…']` block in `theme.css`, then add its id to `THEMES`
    in `src/main/settings-service.js`. Surfaces consume the tokens automatically.
  - The OS shell keeps its own retro OS 9 look (not themed).
- **Settings surface** (`src/settings/`) is the control center: live theme picker (with swatches)
  + an About panel. Backed by the narrow `novaSettings` preload bridge.

## Dev editor (Monaco)

The Dev surface uses **Monaco** behind the `EditorAdapter` seam (`src/dev/monaco-adapter.js`),
with a **textarea fallback** if it fails to load. Monaco's AMD build is served over the
`nova64-app://monaco` protocol host (resolved from `node_modules`, no bundler); its language
workers run from a same-origin blob that `importScripts` the cross-origin worker, so the strict
CSP is preserved (no `unsafe-eval`). The editor theme follows the app theme.

**Nova64 completions:** `scripts/gen-nova64-dts.mjs` generates cart-facing `.d.ts` from the
canonical `runtime/namespace.js` `NAMESPACE_MAP` (into `src/dev/nova64-types.js`), which Monaco
loads via `addExtraLib` — so `nova64.*` and the flat cart globals autocomplete. `nova64 desktop
dev|build` regenerate it to stay in sync. Names are accurate; signatures are loose (`any`).

## Run a cart

The Dev surface's **▶ Run** (Ctrl/Cmd+Enter, or File → Run Cart) executes the *current editor
contents* of the active cart in an embedded Nova64 runtime, shown in a **preview modal** —
a centered, viewport-bounded overlay (never stretches past the window) with the cart canvas on
top and a **run console** beneath it, closable via **×**, the backdrop, or **Esc**
(`src/dev/preview.js` + the `.preview-modal` styles).

The modal iframe loads the **lean cart-runner page** (`cart-runner.html?studio=1`, a bare CRT
screen) rather than the full console shell (`console.html`), so it isn't cramped by the hardware
bezel / side panel. At the modal's width the cart-runner strips its bezel and fills the canvas
edge-to-edge. Code is delivered via the hardened studio protocol (`runtime/studio-protocol.js`);
the runtime surface gets `'unsafe-eval'` (it runs carts via `new Function`) through a per-surface
CSP, while the Dev/Settings tooling stays strict.

### G1 (`engine.call`) carts in the web/desktop preview

Most carts use the web `nova64.*` API (a global), but the low-numbered conformance carts
(`00-boot`, `01-cube`, …) use the **G1 host API** (`engine.call('geometry.createBox', …)`) —
native to the Godot host, absent in the browser, so they used to throw *"engine is not defined"*.
[`runtime/g1-web-bridge.js`](../../runtime/g1-web-bridge.js) installs a `globalThis.engine` that
maps the G1 command set (light / material / geometry / mesh / instanced / transform / camera /
texture / particles / input) onto Three.js objects in the runtime scene, giving parity so G1
carts render in the preview. It's wired in `src/main.js` (Three.js backend only; Babylon installs
its own `self.engine`) and `reset()` between runs.

### Studio-embedding gotchas under `nova64-app://` (for maintainers)

The preview embeds the runtime **cross-surface** (Dev `nova64-app://dev` → runtime
`nova64-app://os`). Three non-obvious things that all had to be right for a cart to run:

1. **Custom schemes don't set `document.referrer`.** The runtime can't derive its embedder's
   origin from the referrer, so the preview **declares it** via `?host=<location.origin>`; the
   runtime uses that for READY targeting **and** the EXECUTE_CODE allow-list. Still safe:
   `acceptExecuteCode` also requires `event.source === window.parent`. (Don't re-parse the host
   with `new URL(h).origin` — WHATWG URL returns `"null"` for non-special custom schemes.)
2. **Bare `print(...)` is `window.print()`.** G1 carts call `print()` as a log; in a browser the
   global `print` opens a **blocking print dialog** that hangs `init()`. Studio mode redirects
   `globalThis.print` to a console log (Nova64's own text API is namespaced, `nova64.draw.print`,
   so drawing is unaffected).
3. **Post status/logs via `window.parent`, not `MessageEvent.source`.** Under the custom scheme
   the cross-origin `WindowProxy` from `event.source` silently drops `postMessage`; `window.parent`
   works. Runtime `console.log`/`warn`/`error` are also forwarded to the preview console in studio
   mode (internal `[main.js]` debug lines filtered out).

## AI agent (Phase 4–5)

The Dev surface has an **🤖 AI panel** with an interaction-mode selector —
**Ask · Plan · Edit · Agent** — backed by the host-neutral
[`@nova64/agent-core`](../../packages/agent-core/README.md) seam. AI runs
**entirely in the host process** (`src/main/ai-service.js`) via the multi-provider
[`@nova64/ai-providers`](../../packages/ai-providers) package; the renderer only
sees normalized streaming events. API keys live in `SecretService` (encrypted at
`userData`); non-secret config in `userData/ai-config.json`.

- **Providers & presets:** OpenAI · Together AI · Claude (Anthropic) · OpenCode
  (local agent) · Ollama · Echo. A preset prefills the endpoint + default model,
  and the **key is optional** (added later). Detailed controls — temperature /
  top-p / max-tokens — show when the provider accepts them (hidden for Claude,
  whose current models reject sampling params).
- **System-prompt library:** create/select/edit named prompts; the active one is
  combined with the mode prompt.

### Tools + approvals

In **Edit/Agent** mode the model can act on the workspace. It requests a tool by
emitting a fenced ```` ```tool ```` JSON block (agent-core's text protocol); the
Dev panel parses it, runs it, and feeds the result back, looping until the model
stops (capped per message).

| Tool | What | Gate |
| --- | --- | --- |
| `read_file` · `list_dir` · `search_text` | inspect the workspace | free (plan+) |
| `write_file` | edit a file | **approval card with a diff preview** |
| `delete_path` | remove a file/dir | **agent-only + approval** |
| `run_cart` | run the cart in the preview, return console output | free (edit/agent) |

- **Reviewable mutations:** `write_file` shows a color-coded line **diff** before
  you Approve/Deny; `delete_path` shows the target.
- **Editor sync:** after an approved write, an open tab reloads from disk (or
  warns instead of clobbering unsaved edits); the explorer refreshes. A delete
  closes the tab.
- **Enforcement:** per-mode gating + the approval policy live in `agent-core` and
  are enforced **host-side** (`src/main/agent-tool-service.js`, `agent:run-tool`
  IPC, trusted to the Dev view only). `run_cart` executes renderer-side (the
  preview runs there). `agent-core` is served to the renderer over the
  `nova64-app://agent` protocol host.

## Not yet (later phases)

- Installer packaging (electron-builder: deb / AppImage / nsis / dmg) — plan §11, Phase 8–9.
- Cancel mid-loop; a run-history panel; `run_tests`.
- VS Code parity (Phase 6–7) — reuses `agent-core` / `ai-providers` unchanged.
