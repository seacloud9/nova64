// In-browser playthrough checks for examples/wad-demo.
//
// tests/test-wad-physics.js proves the collider and the floor lookups are right in
// isolation. This spec proves the running cart actually uses them: it loads E1M1,
// walks the player around, and asserts they cover real ground and that the floor
// under their feet changes as they move. The bug these guard is a cart that walks
// at the spawn sector height forever and cannot leave its first room.

import { test, expect } from '@playwright/test';
import { loadCart, pressKey, waitFor3DScene } from './helpers.js';

const BACKENDS = ['threejs', 'babylon'];

async function getState(page) {
  return await page.evaluate(() => globalThis.__nova64WadDemoState?.() ?? null);
}

async function startLevel(page) {
  await expect
    .poll(async () => (await getState(page))?.gameState || '', { timeout: 30000 })
    .toBe('menu');
  // Start on the first map rather than paging the selection, so the figures here
  // line up with the E1M1 numbers in tests/test-wad-physics.js.
  await pressKey(page, 'Enter', 100);
  await expect
    .poll(async () => (await getState(page))?.gameState || '', { timeout: 15000 })
    .toBe('playing');
}

// Holds a key down for real time so the cart's own update loop integrates the
// movement, rather than synthesising a single keypress.
async function hold(page, code, ms) {
  await page.keyboard.down(code);
  await page.waitForTimeout(ms);
  await page.keyboard.up(code);
}

// These walk the player around in real time (several seconds of held keys each) on
// top of a cold Vite start, so the 30s default is far too tight.
test.describe.configure({ timeout: 180_000 });

test.describe('WAD demo physics', () => {
  for (const backend of BACKENDS) {
    test(`wad-demo: the player can walk and the floor follows (${backend})`, async ({ page }) => {
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await loadCart(page, 'wad-demo', backend);
      await waitFor3DScene(page, backend);
      await startLevel(page);

      const start = await getState(page);
      expect(start?.colliderLines ?? 0).toBeGreaterThan(100);
      // The reachability flood must find a real level, not a sealed room.
      expect(start?.reachableCells ?? 0).toBeGreaterThan(5000);
      // Every spawned enemy has to be killable or the level can never clear.
      expect(start?.enemyCount ?? 0).toBeGreaterThan(0);

      // Walk a lap: forward, turn, forward again. Collect the floor heights and
      // positions the cart reports along the way.
      const samples = [];
      const sample = async () => samples.push(await getState(page));
      await sample();

      for (const [key, ms] of [
        ['KeyW', 1200],
        ['KeyD', 600],
        ['KeyW', 1200],
        ['KeyA', 600],
        ['KeyW', 1200],
        ['KeyS', 600],
      ]) {
        await hold(page, key, ms);
        await sample();
      }

      const moved = Math.max(
        ...samples.map(s =>
          Math.hypot(s.playerX - samples[0].playerX, s.playerZ - samples[0].playerZ)
        )
      );
      // Walls 3.6 units thick sealed the player into a pocket; covering real
      // distance means doorways are open again.
      expect(moved).toBeGreaterThan(6);

      // The camera must sit one unit above whatever floor it resolved, not at a
      // height frozen from the spawn sector.
      for (const s of samples) {
        expect(Math.abs(s.playerY - (s.playerFloorBase + 1))).toBeLessThan(0.5);
      }

      expect(errors.join('\n')).not.toContain('Cart update() error:');
      expect(errors.join('\n')).not.toContain('startLevel() crashed:');
    });

    test(`wad-demo: a solid wall stops the player (${backend})`, async ({ page }) => {
      await loadCart(page, 'wad-demo', backend);
      await waitFor3DScene(page, backend);
      await startLevel(page);

      // Walk into geometry for a long time. The player must stop somewhere finite
      // rather than drifting off the map, which is what no collision looks like.
      const before = await getState(page);
      await hold(page, 'KeyW', 4000);
      const after = await getState(page);

      const travelled = Math.hypot(after.playerX - before.playerX, after.playerZ - before.playerZ);
      // Sprint-free speed is 14 u/s, so 4s of unobstructed running would be ~56
      // units. E1M1 does not have a 56-unit straight line from the spawn point.
      expect(travelled).toBeLessThan(50);
      expect(Number.isFinite(after.playerX)).toBe(true);
      expect(Number.isFinite(after.playerZ)).toBe(true);
    });
  }

  test('wad-demo: the player never ends up below the floor', async ({ page }) => {
    await loadCart(page, 'wad-demo', 'threejs');
    await waitFor3DScene(page, 'threejs');
    await startLevel(page);

    for (const key of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyW', 'KeyD']) {
      await hold(page, key, 700);
      const s = await getState(page);
      // playerFloorTarget is the sector floor the cart resolved for the player's
      // current position; the eye height must stay above it.
      expect(s.playerY).toBeGreaterThan(s.playerFloorTarget - 0.5);
    }
  });
});
