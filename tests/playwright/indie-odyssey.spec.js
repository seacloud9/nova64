import { test, expect } from '@playwright/test';

import { loadCart, pressKey } from './helpers.js';

const REQUIRED_ASSETS = [
  '/indie-odyssey/favicon.png',
  '/indie-odyssey/normal.jpg',
  '/indie-odyssey/images/story/scene1_1.jpeg',
  '/indie-odyssey/images/story/scene1_5.jpeg',
  '/indie-odyssey/images/spritesheet/dataImp.png',
  '/indie-odyssey/images/spritesheet/glitchRat.png',
  '/indie-odyssey/images/spritesheet/sb2sm.png',
  '/indie-odyssey/models/accessories/portal.glb',
  '/indie-odyssey/models/enemies/dataImp.glb',
  '/indie-odyssey/models/enemies/hexWraith.glb',
];

for (const backend of ['threejs', 'babylon']) {
  test.describe(`Indie Odyssey - ${backend}`, () => {
    test('boots, preserves assets/shaders, and enters gameplay', async ({ page, request }) => {
      test.setTimeout(90000);
      const logs = [];
      page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

      for (const asset of REQUIRED_ASSETS) {
        const response = await request.get(asset);
        expect(response.ok(), `${asset} should be served`).toBe(true);
      }

      await loadCart(page, 'indie-odyssey', backend);

      const getBadLogs = () =>
        logs.filter(log => {
          if (log.type === 'error') return true;
          return /Unable to compile effect|shader compilation|program link|fragment shader|vertex shader/i.test(
            log.text
          );
        });

      const boot = await page.evaluate(() => ({
        hasManifest: !!globalThis.__INDIE_ODYSSEY_ASSETS,
        assetBase: globalThis.__INDIE_ODYSSEY_ASSETS?.base,
        defaultDifficulty: globalThis.__INDIE_ODYSSEY_STATE?.difficulty,
        shaderCount: Object.keys(globalThis.__INDIE_ODYSSEY_ASSETS?.shaders || {}).length,
        enemyAssetCount: Object.keys(globalThis.__INDIE_ODYSSEY_ASSETS?.enemies || {}).length,
        backend: globalThis.nova64?.scene?.getBackendCapabilities?.().backend,
      }));

      expect(boot.hasManifest).toBe(true);
      expect(boot.assetBase).toBe('/indie-odyssey/');
      expect(boot.defaultDifficulty).toBe('normal');
      expect(boot.shaderCount).toBeGreaterThanOrEqual(6);
      expect(boot.enemyAssetCount).toBeGreaterThanOrEqual(10);
      expect(boot.backend).toBe(backend);

      expect(getBadLogs(), 'cart should not emit console or shader errors while booting').toEqual([]);

      await page.locator('#screen').click({ force: true });
      await pressKey(page, 'Space', 100);
      await page.waitForTimeout(300);
      await page.waitForFunction(() => globalThis.__INDIE_ODYSSEY_STATE?.screen === 'story');
      await page.waitForFunction(() => globalThis.__INDIE_ODYSSEY_STATE?.storyFrameStatus === 'ready');
      for (let i = 0; i < 10; i++) {
        const currentScreen = await page.evaluate(() => globalThis.__INDIE_ODYSSEY_STATE?.screen);
        if (currentScreen !== 'story') break;
        await pressKey(page, 'Space', 100);
        await page.waitForTimeout(900);
      }
      await page.waitForFunction(() => ['game', 'combat'].includes(globalThis.__INDIE_ODYSSEY_STATE?.screen));

      await pressKey(page, 'w', 200);
      await page.waitForTimeout(600);

      const sceneState = await page.evaluate(() => {
        const cartState = globalThis.__INDIE_ODYSSEY_STATE;
        const camera = globalThis.nova64?.camera?.getCamera?.();
        return {
          meshes: cartState?.meshCount ?? 0,
          loadedModelCount: cartState?.loadedModelCount ?? 0,
          failedModelCount: cartState?.failedModelCount ?? 0,
          screen: cartState?.screen ?? null,
          position: cartState?.position ?? null,
          cameraZ: Number(camera?.position?.z ?? 0),
          cameraX: Number(camera?.position?.x ?? 0),
        };
      });

      expect(sceneState.meshes).toBeGreaterThan(20);
      expect(sceneState.loadedModelCount).toBeGreaterThan(0);
      expect(sceneState.failedModelCount).toBe(0);
      expect(['game', 'combat']).toContain(sceneState.screen);
      expect(sceneState.position).toBeTruthy();
      expect(Number.isFinite(sceneState.cameraX)).toBe(true);
      expect(Number.isFinite(sceneState.cameraZ)).toBe(true);

      await page.evaluate(() => globalThis.__INDIE_ODYSSEY_DEBUG.forceCombat(['data_imp', 'glitch_rat']));
      await page.waitForFunction(() => globalThis.__INDIE_ODYSSEY_STATE?.transition?.type === 'combat');
      // Wait for both sprites and GLB models to fully resolve. Both data_imp
      // and glitch_rat ship .glb models — modelStatus should land on 'ready'
      // (a successful 3D load) or 'error' (graceful sprite-fallback path),
      // never stay at 'loading' indefinitely.
      await page.waitForFunction(() => {
        const assets = globalThis.__INDIE_ODYSSEY_STATE?.combatEnemyAssets || [];
        return (
          assets.length >= 2 &&
          assets.every(a => a.spriteStatus === 'ready') &&
          assets.every(a => ['ready', 'error'].includes(a.modelStatus))
        );
      }, { timeout: 30000 });

      const combatAssets = await page.evaluate(() => globalThis.__INDIE_ODYSSEY_STATE?.combatEnemyAssets || []);
      expect(combatAssets.map(asset => asset.spriteStatus)).toEqual(['ready', 'ready']);
      // Both enemies ship .glb models — they MUST load successfully on a
      // working backend; an 'error' here is a regression (e.g. the babylon
      // material compat shims got dropped, or the GLTFLoader import broke).
      expect(combatAssets.map(asset => asset.modelStatus)).toEqual(['ready', 'ready']);
      expect(getBadLogs(), 'combat should not emit console or shader errors').toEqual([]);

      const combatEnemies = await page.evaluate(() => {
        const enemies = globalThis.__INDIE_ODYSSEY_DEBUG?.getCombatEnemies?.() || [];
        return enemies.map(e => ({ id: e.id, name: e.name, hp: e.hp }));
      });
      expect(combatEnemies.length).toBeGreaterThanOrEqual(2);
      expect(combatEnemies.every(e => typeof e.hp === 'number' && e.hp > 0)).toBe(true);

      await page.evaluate(() => globalThis.__INDIE_ODYSSEY_DEBUG.forcePlayerHit(4, 'Test hit'));
      await page.waitForFunction(() => !!globalThis.__INDIE_ODYSSEY_STATE?.glitchPulse);
    });
  });
}
