# @nova64/vscode

Nova64 for VS Code (Phase 6). Reuses the host-neutral
[`@nova64/ai-providers`](../../packages/ai-providers) and
[`@nova64/agent-core`](../../packages/agent-core/README.md) packages — the **same
seam** the [Electron desktop app](../../apps/desktop/README.md) uses — so provider
profiles and agent modes behave identically across both hosts.

This first cut delivers a **streaming AI chat panel**. The agent tool loop
(read / edit / run over `vscode.workspace.fs`, driving `agent-core`'s `ToolRunner`
with the same approval policy) is the documented follow-up.

## Commands

- **Nova64: Open AI Chat** (`nova64.openChat`) — opens the chat webview.
- **Nova64: Set AI API Key** (`nova64.setApiKey`) — stores a key in VS Code
  SecretStorage (never in settings/files).

## Settings (`nova64.ai.*`)

| Setting | Default | Notes |
| --- | --- | --- |
| `provider` | `echo` | `echo` · `openai-compatible` (OpenAI/Together/Ollama/LM Studio) · `anthropic` · `opencode` |
| `baseUrl` | `""` | e.g. `https://api.openai.com`, `http://localhost:11434`, `https://api.anthropic.com` |
| `model` | `""` | e.g. `gpt-4o-mini`, `claude-opus-4-8`, `llama3.1` |
| `mode` | `ask` | `ask` · `plan` · `edit` · `agent` (agent-core mode; sets the system prompt) |

## Develop

```bash
pnpm install                 # from the repo root (workspace)
cd extensions/vscode
pnpm typecheck               # tsc --noEmit
pnpm build                   # esbuild -> dist/extension.js (bundles the ESM deps to CJS)
```

Then press **F5** in VS Code (Extension Development Host) to run it. The AI runs
in the extension host; keys live in SecretStorage; the webview is sandboxed with
a strict CSP + nonce.

> The extension is authored as ESM against the shared packages and **bundled to
> CommonJS** by esbuild for the VS Code extension host (`tsconfig` uses
> `moduleResolution: Bundler`).
