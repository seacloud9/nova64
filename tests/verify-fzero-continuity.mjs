// Compare gameplay with the pre-refresh Git revision; requires repository history.
import vm from 'node:vm';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('..', import.meta.url));
const baseline = 'f12a86626c2ce3809e9a76dcaf99549256a38f04';
async function run(path) {
  let seed = 42,
    id = 0,
    pressed = new Set();
  const math = Object.create(Math);
  math.random = () => (seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296;
  const stub = new Proxy(
    {},
    {
      get: (_, name) => {
        if (name === 'rgba8') return () => 0n;
        if (name === 'getShakeOffset') return () => [0, 0];
        if (name === 'centerX') return w => (640 - w) / 2;
        if (name === 'createHitState') return () => ({ invulnTimer: 0 });
        if (name === 'updateHitState')
          return (p, dt) => (p.invulnTimer = Math.max(0, p.invulnTimer - dt));
        if (name === 'isInvulnerable') return p => p.invulnTimer > 0;
        if (name === 'triggerHit') return p => (p.invulnTimer = 0.5);
        if (name === 'key') return k => pressed.has(k);
        if (name === 'btn' || name === 'btnp' || name === 'isKeyPressed') return () => false;
        if (name === 'createButton')
          return () => {
            math.random();
          };
        return () => ++id;
      },
    }
  );
  const ctx = vm.createContext({
    nova64: new Proxy({}, { get: () => stub }),
    Math: math,
    console: { log() {} },
  });
  const raw =
    path === 'baseline'
      ? execFileSync('git', ['show', `${baseline}:examples/f-zero-nova-3d/code.js`], {
          encoding: 'utf8',
        })
      : await fs.readFile(path, 'utf8');
  const src = raw.replace(/export /g, '');
  vm.runInContext(
    src + ';globalThis.probe={init,startGame,update,g,get state(){return gameState;}}',
    ctx
  );
  await ctx.probe.init();
  ctx.probe.startGame();
  const trace = [];
  for (let i = 0; i < 60 * 150; i++) {
    pressed.clear();
    // Same deterministic steering and boost inputs against the same seeded world.
    if (i % 600 < 30) pressed.add('ArrowRight');
    else if (i % 600 < 60) pressed.add('ArrowLeft');
    if (i % 500 < 90) pressed.add('Space');
    ctx.probe.update(1 / 60);
    if (i % 120 === 0) {
      const g = ctx.probe.g;
      trace.push({
        state: ctx.probe.state,
        speed: g.speed,
        dist: g.dist,
        health: g.health,
        energy: g.energy,
        rank: g.rank,
        x: g.p.x,
        vx: g.p.vx,
        boost: g.p.isBoosting,
        rivals: g.rivals.map(r => [r.x, r.z, r.speed, r.passed]),
        props: g.props.map(p => [p.x, p.z, p.active, p.type]),
      });
    }
  }
  return JSON.parse(JSON.stringify(trace));
}
const before = await run('baseline');
const after = await run(root + '/examples/f-zero-nova-3d/code.js');
assert.deepEqual(after, before);
console.log('PASS: 150-second seeded F-Zero gameplay trace unchanged (75 samples).');
