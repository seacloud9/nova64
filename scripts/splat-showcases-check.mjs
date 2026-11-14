import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { showcases } from '../experiments/splat-worlds/showcases.js';

const base =
  process.argv.find(arg => arg.startsWith('--base='))?.slice(7) ?? 'http://127.0.0.1:5193';
const out = path.resolve('retroarch/build/splat-showcases');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: process.platform === 'darwin' ? ['--use-angle=metal'] : [],
});
const report = [];
try {
  for (const backend of ['three', 'babylon']) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => {
      if (m.type() === 'error' && !/404|favicon/.test(m.text())) errors.push(m.text());
    });
    await page.goto(
      `${base}/console.html?path=/experiments/splat-worlds/cart.js&splatDemo=apartment&w=640&h=360&backend=${backend}`
    );
    await page.waitForFunction(() => !!window.__splatWorlds, null, { timeout: 90000 });
    for (const name of Object.keys(showcases)) {
      await page.waitForTimeout(1400);
      const state = await page.evaluate(() => ({
        name: window.__splatWorlds.showcase,
        effect: window.__splatWorlds.effect,
        world: window.__splatWorlds.world,
      }));
      assert.equal(state.name, name);
      const expected = {
        apartment: [0, 1],
        relic: [1, 0],
        blueprint: [0, 5],
        spectrum: [1, 6],
        echo: [0, 7],
        ember: [1, 8],
        nocturne: [0, 9],
        porcelain: [1, 10],
        tide: [0, 11],
        portal: [0, 0],
      }[name];
      assert.deepEqual([state.world, state.effect], expected);
      const bytes = await page
        .locator('#screen')
        .screenshot({ path: path.join(out, `${backend}-${name}.png`) });
      const png = PNG.sync.read(bytes);
      const colors = new Set();
      // Ignore the title/caption bars: require actual scene detail in the viewport.
      for (let y = Math.floor(png.height * 0.15); y < png.height * 0.8; y += 4)
        for (let x = 0; x < png.width; x += 4) {
          const i = (y * png.width + x) * 4;
          colors.add(`${png.data[i]},${png.data[i + 1]},${png.data[i + 2]}`);
        }
      assert.ok(colors.size > 100, `${backend}/${name}: scene has visible detail`);
      report.push({ backend, ...state, colors: colors.size });
      await page.keyboard.press(']');
      await page.waitForFunction(() => window.__splatWorlds.showcase !== undefined);
    }
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.__splatWorlds.showcase), 'apartment');
    await page.keyboard.press('[');
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.__splatWorlds.showcase), 'portal');
    await page.keyboard.press('9');
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.__splatWorlds.showcase), null);
    assert.equal(await page.evaluate(() => window.__splatWorlds.world), 0);
    assert.deepEqual(errors, []);
    console.log(
      `${backend}: all ${Object.keys(showcases).length} demos, visible scene detail, cycle controls and explore reset PASS`
    );
    await page.close();
  }
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
} finally {
  await browser.close();
}
