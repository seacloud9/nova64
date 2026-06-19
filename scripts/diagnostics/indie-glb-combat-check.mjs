import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const baseUrl = process.env.NOVA64_TEST_BASE || 'http://localhost:3000';
for (const backend of ['threejs', 'babylon']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const url =
    backend === 'babylon'
      ? `${baseUrl}/babylon_console.html?demo=indie-odyssey`
      : `${baseUrl}/console.html?demo=indie-odyssey`;
  const logs = [];
  page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.body.textContent.includes('Loading'));
  await page.waitForTimeout(2500);
  await page.evaluate(() => globalThis.__INDIE_ODYSSEY_DEBUG.forceCombat(['data_imp', 'glitch_rat']));
  await page.waitForFunction(() => {
    const assets = globalThis.__INDIE_ODYSSEY_STATE?.combatEnemyAssets || [];
    return assets.length >= 2 && assets.every(asset => asset.spriteStatus === 'ready' && (asset.modelStatus === 'ready' || asset.modelStatus === 'error' || asset.modelStatus === 'none'));
  }, { timeout: 60000 });
  await page.waitForTimeout(1200);
  const overlayInfo = await page.evaluate(async () => {
    const details = [];
    for (const node of document.querySelectorAll('canvas, [data-indie-odyssey-overlay]')) {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      details.push({
        tag: node.tagName,
        id: node.id,
        className: String(node.className || ''),
        overlay: node.dataset?.indieOdysseyOverlay || null,
        width: node.width,
        height: node.height,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        },
        display: style.display,
        position: style.position,
        zIndex: style.zIndex,
        opacity: style.opacity,
      });
    }
    const screenCanvas = document.getElementById('screen');
    let screenPixelSample = null;
    if (screenCanvas) {
      const W = screenCanvas.width;
      const H = screenCanvas.height;
      // Force one more render-frame then snapshot via 2D copy (toDataURL fails
      // on WebGL canvases with preserveDrawingBuffer:false, so blit to a 2D
      // canvas inside requestAnimationFrame instead).
      const snapshot = await new Promise(resolve => {
        requestAnimationFrame(() => {
          const c2 = document.createElement('canvas');
          c2.width = W;
          c2.height = H;
          const ctx2 = c2.getContext('2d');
          try { ctx2.drawImage(screenCanvas, 0, 0); } catch (e) { resolve(null); return; }
          const data = ctx2.getImageData(0, 0, W, H).data;
          // Probe specifically at the projected enemy positions
          const camera = globalThis.nova64?.scene?.getCamera?.() || globalThis.nova64?.camera?.getCamera?.();
          const probePoints = [];
          for (const id of ['data_imp', 'glitch_rat']) {
            const enemy = globalThis.__INDIE_ODYSSEY_DEBUG?.getCombatEnemies?.().find(e => e.id === id);
            const getMesh = globalThis.nova64?.scene?.getMesh;
            const mesh = enemy?.modelMeshId && getMesh?.(enemy.modelMeshId);
            if (!mesh || !camera) continue;
            const T = globalThis.THREE;
            if (!T) continue;
            const center = new T.Box3().setFromObject(mesh).getCenter(new T.Vector3());
            const proj = center.clone().project(camera);
            const xs = Math.round((proj.x + 1) / 2 * W);
            const ys = Math.round((1 - proj.y) / 2 * H);
            // Sample a wider 7x7 grid around the projected center
            const grid = [];
            for (let dy = -50; dy <= 50; dy += 12) {
              for (let dx = -50; dx <= 50; dx += 12) {
                const px = xs + dx;
                const py = ys + dy;
                if (px < 0 || px >= W || py < 0 || py >= H) continue;
                const i = (py * W + px) * 4;
                grid.push([px, py, data[i], data[i + 1], data[i + 2], data[i + 3]]);
              }
            }
            probePoints.push({ id, centerWorld: { x: center.x, y: center.y, z: center.z }, ndc: { x: proj.x, y: proj.y, z: proj.z }, screenPos: { x: xs, y: ys }, grid });
          }
          // Sample various positions to map out canvas content
          const bgPoints = [];
          for (const [bx, by, name] of [
            [W / 2 | 0, 175, 'panel-middle-text-free'], // FB y=203 (between log lines)
            [W / 2 | 0, 120, 'panel-middle-upper'],      // FB y=139 inside transparent
            [50, 175, 'left-of-panel'],
            [W - 50, 175, 'right-of-panel'],
            [W / 2 | 0, 50, 'above-panel'],
            [W / 2 | 0, 290, 'below-panel'],
          ]) {
            const i = (by * W + bx) * 4;
            bgPoints.push({ name, pos: [bx, by], px: [data[i], data[i + 1], data[i + 2], data[i + 3]] });
          }
          resolve({ probePoints, bgPoints });
        });
      });
      screenPixelSample = { width: W, height: H, snapshot };
    }
    const modelCanvas = document.querySelector('[data-indie-odyssey-overlay="combat-models"]');
    let pixelSample = null;
    if (modelCanvas) {
      const gl = modelCanvas.getContext('webgl2') || modelCanvas.getContext('webgl');
      if (gl) {
        const samples = [];
        for (let y = 40; y < modelCanvas.height; y += 70) {
          for (let x = 40; x < modelCanvas.width; x += 80) {
            const data = new Uint8Array(4);
            gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, data);
            if (data[0] || data[1] || data[2] || data[3]) samples.push([x, y, ...Array.from(data)]);
          }
        }
        pixelSample = samples.slice(0, 12);
      }
    }
    const rendererInfo = (() => {
      const r = globalThis.nova64?.scene?.getRenderer?.() || globalThis.__nova64_renderer__;
      if (!r?.getClearColor) return null;
      const T = globalThis.THREE;
      const c = new T.Color();
      r.getClearColor(c);
      return { clearColor: c.getHexString(), clearAlpha: r.getClearAlpha?.(), outputColorSpace: r.outputColorSpace, toneMapping: r.toneMapping, toneMappingExposure: r.toneMappingExposure };
    })();
    const sceneInfo = (() => {
      const s = globalThis.nova64?.scene?.getScene?.();
      if (!s) return null;
      let visibleMeshes = 0, hiddenMeshes = 0, totalMeshes = 0;
      const visibleSample = [];
      s.traverse(c => {
        if (c.isMesh) {
          totalMeshes++;
          if (c.visible) {
            visibleMeshes++;
            if (visibleSample.length < 20) {
              const T = globalThis.THREE;
              const wp = new T.Vector3();
              c.getWorldPosition(wp);
              const matName = c.material?.type || 'NoMat';
              const colHex = c.material?.color?.getHexString ? c.material.color.getHexString() : '?';
              visibleSample.push({ name: c.name, type: c.type, mat: matName, color: colHex, wp: [+wp.x.toFixed(2), +wp.y.toFixed(2), +wp.z.toFixed(2)] });
            }
          } else hiddenMeshes++;
        }
      });
      return { sceneChildren: s.children.length, totalMeshes, visibleMeshes, hiddenMeshes, visibleSample };
    })();
    return { details, pixelSample, screenPixelSample, sceneInfo, rendererInfo };
  });
  const state = await page.evaluate(() => globalThis.__INDIE_ODYSSEY_STATE);
  const meshes = await page.evaluate(() => {
    const three = globalThis.THREE;
    const getMesh = globalThis.nova64?.scene?.getMesh;
    const assets = globalThis.__INDIE_ODYSSEY_STATE?.combatEnemyAssets || [];
    return assets.map(asset => {
      const enemy = globalThis.__INDIE_ODYSSEY_DEBUG.getCombatEnemies?.().find(item => item.id === asset.id);
      const mesh = enemy?.modelMeshId && getMesh?.(enemy.modelMeshId);
      const mixerInfo = (() => {
        if (!mesh) return null;
        let count = 0;
        const tracks = [];
        const animations = mesh.animations || [];
        for (const a of animations) for (const t of a.tracks) tracks.push(t.name);
        return { animationCount: animations.length, sampleTracks: tracks.slice(0, 8) };
      })();
      const childInfo = [];
      mesh?.traverse?.(c => {
        if (!c.isMesh) return;
        const g = c.geometry;
        let posCount = 0, drawRangeStart = 0, drawRangeCount = -1;
        let bsRadius = -1, bsCenter = null;
        if (g) {
          posCount = g.attributes?.position?.count || 0;
          drawRangeStart = g.drawRange?.start ?? 0;
          drawRangeCount = g.drawRange?.count ?? -1;
          if (!g.boundingSphere) g.computeBoundingSphere();
          if (g.boundingSphere) { bsRadius = g.boundingSphere.radius; bsCenter = { x: g.boundingSphere.center.x, y: g.boundingSphere.center.y, z: g.boundingSphere.center.z }; }
        }
        childInfo.push({ type: c.type, name: c.name, visible: c.visible, skinned: !!c.isSkinnedMesh, frustumCulled: c.frustumCulled, posCount, drawRangeStart, drawRangeCount, bsRadius, bsCenter, layers: c.layers?.mask, renderOrder: c.renderOrder });
      });
      if (!mesh || !three?.Box3 || typeof mesh.updateWorldMatrix !== 'function') {
        return {
          id: asset.id,
          modelMeshId: enemy?.modelMeshId,
          found: !!mesh,
          position: mesh?.position ? { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z } : null,
        };
      }
      const box = new three.Box3().setFromObject(mesh);
      const size = box.getSize(new three.Vector3());
      const center = box.getCenter(new three.Vector3());
      const camera = globalThis.nova64?.camera?.getCamera?.();
      const projected = center.clone();
      if (camera?.isCamera) projected.project(camera);
      const materials = [];
      mesh.traverse?.(child => {
        if (child.isMesh && child.material) {
          const list = Array.isArray(child.material) ? child.material : [child.material];
          for (const mat of list) {
            materials.push({
              name: mat.name,
              type: mat.type,
              color: mat.color?.getHexString?.(),
              emissive: mat.emissive?.getHexString?.(),
              map: !!mat.map,
              visible: mat.visible,
              opacity: mat.opacity,
            });
          }
        }
      });
      return {
        id: asset.id,
        modelMeshId: enemy?.modelMeshId,
        found: true,
        visible: mesh.visible,
        parentType: mesh.parent?.type,
        position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
        scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
        size: { x: size.x, y: size.y, z: size.z },
        center: { x: center.x, y: center.y, z: center.z },
        projected: camera?.isCamera ? { x: projected.x, y: projected.y, z: projected.z } : null,
        materials,
        mixerInfo,
        childInfo,
      };
    });
  });
  await page.screenshot({ path: `screenshots/indie-odyssey-fix/${backend}-glb-combat.png` });
  await page.evaluate(() => {
    document.querySelectorAll('[data-indie-odyssey-overlay="combat-models"]').forEach(node => {
      node.style.background = 'rgba(255, 0, 0, 0.25)';
    });
    document.querySelectorAll('[data-indie-odyssey-overlay="combat"]').forEach(node => {
      node.style.display = 'none';
    });
  });
  await page.screenshot({ path: `screenshots/indie-odyssey-fix/${backend}-glb-raw.png` });
  console.log(backend, JSON.stringify({ state, overlayInfo, meshes, errors: logs.filter(log => log.type === 'error') }));
  await page.close();
}
await browser.close();
