import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { generateStorybookWorld, storybookWorlds } from '../experiments/splat-worlds/storybook.js';

const base =
  process.argv.find(arg => arg.startsWith('--base='))?.slice(7) ?? 'http://127.0.0.1:5193';
const out = path.resolve('retroarch/build/storybook-worlds');
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
      `${base}/console.html?path=/experiments/splat-worlds/cart.js&worldSet=storybook&w=640&h=360&backend=${backend}`
    );
    await page.waitForFunction(() => !!window.__splatWorlds, null, { timeout: 90000 });
    const snapshot = async name => {
      await page.waitForTimeout(1800);
      const bytes = await page
        .locator('#screen')
        .screenshot({ path: path.join(out, `${backend}-${name}.png`) });
      const png = PNG.sync.read(bytes),
        colors = new Set();
      for (let y = Math.floor(png.height * 0.15); y < png.height * 0.8; y += 4)
        for (let x = 0; x < png.width; x += 4) {
          const i = (y * png.width + x) * 4;
          colors.add(`${png.data[i]},${png.data[i + 1]},${png.data[i + 2]}`);
        }
      assert.ok(colors.size > 150, `${backend}/${name}: visible world geometry`);
      return colors.size;
    };
    assert.equal(await page.evaluate(() => window.__splatWorlds.world), 0);
    const groveColors = await snapshot('grove');
    await page.keyboard.down('w');
    await page.waitForTimeout(300);
    await page.keyboard.up('w');
    assert.ok(await page.evaluate(() => window.__splatWorlds.position[2] < 1.9));
    const tree = await page.evaluate(() => {
      const p = window.__splatWorlds;
      p.pose([-6, 1.6, -4], 0);
      p.move(-6, 1.6, -7);
      return p.position;
    });
    assert.ok(tree[2] >= -5.25);
    const arrived = await page.evaluate(() => {
      const p = window.__splatWorlds;
      p.pose([0, 1.6, 2], 0);
      p.move(0, 1.6, -2.4);
      return p.world;
    });
    assert.equal(arrived, 1);
    await page.evaluate(() => window.__splatWorlds.pose([0, 1.6, -2], Math.PI));
    const gardenColors = await snapshot('garden');
    const pond = await page.evaluate(() => {
      const p = window.__splatWorlds;
      p.pose([6, 1.6, 4], Math.PI);
      p.move(6, 1.6, 7);
      return p.position;
    });
    assert.ok(pond[2] <= 4.75);
    await page.evaluate(() => {
      const p = window.__splatWorlds;
      p.pose([0, 1.6, 1], Math.PI);
      p.move(0, 1.6, -0.4);
    });
    assert.equal(await page.evaluate(() => window.__splatWorlds.world), 0);
    // Storybook mode keeps its own scenery when classic presentation keys are pressed.
    await page.keyboard.press('7');
    await page.keyboard.press(']');
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.__splatWorlds.showcase), null);
    const counts = await page.evaluate(() => window.__splatWorlds.host.counts);
    counts.forEach((count, i) =>
      assert.ok(Math.abs(count - generateStorybookWorld(storybookWorlds[i].id).length / 32) < 16)
    );
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    await page.waitForFunction(() => !!window.__splatWorlds, null, { timeout: 90000 });
    assert.equal(await page.evaluate(() => window.__splatWorlds.world), 0);
    assert.equal(
      await page.evaluate(() => window.__splatWorlds.specs[0].walk.blockers.length),
      storybookWorlds[0].walk.blockers.length + 2
    );
    await page.goto(
      `${base}/console.html?path=/experiments/splat-worlds/cart.js&worldSet=storybook&startWorld=zen-garden&w=640&h=360&backend=${backend}`
    );
    await page.waitForFunction(() => window.__splatWorlds?.world === 1, null, { timeout: 90000 });
    assert.equal(await page.evaluate(() => window.__splatWorlds.position[2]), 0.7);
    await snapshot('garden-entry');
    assert.deepEqual(errors, []);
    report.push({ backend, counts, groveColors, gardenColors, tree, pond, errors });
    console.log(`${backend}: both worlds, walking, collisions, portal round trip and reset PASS`);
    await page.close();
  }
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
} finally {
  await browser.close();
}
