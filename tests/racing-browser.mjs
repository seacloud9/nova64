// Browser verification and comparable captures. Test probes are injected by Playwright,
// never shipped in either cartridge. Run: pnpm exec node tests/racing-browser.mjs
/* global raceProbe, pad */
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { LENGTH } from '../examples/breakwater-circuit/race.js';
const base = process.env.NOVA64_TEST_URL || 'http://127.0.0.1:3199';
const baseline = 'f12a86626c2ce3809e9a76dcaf99549256a38f04';
const out = 'tests/artifacts/racing';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { browser: browser.version(), baseline, checks: [], errors: [] };
async function openCart(
  cart,
  { before = false, width = 960, height = 720, touch = false, backend = 'threejs' } = {}
) {
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch: touch,
    isMobile: touch,
  });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push({ cart, error: e.message }));
  page.on('console', m => {
    if (m.type() === 'error' && /Cart .*threw|gpu.endFrame/.test(m.text()))
      report.errors.push({ cart, error: m.text() });
  });
  await page.addInitScript(() => {
    globalThis.__raceFreeze = true;
  });
  await page.route(`**/examples/${cart}/code.js*`, async route => {
    let src = before
      ? execFileSync('git', ['show', `${baseline}:examples/${cart}/code.js`], { encoding: 'utf8' })
      : await readFile(`examples/${cart}/code.js`, 'utf8');
    src = src.replace('export function update(dt)', 'function tick(dt)');
    if (cart === 'f-zero-nova-3d') {
      src = src.replace(
        'const { btn, btnp, isKeyPressed, key } = nova64.input;',
        'const { btn, btnp, isKeyPressed } = nova64.input; const key=(...args)=>nova64.input.key(...args);'
      );
      src =
        'let cartSeed=42; const cartRandom=()=>((cartSeed=(1664525*cartSeed+1013904223)>>>0)/4294967296);\n' +
        src.replaceAll('Math.random()', 'cartRandom()');
      src +=
        '\nglobalThis.raceProbe={tick,startGame,g,get state(){return gameState;},resetClock(){t=0;},retry(){gameState="start";initStartScreen();}};';
    } else
      src +=
        '\nglobalThis.raceProbe={tick,resetRace,aiInput,get player(){return player;},get rivals(){return rivals;},get state(){return state;},get mode(){return mode;},setMode(m){mode=m;resetRace();},get best(){return best;},get muted(){return muted;},get auto(){return auto;}};';
    src += '\nexport function update(dt){if(!globalThis.__raceFreeze)tick(dt);}';
    await route.fulfill({ contentType: 'text/javascript', body: src });
  });
  await page.goto(`${base}/hero-embed.html?demo=${cart}&w=640&h=360&backend=${backend}`);
  await page.waitForFunction(() => globalThis.__nova64CartLoadState?.ready, { timeout: 30000 });
  return { page, context };
}
async function snap(page, name) {
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${out}/${name}.png` });
}
try {
  for (const before of [true, false]) {
    const { page, context } = await openCart('f-zero-nova-3d', { before });
    const label = before ? 'before' : 'after';
    await page.evaluate(() => {
      raceProbe.resetClock();
      raceProbe.startGame();
    });
    await snap(page, `fzero-${label}-grid`);
    await page.evaluate(() => {
      const old = nova64.input.key;
      let frame = 0;
      nova64.input.key = k => k === 'ArrowRight' && frame >= 690 && frame < 704;
      for (; frame < 720; frame++) raceProbe.tick(1 / 60);
      nova64.input.key = old;
    });
    await snap(page, `fzero-${label}-steering`);
    await page.evaluate(() => {
      for (let i = 0; i < 240; i++) raceProbe.tick(1 / 60);
    });
    await snap(page, `fzero-${label}-busy`);
    const stats = await page.evaluate(() => {
      let objects = 0,
        triangles = 0;
      nova64.scene.getScene().traverse(o => {
        if (o.isMesh) {
          objects++;
          triangles +=
            ((o.geometry?.index?.count || o.geometry?.attributes?.position?.count || 0) / 3) *
            (o.isInstancedMesh ? o.count : 1);
        }
      });
      const samples = [];
      for (let i = 0; i < 60; i++) {
        const t = performance.now();
        raceProbe.tick(1 / 60);
        samples.push(performance.now() - t);
      }
      return {
        objects,
        triangles,
        updateMs: samples.reduce((a, b) => a + b, 0) / samples.length,
        health: raceProbe.g.health,
        distance: raceProbe.g.dist,
      };
    });
    report.checks.push({ test: `F-Zero ${label} presentation`, ...stats });
    // Start from a fresh load: the legacy soft retry intentionally retains spawned traffic.
    await page.reload();
    await page.waitForFunction(() => globalThis.__nova64CartLoadState?.ready);
    // Drive through the entire original endurance event with ordinary steering inputs.
    const result = await page.evaluate(() => {
      raceProbe.startGame();
      for (let i = 0; i < 181; i++) raceProbe.tick(1 / 60);
      const g = raceProbe.g,
        original = nova64.input.key;
      let target = 0;
      nova64.input.key = key => {
        const error = target - g.p.x - g.p.vx * 0.22;
        if (key === 'ArrowRight') return error > 0.7;
        if (key === 'ArrowLeft') return error < -0.7;
        return false;
      };
      for (let frame = 0; frame < 180 * 60 && raceProbe.state === 'playing'; frame++) {
        if (frame % 4 === 0) {
          const obstacles = [
            ...g.rivals.map(r => ({ x: r.x, z: r.z, vx: r.vx, speed: r.speed })),
            ...g.props
              .filter(p => p.type === 'mine' && p.active)
              .map(p => ({ ...p, vx: 0, speed: 0 })),
          ].filter(o => o.z < 8 && o.z > -500);
          const choices = [-15, -10, -5, 0, 5, 10, 15];
          const score = dest => {
            let x = g.p.x,
              vx = g.p.vx,
              cost = Math.abs(dest - x) * 0.02;
            for (let t = 0.05; t < 2.6; t += 0.05) {
              const error = dest - x - vx * 0.22,
                input = error > 0.7 ? 1 : error < -0.7 ? -1 : 0;
              vx = (vx + input * 120 * 0.05) * (1 - 4.5 * 0.05);
              x += vx * 0.05;
              for (const o of obstacles) {
                const z = o.z + (g.speed - o.speed) * t;
                if (Math.abs(z) > 8) continue;
                let ox = o.x + o.vx * t;
                while (ox > 18 || ox < -18) {
                  if (ox > 18) ox = 36 - ox;
                  else ox = -36 - ox;
                }
                cost += (Math.max(0, 5 - Math.abs(x - ox)) * 100) / (0.5 + t);
              }
            }
            return cost;
          };
          target = choices.sort((a, b) => score(a) - score(b))[0];
        }
        raceProbe.tick(1 / 60);
      }
      nova64.input.key = original;
      return { state: raceProbe.state, dist: g.dist, health: g.health, rank: g.rank };
    });
    report.checks.push({ test: `F-Zero ${label} full race`, ...result });
    assert.equal(result.state, 'finished');
    await snap(page, `fzero-${label}-finish`);
    await page.evaluate(() => {
      raceProbe.retry();
      raceProbe.startGame();
    });
    assert.equal(await page.evaluate(() => raceProbe.state), 'countdown');
    await context.close();
  }
  for (const mode of ['race', 'trial']) {
    const { page, context } = await openCart('breakwater-circuit');
    await page.evaluate(mode => {
      raceProbe.setMode(mode);
      nova64.input.btn = () => false;
      nova64.input.btnp = () => false;
      nova64.input.keyp = () => false;
      nova64.input.gamepadAxis = axis =>
        axis === 'leftX' ? raceProbe.aiInput(raceProbe.player).steer : 0;
      nova64.input.key = k => {
        const a = raceProbe.aiInput(raceProbe.player);
        return (
          {
            ArrowUp: a.throttle,
            ArrowDown: a.brake,
            KeyQ: a.leftBrake,
            KeyE: a.rightBrake,
            Space: a.boost,
          }[k] || false
        );
      };
      for (let i = 0; i < 181; i++) raceProbe.tick(1 / 60);
    }, mode);
    await snap(page, `breakwater-${mode}-grid`);
    for (const [name, fraction] of [
      ['sweeper', 0.23],
      ['crest', 0.61],
      ['hairpin', 0.89],
      ['finish', 3.01],
    ]) {
      const result = await page.evaluate(target => {
        for (
          let i = 0;
          i < 12000 && raceProbe.state === 'racing' && raceProbe.player.s < target;
          i++
        )
          raceProbe.tick(1 / 60);
        return {
          state: raceProbe.state,
          s: raceProbe.player.s,
          lap: raceProbe.player.lap,
          time: raceProbe.player.time,
          penalty: raceProbe.player.penalty,
        };
      }, fraction * LENGTH);
      await snap(page, `breakwater-${mode}-${name}`);
      if (name === 'finish') {
        assert.equal(result.state, 'results');
        assert.equal(result.lap, 3);
        report.checks.push({ test: `Breakwater ${mode} full race`, ...result });
      }
    }
    assert.ok(await page.evaluate(() => raceProbe.best > 0));
    await page.evaluate(() => raceProbe.resetRace());
    assert.equal(await page.evaluate(() => raceProbe.player.lap), 0);
    report.checks.push({ test: `Breakwater ${mode} persistence and retry`, pass: true });
    await context.close();
  }
  // Real DOM keyboard/mouse/touch flow, with runtime frame updates enabled.
  for (const profile of [
    { name: '4x3', width: 960, height: 720 },
    { name: 'wide', width: 1440, height: 810 },
    { name: 'landscape-touch', width: 844, height: 390, touch: true },
  ]) {
    for (const cart of ['breakwater-circuit', 'f-zero-nova-3d']) {
      const { page, context } = await openCart(cart, profile);
      await page.evaluate(() => {
        globalThis.__raceFreeze = false;
      });
      await snap(page, `${cart}-${profile.name}-title`);
      if (profile.touch) {
        const x = cart === 'breakwater-circuit' ? 160 : 320,
          y = cart === 'breakwater-circuit' ? 230 : 330;
        await page.touchscreen.tap((x * profile.width) / 640, (y * profile.height) / 360);
      } else await page.keyboard.press(cart === 'breakwater-circuit' ? 'Enter' : 'Space');
      await page.waitForFunction(() => ['racing', 'playing'].includes(raceProbe.state), {
        timeout: 20000,
      });
      if (cart === 'breakwater-circuit') {
        if (!profile.touch) {
          await page.keyboard.down('ArrowUp');
          await page.waitForTimeout(450);
          await page.keyboard.up('ArrowUp');
        }
        assert.ok(await page.evaluate(() => raceProbe.player.speed > 0));
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => raceProbe.state), 'paused');
        const frozen = await page.evaluate(() => raceProbe.player.time);
        await page.waitForTimeout(200);
        assert.equal(await page.evaluate(() => raceProbe.player.time), frozen);
        await page.keyboard.press('Enter');
        await page.keyboard.press('KeyM');
        assert.equal(await page.evaluate(() => raceProbe.muted), true);
      }
      await snap(page, `${cart}-${profile.name}-play`);
      report.checks.push({ test: `${cart} ${profile.name} launch/input`, pass: true });
      await context.close();
    }
  }
  // Gamepad emulation goes through navigator.getGamepads and the runtime's mapping.
  {
    const { page, context } = await openCart('breakwater-circuit');
    await page.evaluate(() => {
      globalThis.pad = {
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
      };
      navigator.getGamepads = () => [pad];
      globalThis.__raceFreeze = false;
      pad.buttons[0] = { pressed: true, value: 1 };
    });
    await page.waitForTimeout(150);
    await page.evaluate(() => {
      pad.buttons[0] = { pressed: false, value: 0 };
    });
    await page.waitForFunction(() => raceProbe.state === 'racing', { timeout: 20000 });
    await page.evaluate(() => {
      pad.buttons[2] = { pressed: true, value: 1 };
      pad.axes[0] = 0.25;
    });
    await page.waitForTimeout(500);
    assert.ok(await page.evaluate(() => raceProbe.player.speed > 0 && raceProbe.player.lane > 0));
    report.checks.push({
      test: 'Breakwater emulated gamepad A start / X throttle / analog steering',
      pass: true,
    });
    await context.close();
  }
  assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
} finally {
  await writeFile(`${out}/browser-report.json`, JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
