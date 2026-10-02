# @nova64/vscode

Nova64 for VS Code (Phase 6). Reuses the host-neutral
[`@nova64/ai-providers`](../../packages/ai-providers) and
[`@nova64/agent-core`](../../packages/agent-core/README.md) packages — the **same
seam** the [Electron desktop app](../../apps/desktop/README.md) uses — so provider
profiles and agent modes behave identically across both hosts.

A **streaming AI chat panel** with the full **agent tool loop**. In **Edit/Agent**
mode the model reads, searches, and edits your workspace via `agent-core`'s
`ToolRunner` over `vscode.workspace.fs` — the **same tools + per-mode gating +
approval policy** as the desktop:

| Tool | Modes | Approval |
| --- | --- | --- |
| `read_file` · `list_dir` · `search_text` | plan · edit · agent | free |
| `write_file` · `create_dir` · `move_path` | edit · agent | native modal |
| `delete_path` | agent | native modal (moves to Trash) |

The whole loop runs in the **extension host** (which bundles `agent-core`), so the
webview is just chat display + input; mutating tools prompt a native VS Code
approval modal. Paths are containment-guarded to the first workspace folder.

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
