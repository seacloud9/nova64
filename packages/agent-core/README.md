# @nova64/agent-core

Host-neutral agent seam for the Nova64 platform. Defines the interaction
**modes**, the **tool** catalogue with per-mode gating + approval policy, a
**ToolRunner** that executes tool calls against an injected host, and a text
**tool-call protocol** for provider-agnostic tool use.

No React / Electron / VS Code / browser globals — a host (the Electron desktop
today, a VS Code extension later) wires a concrete `host` object and drives it,
so the agent's rules live in one tested place across both surfaces.

```bash
node test/agent-core.test.js   # 18 unit tests
```

## Modes (`src/modes.js`)

| Mode | Tools | Mutations | Purpose |
| --- | --- | --- | --- |
| `ask` | none | no | plain Q&A |
| `plan` | read-only | no | investigate + produce a plan |
| `edit` | read + write + run | yes (approved) | propose concrete edits |
| `agent` | all | yes (approved) | full read → edit → run loop |

`systemPromptFor(mode)` returns the mode's instructions; `allowsMutation(mode)`
and `coerceMode(value)` are the guards.

## Tools (`src/tools.js`)

`TOOL_SPECS` is host-neutral metadata only — the host supplies the
implementation, keyed by each spec's `handler`.

| Tool | Modes | Mutating | Approval |
| --- | --- | --- | --- |
| `read_file` / `list_dir` / `search_text` | plan, edit, agent | no | no |
| `write_file` | edit, agent | yes | **yes** |
| `run_cart` | edit, agent | no | no (sandboxed preview) |
| `delete_path` | agent | yes (external) | **yes** |
| `run_tests` | agent | yes (external) | **yes** |

Helpers: `toolsForMode`, `toolAllowedInMode`, `approvalRequired`.

## ToolRunner (`src/runner.js`)

Executes one tool call against the injected host, enforcing:

1. **Mode gating** — a tool the mode doesn't permit is rejected (`denied`).
2. **Approval** — a mutating/external tool without `{ approved: true }` returns
   `needs-approval` (the UI turns this into an approval card); re-issue with
   `approved` to run it.

Every settled call is appended to an in-memory run history.

```js
import { ToolRunner } from '@nova64/agent-core';
const runner = new ToolRunner({ host, mode: 'agent' });
let r = await runner.run('write_file', { path: 'a.js', content: '…' });
// r.status === 'needs-approval'  → show a card
r = await runner.run('write_file', { path: 'a.js', content: '…' }, { approved: true });
// r.status === 'ok'
```

## Tool-call protocol (`src/protocol.js`)

Our providers stream plain text (no native function-calling), so the model
requests tools with fenced blocks tagged `tool`:

    ```tool
    {"tool": "read_file", "args": {"path": "src/main.js"}}
    ```

- `parseToolCalls(text)` → `[{ tool, args }]` (malformed blocks skipped)
- `stripToolCalls(text)` / `hasToolCall(text)`
- `toolInstructions(mode)` → the system-prompt snippet listing the mode's tools
- `formatToolResult(name, result)` → the string fed back as the next turn

This keeps the agent loop working with any streaming provider (OpenAI-compatible
/ Anthropic / OpenCode / the offline echo) and unit-testable without a live LLM.

## Wiring (Nova64 desktop)

`apps/desktop/src/main/agent-tool-service.js` backs the ToolRunner with the
opened workspace (read/list/search/write/delete) over the `agent:run-tool` IPC;
`run_cart` runs renderer-side in the preview. The Dev AI panel parses the
model's tool calls, renders approval cards (with a diff for writes), feeds
results back, and loops. See `apps/desktop/README.md` → **AI agent**.
