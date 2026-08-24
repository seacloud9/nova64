import { toolsForMode, getTool } from './tools.js';

/**
 * Text tool-call protocol. Our providers stream plain text (no native
 * function-calling), so the model requests tools by emitting fenced blocks
 * tagged `tool` containing JSON:
 *
 *   ```tool
 *   {"tool": "read_file", "args": {"path": "src/main.js"}}
 *   ```
 *
 * This keeps the agent loop provider-agnostic (works with any OpenAI-compatible
 * / Anthropic / echo provider) and fully unit-testable without a live LLM.
 */
const FENCE_RE = /```tool\s*\r?\n([\s\S]*?)```/g;

/** Extract tool calls from assistant text. Malformed blocks are skipped. */
export function parseToolCalls(text) {
  const calls = [];
  if (typeof text !== 'string') return calls;
  FENCE_RE.lastIndex = 0;
  let m;
  while ((m = FENCE_RE.exec(text)) !== null) {
    const body = m[1].trim();
    if (!body) continue;
    try {
      const obj = JSON.parse(body);
      const name = obj.tool || obj.name;
      if (typeof name === 'string') {
        calls.push({ tool: name, args: obj.args || obj.arguments || {} });
      }
    } catch {
      /* skip malformed tool block */
    }
  }
  return calls;
}

/** Remove tool-call fences from text, leaving the model's prose. */
export function stripToolCalls(text) {
  return typeof text === 'string' ? text.replace(FENCE_RE, '').trim() : '';
}

/** True if the text contains at least one tool-call block. */
export function hasToolCall(text) {
  return parseToolCalls(text).length > 0;
}

/**
 * System-prompt snippet listing the tools available in `mode` and the call
 * format. Empty for modes with no tools (ask). Append to the mode prompt.
 */
export function toolInstructions(mode) {
  const tools = toolsForMode(mode);
  if (!tools.length) return '';
  const list = tools.map(t => `- ${t.name}: ${t.title}${t.mutating ? ' [requires approval]' : ''}`);
  return [
    'You have tools. To call one, emit a fenced code block tagged `tool` with JSON:',
    '```tool',
    '{"tool": "<name>", "args": { ... }}',
    '```',
    'Emit one tool call, then STOP and wait for the tool result before continuing.',
    'When you are done, reply normally with no tool block.',
    'Available tools:',
    ...list,
  ].join('\n');
}

/** Format a tool result to feed back to the model as the next user turn. */
export function formatToolResult(name, result) {
  const tool = getTool(name);
  let body;
  if (typeof result === 'string') {
    body = result;
  } else {
    try {
      body = JSON.stringify(result, null, 2);
    } catch {
      body = String(result);
    }
  }
  return `[tool result: ${name}${tool ? ` (${tool.title})` : ''}]\n${body}`;
}
