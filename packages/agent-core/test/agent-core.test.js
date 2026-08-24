import assert from 'node:assert/strict';
import {
  MODES,
  DEFAULT_MODE,
  isMode,
  coerceMode,
  allowsMutation,
  systemPromptFor,
  TOOL_SPECS,
  getTool,
  toolsForMode,
  toolAllowedInMode,
  approvalRequired,
  ToolRunner,
  parseToolCalls,
  stripToolCalls,
  hasToolCall,
  toolInstructions,
  formatToolResult,
} from '../index.js';

let n = 0;
const t = async (name, fn) => {
  await fn();
  n++;
  console.log(`✅ ${name}`);
};

// ── modes ────────────────────────────────────────────────────────────────────
await t('modes: known set + defaults + coercion', () => {
  assert.deepEqual([...MODES], ['ask', 'plan', 'edit', 'agent']);
  assert.equal(DEFAULT_MODE, 'ask');
  assert.ok(isMode('agent'));
  assert.ok(!isMode('nope'));
  assert.equal(coerceMode('plan'), 'plan');
  assert.equal(coerceMode('garbage'), 'ask');
  assert.equal(coerceMode(undefined), 'ask');
});

await t('modes: only edit/agent may mutate', () => {
  assert.equal(allowsMutation('ask'), false);
  assert.equal(allowsMutation('plan'), false);
  assert.equal(allowsMutation('edit'), true);
  assert.equal(allowsMutation('agent'), true);
});

await t('modes: each mode has a distinct, non-empty system prompt', () => {
  const prompts = MODES.map(systemPromptFor);
  for (const p of prompts) assert.ok(typeof p === 'string' && p.length > 20);
  assert.equal(new Set(prompts).size, MODES.length);
  assert.match(systemPromptFor('plan'), /plan/i);
  assert.equal(systemPromptFor('bogus'), systemPromptFor('ask')); // fallback
});

// ── tool catalogue ───────────────────────────────────────────────────────────
await t('tools: catalogue lookups + per-mode availability', () => {
  assert.ok(getTool('read_file'));
  assert.equal(getTool('does_not_exist'), undefined);

  // ask has no tools; plan is read-only; agent has everything.
  assert.equal(toolsForMode('ask').length, 0);
  const planNames = toolsForMode('plan').map(t => t.name);
  assert.deepEqual(planNames.sort(), ['list_dir', 'read_file', 'search_text']);
  assert.equal(toolsForMode('agent').length, TOOL_SPECS.length);
});

await t('tools: mode gating', () => {
  assert.ok(toolAllowedInMode('read_file', 'plan'));
  assert.ok(!toolAllowedInMode('write_file', 'plan')); // no writing while planning
  assert.ok(toolAllowedInMode('write_file', 'edit'));
  assert.ok(!toolAllowedInMode('run_tests', 'edit')); // running is agent-only
  assert.ok(toolAllowedInMode('run_tests', 'agent'));
});

await t('tools: approval policy — reads free, mutations/external gated', () => {
  assert.equal(approvalRequired('read_file', 'agent'), false);
  assert.equal(approvalRequired('write_file', 'edit'), true);
  assert.equal(approvalRequired('delete_path', 'agent'), true);
  assert.equal(approvalRequired('run_tests', 'agent'), true);
  assert.equal(approvalRequired('run_cart', 'agent'), false); // sandboxed preview, no approval
  assert.equal(approvalRequired('unknown', 'agent'), true); // unknown → safe default
});

await t('tools: run_cart available in edit/agent, not plan', () => {
  assert.ok(toolAllowedInMode('run_cart', 'edit'));
  assert.ok(toolAllowedInMode('run_cart', 'agent'));
  assert.ok(!toolAllowedInMode('run_cart', 'plan'));
});

// ── runner ───────────────────────────────────────────────────────────────────
function mockHost() {
  const calls = [];
  return {
    calls,
    async readFile(args) {
      calls.push(['readFile', args]);
      return `contents of ${args.path}`;
    },
    async writeFile(args) {
      calls.push(['writeFile', args]);
      return true;
    },
  };
}

await t('runner: requires a host', () => {
  assert.throws(() => new ToolRunner({}), /requires a host/);
});

await t('runner: read-only tool runs immediately and records history', async () => {
  const host = mockHost();
  const events = [];
  const runner = new ToolRunner({ host, mode: 'plan', onEvent: e => events.push(e) });
  const res = await runner.run('read_file', { path: 'a.js' });
  assert.equal(res.status, 'ok');
  assert.equal(res.result, 'contents of a.js');
  assert.deepEqual(host.calls, [['readFile', { path: 'a.js' }]]);
  assert.equal(runner.history.length, 1);
  assert.equal(events.at(-1).type, 'tool-result');
});

await t('runner: mode gating denies a disallowed tool without touching the host', async () => {
  const host = mockHost();
  const runner = new ToolRunner({ host, mode: 'plan' });
  const res = await runner.run('write_file', { path: 'a.js', content: 'x' });
  assert.equal(res.status, 'denied');
  assert.equal(host.calls.length, 0);
});

await t('runner: mutation needs approval, then runs when approved', async () => {
  const host = mockHost();
  const events = [];
  const runner = new ToolRunner({ host, mode: 'edit', onEvent: e => events.push(e) });

  const first = await runner.run('write_file', { path: 'a.js', content: 'x' });
  assert.equal(first.status, 'needs-approval');
  assert.equal(host.calls.length, 0, 'must not write before approval');
  assert.ok(events.some(e => e.type === 'approval-request' && e.tool === 'write_file'));

  const second = await runner.run('write_file', { path: 'a.js', content: 'x' }, { approved: true });
  assert.equal(second.status, 'ok');
  assert.deepEqual(host.calls, [['writeFile', { path: 'a.js', content: 'x' }]]);
});

await t('runner: unknown tool and missing handler surface as errors', async () => {
  const runner = new ToolRunner({ host: mockHost(), mode: 'agent' });
  const unknown = await runner.run('frobnicate', {});
  assert.equal(unknown.status, 'error');
  // delete_path is allowed in agent mode + approved, but the mock host lacks a handler.
  const missing = await runner.run('delete_path', { path: 'x' }, { approved: true });
  assert.equal(missing.status, 'error');
  assert.match(missing.error, /handler/);
});

await t('runner: aborted signal is reported as an error, not a hang', async () => {
  const runner = new ToolRunner({ host: mockHost(), mode: 'agent' });
  const ac = new AbortController();
  ac.abort();
  const res = await runner.run('read_file', { path: 'a.js' }, { signal: ac.signal });
  assert.equal(res.status, 'error');
  assert.match(res.error, /abort/i);
});

// ── tool-call protocol ─────────────────────────────────────────────────────────
await t('protocol: parses fenced tool-call blocks', () => {
  const text = [
    'Let me read that file.',
    '```tool',
    '{"tool": "read_file", "args": {"path": "src/main.js"}}',
    '```',
  ].join('\n');
  const calls = parseToolCalls(text);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { tool: 'read_file', args: { path: 'src/main.js' } });
  assert.ok(hasToolCall(text));
});

await t('protocol: multiple blocks, alt keys, and malformed are handled', () => {
  const text = [
    '```tool',
    '{"name": "list_dir", "arguments": {"path": "."}}', // name/arguments aliases
    '```',
    '```tool',
    'not json',
    '```',
    '```tool',
    '{"tool": "search_text", "args": {"query": "TODO"}}',
    '```',
  ].join('\n');
  const calls = parseToolCalls(text);
  assert.deepEqual(calls, [
    { tool: 'list_dir', args: { path: '.' } },
    { tool: 'search_text', args: { query: 'TODO' } },
  ]);
});

await t('protocol: stripToolCalls leaves prose; no calls => empty', () => {
  const text = 'Here is the plan.\n```tool\n{"tool":"read_file","args":{}}\n```\nDone.';
  assert.equal(stripToolCalls(text), 'Here is the plan.\n\nDone.');
  assert.equal(hasToolCall('just prose'), false);
  assert.deepEqual(parseToolCalls('just prose'), []);
});

await t('protocol: toolInstructions gates by mode + marks approvals', () => {
  assert.equal(toolInstructions('ask'), ''); // ask has no tools
  const plan = toolInstructions('plan');
  assert.match(plan, /read_file/);
  assert.doesNotMatch(plan, /write_file/); // not available in plan
  const agent = toolInstructions('agent');
  assert.match(agent, /write_file.*\[requires approval\]/);
});

await t('protocol: formatToolResult renders string + object results', () => {
  assert.match(formatToolResult('read_file', 'file contents'), /read_file.*\nfile contents/s);
  assert.match(formatToolResult('list_dir', { entries: ['a', 'b'] }), /entries/);
});

console.log(`\n${n} agent-core tests passed`);
