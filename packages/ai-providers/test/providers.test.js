import assert from 'node:assert/strict';
import {
  parseSse,
  createOpenAICompatibleProvider,
  createEchoProvider,
  ProviderRegistry,
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
