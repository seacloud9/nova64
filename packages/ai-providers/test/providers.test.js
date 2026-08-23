import assert from 'node:assert/strict';
import {
  parseSse,
  createOpenAICompatibleProvider,
  createAnthropicProvider,
  createOpenCodeProvider,
  createEchoProvider,
  ProviderRegistry,
  PROVIDER_PRESETS,
  getPreset,
} from '../index.js';

let n = 0;
const t = async (name, fn) => {
  await fn();
  n++;
  console.log(`✅ ${name}`);
};

function streamFrom(chunks) {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
}

async function collect(gen) {
  const out = [];
  for await (const ev of gen) out.push(ev);
  return out;
}

await t('parseSse extracts data payloads across chunk boundaries', async () => {
  const stream = streamFrom(['data: a\n\nda', 'ta: b\n\n', 'data: [DONE]\n\n']);
  const got = [];
  for await (const d of parseSse(stream)) got.push(d);
  assert.deepEqual(got, ['a', 'b', '[DONE]']);
});

await t('openai-compatible chat streams normalized deltas + done', async () => {
  const mockFetch = async url => {
    assert.ok(url.endsWith('/v1/chat/completions'));
    return {
      ok: true,
      body: streamFrom([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":", world"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    };
  };
  const provider = createOpenAICompatibleProvider({ fetchImpl: mockFetch });
  const events = await collect(
    provider.chat({ baseUrl: 'http://x', model: 'm' }, [{ role: 'user', content: 'hi' }])
  );
  assert.deepEqual(events, [
    { type: 'delta', text: 'Hello' },
    { type: 'delta', text: ', world' },
    { type: 'done' },
  ]);
});

await t('openai-compatible sends model/stream + optional auth', async () => {
  let captured;
  const mockFetch = async (url, opts) => {
    captured = { url, opts };
    return { ok: true, body: streamFrom(['data: [DONE]\n\n']) };
  };
  const provider = createOpenAICompatibleProvider({ fetchImpl: mockFetch });
  await collect(
    provider.chat({ baseUrl: 'http://x/', apiKey: 'k', model: 'm', temperature: 0.5 }, [])
  );
  const body = JSON.parse(captured.opts.body);
  assert.equal(body.model, 'm');
  assert.equal(body.stream, true);
  assert.equal(body.temperature, 0.5);
  assert.equal(captured.opts.headers.authorization, 'Bearer k');
});

await t('openai-compatible listModels parses ids', async () => {
  const mockFetch = async () => ({ ok: true, json: async () => ({ data: [{ id: 'a' }, { id: 'b' }] }) });
  const provider = createOpenAICompatibleProvider({ fetchImpl: mockFetch });
  assert.deepEqual(await provider.listModels({ baseUrl: 'http://x' }), ['a', 'b']);
});

await t('openai-compatible throws on HTTP error', async () => {
  const mockFetch = async () => ({ ok: false, status: 500, text: async () => 'boom' });
  const provider = createOpenAICompatibleProvider({ fetchImpl: mockFetch });
  await assert.rejects(() => collect(provider.chat({ baseUrl: 'http://x', model: 'm' }, [])));
});

await t('echo provider streams the last user message', async () => {
  const provider = createEchoProvider();
  const events = await collect(
    provider.chat({}, [
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'ping' },
    ])
  );
  const text = events
    .filter(e => e.type === 'delta')
    .map(e => e.text)
    .join('');
  assert.equal(text, 'Echo: ping');
  assert.deepEqual(events[events.length - 1], { type: 'done' });
});

await t('echo provider stops on abort', async () => {
  const provider = createEchoProvider();
  const ac = new AbortController();
  ac.abort();
  const events = await collect(
    provider.chat({}, [{ role: 'user', content: 'a b c' }], { signal: ac.signal })
  );
  assert.equal(events.length, 0);
});

await t('anthropic chat: system param split out, text_delta streamed', async () => {
  let captured;
  const mockFetch = async (url, opts) => {
    captured = { url, opts };
    return {
      ok: true,
      body: streamFrom([
        'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}\n\n',
        'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":" there"}}\n\n',
        'event: message_stop\ndata: {"type":"message_stop"}\n\n',
      ]),
    };
  };
  const provider = createAnthropicProvider({ fetchImpl: mockFetch });
  const events = await collect(
    provider.chat({ apiKey: 'k', model: 'claude-opus-4-8' }, [
      { role: 'system', content: 'be terse' },
      { role: 'user', content: 'hi' },
    ])
  );
  assert.equal(captured.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(captured.opts.headers['x-api-key'], 'k');
  assert.equal(captured.opts.headers['anthropic-version'], '2023-06-01');
  const body = JSON.parse(captured.opts.body);
  assert.equal(body.system, 'be terse'); // system pulled out of messages
  assert.deepEqual(body.messages, [{ role: 'user', content: 'hi' }]);
  assert.equal(body.max_tokens > 0, true);
  assert.equal('temperature' in body, false); // never sent (400s on current Claude)
  assert.deepEqual(events, [
    { type: 'delta', text: 'Hi' },
    { type: 'delta', text: ' there' },
    { type: 'done' },
  ]);
});

await t('opencode chat: creates a session then posts the message', async () => {
  const calls = [];
  const mockFetch = async (url, opts) => {
    calls.push({ url, method: opts?.method });
    if (url.endsWith('/session') && opts?.method === 'POST') {
      return { ok: true, json: async () => ({ id: 'ses_1' }) };
    }
    if (url.includes('/session/ses_1/message')) {
      return { ok: true, json: async () => ({ parts: [{ type: 'text', text: 'done: built cube' }] }) };
    }
    throw new Error(`unexpected ${url}`);
  };
  const provider = createOpenCodeProvider({ fetchImpl: mockFetch });
  const events = await collect(
    provider.chat({ baseUrl: 'http://127.0.0.1:4096' }, [{ role: 'user', content: 'build a cube' }])
  );
  assert.deepEqual(events, [{ type: 'delta', text: 'done: built cube' }, { type: 'done' }]);
  assert.equal(calls[0].url, 'http://127.0.0.1:4096/session');
  assert.ok(calls[1].url.endsWith('/session/ses_1/message'));
});

await t('presets: prefilled endpoints, key-optional flags', () => {
  const ids = PROVIDER_PRESETS.map(p => p.id);
  for (const need of ['openai', 'togetherai', 'anthropic', 'opencode']) {
    assert.ok(ids.includes(need), `preset ${need} present`);
  }
  assert.equal(getPreset('anthropic').baseUrl, 'https://api.anthropic.com');
  assert.equal(getPreset('anthropic').sampling, false); // Claude hides temp/top-p
  assert.equal(getPreset('openai').sampling, true);
  assert.equal(getPreset('opencode').needsKey, false);
  assert.equal(getPreset('openai').needsKey, true);
});

await t('registry registers/gets/lists providers', () => {
  const reg = new ProviderRegistry();
  reg.register(createEchoProvider()).register(createOpenAICompatibleProvider());
  assert.equal(reg.has('echo'), true);
  assert.equal(reg.get('openai-compatible').kind, 'openai-compatible');
  assert.deepEqual(
    reg.list().map(p => p.id),
    ['echo', 'openai-compatible']
  );
});

console.log(`\n📊 ai-providers: ${n} tests passed`);
