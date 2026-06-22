// Exercises the actual web nova64.net facade (runtime/api-net.js) against a live
// StateRoom — proves the cart-facing API (connect/joinOrCreate, onPlayerAdd/
// Change, send, players()) works, not just the raw colyseus protocol.
//
// colyseus.js resolves from the repo-root node_modules (api-net.js imports it);
// the server resolves colyseus from server/node_modules.

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createServer } = require('../src/index.js');
const { netApi } = await import('../../runtime/api-net.js');

function waitFor(fn, ms, label) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    (function tick() {
      let ok = false;
      try { ok = fn(); } catch (_) { ok = false; }
      if (ok) return resolve();
      if (Date.now() - t0 > ms) return reject(new Error('timeout: ' + label));
      setTimeout(tick, 25);
    })();
  });
}

(async () => {
  const port = 2602;
  const server = createServer();
  await server.listen(port);

  const A = netApi();
  const B = netApi();
  if (!A.isSupported()) throw new Error('net.isSupported() false');

  const ra = await A.joinOrCreate('state', { url: `ws://localhost:${port}`, name: 'alice' });
  const rb = await B.joinOrCreate('state', { url: `ws://localhost:${port}`, name: 'bob' });

  let addedOnB = 0;
  let removedOnB = 0;
  rb.onPlayerAdd(() => { addedOnB++; });
  rb.onPlayerRemove(() => { removedOnB++; });

  await waitFor(() => rb.players() && rb.players().size === 2, 3000, 'two players via facade');

  // alice moves (absolute pos); bob's facade sees the replicated position.
  ra.send('pos', { x: 42, y: 17 });
  await waitFor(() => {
    const al = rb.players().get(ra.sessionId);
    return al && al.x === 42 && al.y === 17;
  }, 3000, 'pos synced through facade');

  if (addedOnB < 1) throw new Error('onPlayerAdd never fired');

  // alice leaves; bob's onPlayerRemove fires.
  A.leave();
  await waitFor(() => removedOnB >= 1, 3000, 'onPlayerRemove fired');

  console.log(`PASS facade: nova64.net joinOrCreate + onPlayerAdd(${addedOnB})/Remove(${removedOnB}) + pos sync OK`);

  B.leave();
  await server.gracefullyShutdown(false);
  process.exit(0);
})().catch((e) => {
  console.error('FAIL facade:', e && e.message ? e.message : e);
  process.exit(1);
});
