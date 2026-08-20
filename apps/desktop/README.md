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
| `main.js` | App entry; single-instance lock; registers protocol; creates the window. |
| `window-controller.js` | Creates the `WebContentsView`s (rail + OS + Dev), switches the active surface, and owns the `nav:*` IPC. |
| `view-layout.js` | Computes/applies bounds on resize (fixed rail + shared content area). |
| `protocol.js` | `nova64-app://` scheme — serves app chrome (`nav`/`dev`) from source and staged `os` assets, with path-traversal containment. |
| `security.js` | Shared secure `webPreferences`, per-`webContents` hardening (deny popups/navigation/webviews/permissions), and a strict CSP. |
| `preload/nav-preload.js` | Sandboxed CommonJS preload exposing a tiny `novaDesktop` bridge (`switchView`, `getActiveView`, `onActiveViewChanged`) — never `ipcRenderer`, Node, or fs. |

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
- **Emoji icons need a color-emoji font.** The OS shell uses emoji app icons; a stock WSL has
  no emoji font, so they render as empty boxes. Install one (no sudo needed):
  ```bash
  mkdir -p ~/.local/share/fonts
  curl -fsSL -o ~/.local/share/fonts/NotoColorEmoji.ttf \
    https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf
  fc-cache -f ~/.local/share/fonts
  ```
  This is a WSL-only display gap — on native Windows the emoji render via Segoe UI Emoji.

## Not yet (later phases)

- Installer packaging (electron-builder: deb / AppImage / nsis / dmg) — plan §11, Phase 8–9.
- Real Dev surface (Monaco, workspace, runtime preview) — Phase 2–3.
- Provider/agent AI in the host process — Phase 4–5.
