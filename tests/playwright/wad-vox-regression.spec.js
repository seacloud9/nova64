import { test, expect } from '@playwright/test';
import { extractMetrics, loadCart, pressKey, waitFor3DScene } from './helpers.js';

const BACKENDS = ['threejs', 'babylon'];

function collectConsole(page) {
  const logs = [];
  page.on('console', msg => {
    logs.push({ type: msg.type(), text: msg.text() });
  });
  return logs;
}

function getErrorText(logs) {
  return logs
    .filter(log => log.type === 'error')
    .map(log => log.text)
    .join('\n');
}

async function getWadDemoState(page) {
  return await page.evaluate(() => globalThis.__nova64WadDemoState?.() ?? null);
}

test.describe('WAD Regression', () => {
  for (const backend of BACKENDS) {
    test(`wad-demo: bundled FreeDoom asset should load and start in ${backend}`, async ({
      page,
    }) => {
      const logs = collectConsole(page);

      await loadCart(page, 'wad-demo', backend);

      await expect
        .poll(async () => (await getWadDemoState(page))?.gameState || '', {
          timeout: 30000,
        })
        .toBe('menu');

      const menuState = await getWadDemoState(page);
      expect(menuState?.loadError).toBeNull();
      expect(menuState?.engineAvailable).toBe(true);
      expect(menuState?.mapCount ?? 0).toBeGreaterThan(0);
      expect(menuState?.currentMap).toBeTruthy();

      await pressKey(page, 'Enter', 100);

      await expect
        .poll(async () => (await getWadDemoState(page))?.gameState || '', { timeout: 10000 })
        .toBe('playing');

      const playingState = await getWadDemoState(page);
      expect(playingState?.wallCount ?? 0).toBeGreaterThan(0);
      expect(playingState?.playerHealth ?? 0).toBeGreaterThan(0);
      expect(playingState?.ammo ?? 0).toBeGreaterThan(0);

      await page.waitForTimeout(1000);

      const errorText = getErrorText(logs);
      expect(errorText).not.toContain('Cart update() error:');
      expect(errorText).not.toContain('startLevel() crashed:');
      expect(errorText).not.toContain("reading 'x'");
      expect(errorText).not.toContain("reading 'uv'");
      expect(errorText).not.toContain('WAD load failed:');
    });
  }
});

test.describe('VOX Regression', () => {
  for (const backend of BACKENDS) {
    test(`vox-viewer: house.vox should load in ${backend}`, async ({ page }) => {
      const logs = collectConsole(page);

      await loadCart(page, 'vox-viewer', backend);
      await waitFor3DScene(page, backend);

      await expect
        .poll(
          () => extractMetrics(logs).printCalls.find(text => text.startsWith('Model: ')) || '',
          { timeout: 15000 }
        )
        .toContain('house.vox');

      const errorText = getErrorText(logs);
      expect(errorText).not.toContain('Failed to load .vox model:');
      expect(errorText).toBe('');
    });
  }
});
