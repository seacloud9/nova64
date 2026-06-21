// Headless proof that the StateRoom syncs state across clients — no browser.
// Boots the server, joins two colyseus.js clients, and asserts that a move by
// one client is reflected in the other client's replicated state.

const assert = require('assert');
const { createServer } = require('../src/index');
const { Client } = require('colyseus.js');

function waitFor(predicate, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      let ok = false;
      try { ok = predicate(); } catch (_) { ok = false; }
      if (ok) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error('timeout: ' + label));
      setTimeout(tick, 25);
    };
    tick();
  });
}

(async () => {
  const port = 2599;
  const server = createServer();
  await server.listen(port);

  const c1 = new Client(`ws://localhost:${port}`);
  const c2 = new Client(`ws://localhost:${port}`);

  const r1 = await c1.joinOrCreate('state', { name: 'alice' });
  const r2 = await c2.joinOrCreate('state', { name: 'bob' });

  // Both clients should converge on two players.
  await waitFor(() => r1.state.players.size === 2 && r2.state.players.size === 2, 3000, 'two players visible');

  // alice moves; bob's replicated copy must reflect the new, server-clamped position.
  r1.send('move', { dx: 7, dy: -3 });
  await waitFor(() => {
    const alice = r2.state.players.get(r1.sessionId);
    return alice && alice.x === 7 && alice.y === -3;
  }, 3000, 'bob sees alice move');

  // alice's name (from join options) propagated to bob.
  const aliceOnBob = r2.state.players.get(r1.sessionId);
  assert.strictEqual(aliceOnBob.name, 'alice', 'name synced');

  // a relayed event reaches the other client
  let gotEvent = null;
  r2.onMessage('event', (e) => { gotEvent = e; });
  r1.send('chat', { text: 'hi' });
  await waitFor(() => gotEvent && gotEvent.type === 'chat' && gotEvent.msg.text === 'hi', 3000, 'relay event');

  console.log(`PASS: 2 clients synced (players=${r2.state.players.size}), move replicated, name synced, relay delivered`);

  await r1.leave();
  await r2.leave();
  await server.gracefullyShutdown(false);
  process.exit(0);
})().catch((e) => {
  console.error('FAIL:', e && e.message ? e.message : e);
  process.exit(1);
});
