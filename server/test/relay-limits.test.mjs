// Proves the StateRoom relay guards: oversized payloads are dropped, and a flood
// from one client is rate-limited rather than broadcast in full. ESM (server is
// colyseus 0.17, ESM-only). Re-applies the 0.17 seat-reservation shim so the
// 0.16 client can consume the reservation.

import assert from 'assert';
import { createServer } from '../src/index.js';
import { Client } from 'colyseus.js';

(function patchSeatReservation() {
  const proto = Client.prototype;
  if (proto.__nova64SeatPatched) return;
  const orig = proto.consumeSeatReservation;
  proto.consumeSeatReservation = function (response, rootSchema, reuse) {
    if (response && !response.room && response.name) {
      response.room = {
        name: response.name,
        roomId: response.roomId,
        processId: response.processId,
        publicAddress: response.publicAddress,
      };
    }
    return orig.call(this, response, rootSchema, reuse);
  };
  proto.__nova64SeatPatched = true;
})();

const sleep = ms => new Promise(r => setTimeout(r, ms));
function waitFor(predicate, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      let ok = false;
      try {
        ok = predicate();
      } catch (_) {
        ok = false;
      }
      if (ok) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error('timeout: ' + label));
      setTimeout(tick, 25);
    };
    tick();
  });
}

(async () => {
  const port = 2601;
  const server = createServer();
  await server.listen(port);

  const c1 = new Client(`ws://localhost:${port}`);
  const c2 = new Client(`ws://localhost:${port}`);
  const r1 = await c1.joinOrCreate('state', { name: 'sender' });
  const r2 = await c2.joinOrCreate('state', { name: 'watcher' });
  await waitFor(
    () => r1.state.players.size === 2 && r2.state.players.size === 2,
    3000,
    'both joined'
  );

  const got = [];
  r2.onMessage('event', e => got.push(e));

  // 1) Oversized payload is dropped (over the 2KB budget).
  r1.send('chat', { text: 'x'.repeat(5000) });
  await sleep(300);
  assert.strictEqual(
    got.filter(e => e.type === 'chat').length,
    0,
    'oversized relay payload was dropped'
  );

  // A normal small message still gets through.
  r1.send('chat', { text: 'hello' });
  await waitFor(() => got.some(e => e.type === 'chat' && e.msg.text === 'hello'), 3000, 'small ok');

  // 2) A flood is rate-limited: send far more than the per-second cap at once;
  // the watcher must receive strictly fewer than were sent (some dropped).
  const before = got.length;
  const FLOOD = 60;
  for (let i = 0; i < FLOOD; i++) r1.send('spam', { i });
  await sleep(500);
  const delivered = got.filter(e => e.type === 'spam').length;
  assert.ok(delivered > 0, 'some flood messages got through');
  assert.ok(delivered < FLOOD, `flood was rate-limited (delivered ${delivered}/${FLOOD})`);
  assert.ok(got.length - before >= delivered, 'counted delivered flood messages');

  console.log(
    `PASS relay-limits: oversized dropped, small ok, flood limited (${delivered}/${FLOOD})`
  );

  await r1.leave();
  await r2.leave();
  await server.gracefullyShutdown(false);
  process.exit(0);
})().catch(e => {
  console.error('FAIL:', e && e.stack ? e.stack : e);
  process.exit(1);
});
