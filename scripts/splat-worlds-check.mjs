import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
const option = (key, fallback) =>
  process.argv.find(a => a.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
const base = option('base', 'http://127.0.0.1:5193');
const out = path.resolve(option('out', 'retroarch/build/splat-worlds'));
fs.mkdirSync(out, { recursive: true });
for (const name of ['apartment.sog', 'skull.splat']) {
  const file = path.resolve('experiments/gaussian-splatting/assets', name);
  const source = JSON.parse(fs.readFileSync(file + '.source.json'));
  assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), source.sha256);
}
const browser = await chromium.launch({
  headless: true,
  args: process.platform === 'darwin' ? ['--use-angle=metal'] : [],
});
const report = {
  checks: [],
  scope:
    'Experimental Three.js/Spark and Babylon live splat portals; single bounce, flat floor proxy',
  assets: ['apartment.sog', 'skull.splat'].map(name =>
    JSON.parse(fs.readFileSync(`experiments/gaussian-splatting/assets/${name}.source.json`))
  ),
};
function normalized(bytes) {
  const input = PNG.sync.read(bytes);
  if (input.width === 640 && input.height === 360) return bytes;
  const output = new PNG({ width: 640, height: 360 });
  for (let y = 0; y < 360; y++)
    for (let x = 0; x < 640; x++) {
      const src =
        (Math.floor((y * input.height) / 360) * input.width + Math.floor((x * input.width) / 640)) *
        4;
      input.data.copy(output.data, (y * 640 + x) * 4, src, src + 4);
    }
  return PNG.sync.write(output);
}
function average(png, x, y, r = 8) {
  const sum = [0, 0, 0];
  let count = 0;
  for (let yy = y - r; yy <= y + r; yy++)
    for (let xx = x - r; xx <= x + r; xx++) {
      const i = (yy * png.width + xx) * 4;
      for (let c = 0; c < 3; c++) sum[c] += png.data[i + c];
      count++;
    }
  return sum.map(v => v / count);
}
function difference(a, b) {
  let sum = 0;
  for (let i = 0; i < a.data.length; i += 4)
    for (let c = 0; c < 3; c++) sum += Math.abs(a.data[i + c] - b.data[i + c]);
  return sum / (a.width * a.height * 3);
}
try {
  for (const backend of ['three', 'babylon']) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => {
      if (m.type() === 'error' && !/404|favicon/.test(m.text())) errors.push(m.text());
    });
    await page.addInitScript(() => {
      const callbacks = new Map();
      let id = 0,
        time = 0;
      window.requestAnimationFrame = callback => {
        callbacks.set(++id, callback);
        return id;
      };
      window.cancelAnimationFrame = id => callbacks.delete(id);
      window.__worldStep = () => {
        time += 1000 / 60;
        const batch = [...callbacks.values()];
        callbacks.clear();
        for (const callback of batch) callback(time);
      };
      performance.now = () => time;
    });
    await page.goto(
      `${base}/console.html?${backend === 'babylon' ? 'backend=babylon&' : ''}path=/experiments/splat-worlds/cart.js&w=640&h=360`
    );
    await page.waitForFunction(() => !!window.__splatWorlds, null, {
      polling: 100,
      timeout: 90000,
    });
    const steps = async (n = 1) => {
      for (let i = 0; i < n; i++) {
        await page.evaluate(() => window.__worldStep());
        await page.waitForTimeout(20);
      }
    };
    const snapshot = async name => {
      await steps(8);
      const encoded = await page.evaluate(() => {
        window.__worldStep();
        return document.querySelector('#screen').toDataURL().split(',')[1];
      });
      const bytes = normalized(Buffer.from(encoded, 'base64'));
      if (name) fs.writeFileSync(path.join(out, backend + '-' + name + '.png'), bytes);
      return PNG.sync.read(bytes);
    };
    await steps(30);
    const counts = await page.evaluate(() => window.__splatWorlds.host.counts);
    assert.ok(counts[0] >= 661466 && counts[0] < 661500);
    assert.ok(counts[1] >= 162598 && counts[1] < 162620);
    await snapshot('apartment');
    if (process.argv.includes('--capture')) {
      const frames = path.join(out, backend + '-frames');
      fs.mkdirSync(frames, { recursive: true });
      for (let frame = 0; frame < 48 * 15; frame++) {
        const t = frame / 15;
        await page.evaluate(t => {
          const p = window.__splatWorlds;
          let x = 0,
            z,
            yaw;
          if (t < 20) {
            x = t < 8 ? Math.sin(t * 0.65) * 0.55 : 0;
            const sourceZ = t < 8 ? 2 - t * 0.1 : 1.2 - (t - 8) * 0.3;
            z = p.world === 0 ? sourceZ : -sourceZ - 2;
            yaw = p.world === 0 ? 0 : Math.PI;
          } else if (t < 36) {
            z = 0.4 + Math.min(t - 20, 10) * 0.1;
            x = Math.sin((t - 20) * 0.25) * 0.3;
            yaw = t < 30 ? Math.PI : Math.PI * (1 - (t - 30) / 6);
          } else {
            const sourceZ = 1.4 - (t - 36) * 0.17;
            z = p.world === 1 ? sourceZ : -sourceZ - 2;
            yaw = p.world === 1 ? 0 : Math.PI;
          }
          const before = p.world;
          p.move(x, 1.6, z);
          if (before !== p.world) yaw += Math.PI;
          p.pose(p.position, yaw);
          p.setTime(t);
          p.setEffect(t > 23 && t < 27 ? 3 : t > 27 && t < 30 ? 4 : 0);
        }, t);
        // Advance a real render, then yield to async sort workers between frames.
        const encoded = await page.evaluate(() => {
          window.__worldStep();
          return document.querySelector('#screen').toDataURL().split(',')[1];
        });
        fs.writeFileSync(
          path.join(frames, String(frame).padStart(5, '0') + '.png'),
          normalized(Buffer.from(encoded, 'base64'))
        );
        if (frame % 30 === 0) console.log(backend, 'capture', frame, '/ 720');
        await page.waitForTimeout(10);
      }
      const movie = spawnSync(
        'ffmpeg',
        [
          '-y',
          '-loglevel',
          'error',
          '-framerate',
          '15',
          '-i',
          path.join(frames, '%05d.png'),
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-crf',
          '18',
          path.join(out, backend + '-walkthrough.mp4'),
        ],
        { encoding: 'utf8' }
      );
      assert.equal(movie.status, 0, movie.stderr);
      fs.rmSync(frames, { recursive: true });
      await page.evaluate(() => {
        window.__splatWorlds.pose([0, 1.6, 2], 0);
        window.__splatWorlds.setEffect(0);
      });
    }

    await page.evaluate(() => window.__splatWorlds.pose([0.7, 1.6, 1], 0));
    await snapshot('peek');
    // Real crossing and reverse crossing, plus an out-of-aperture non-crossing.
    const crossing = await page.evaluate(() => {
      const p = window.__splatWorlds;
      p.pose([0, 1.6, 1], 0);
      p.move(0, 1.6, -2.3);
      const arrival = { world: p.world, position: p.position };
      p.move(0, 1.6, -0.3);
      const returned = { world: p.world, position: p.position };
      p.pose([2, 1.6, 0], 0);
      p.move(2, 1.6, -3);
      const outside = p.world;
      p.pose([0, 1.6, 2], 0);
      return { arrival, returned, outside };
    });
    assert.equal(crossing.arrival.world, 1);
    assert.ok(Math.abs(crossing.arrival.position[2] - 0.3) < 1e-6);
    assert.equal(crossing.returned.world, 0);
    assert.equal(crossing.outside, 0);
    await page.keyboard.down('KeyW');
    await steps(15);
    await page.keyboard.up('KeyW');
    assert.ok(
      (await page.evaluate(() => window.__splatWorlds.position[2])) < 1.9,
      'WASD input moves player'
    );
    // Pixel fixtures remove the scan only for controlled portal/depth assertions.
    await page.evaluate(async backend => {
      const p = window.__splatWorlds;
      p.pose([0, 1.6, 2], 0);
      if (backend === 'three') {
        const T = await import('three');
        const [source, destination] = p.host.worlds;
        source.scene.children.forEach(o => (o.visible = false));
        source.portal.parent.visible = true;
        destination.scene.children.forEach(o => (o.visible = false));
        const cube = (scene, color, x, y, z) => {
          const m = new T.Mesh(
            new T.BoxGeometry(0.8, 0.8, 0.3),
            new T.MeshBasicMaterial({ color })
          );
          m.position.set(x, y, z);
          scene.add(m);
          return m;
        };
        window.__portalFixtures = {
          green: cube(destination.scene, 0x00ff00, 0, 1.6, 2),
          red: cube(destination.scene, 0xff0000, 0, 1.6, -0.8),
          blue: cube(source.scene, 0x0000ff, 0, 1.6, 0),
        };
        window.__portalFixtures.blue.visible = false;
      } else {
        const B = await import('/experiments/splat-worlds/babylon-host.js');
        const [source, destination] = p.host.worlds;
        for (const w of p.host.worlds) for (const mesh of w.meshes) mesh.setEnabled(false);
        source.portal.setEnabled(true);
        const cube = (world, color, x, y, z) => {
          const mesh = B.MeshBuilder.CreateBox(
            'pixel-fixture',
            { width: 0.8, height: 0.8, depth: 0.3 },
            nova64.scene.getScene()
          );
          mesh.position.set(x, y, z);
          mesh.layerMask = world.mask;
          const material = new B.StandardMaterial('fixture', nova64.scene.getScene());
          material.disableLighting = true;
          material.emissiveColor = B.Color3.FromHexString(color);
          mesh.material = material;
          world.meshes.push(mesh);
          return mesh;
        };
        window.__portalFixtures = {
          green: cube(destination, '#00ff00', 0, 1.6, 2),
          red: cube(destination, '#ff0000', 0, 1.6, -0.8),
          blue: cube(source, '#0000ff', 0, 1.6, 0),
        };
        window.__portalFixtures.blue.setEnabled(false);
      }
    }, backend);
    const clipped = await snapshot('clip');
    const center = average(clipped, 320, 180);
    assert.ok(
      center[1] > center[0] + 80 && center[1] > center[2] + 80,
      `destination clipping: ${center}`
    );
    await page.evaluate(backend => {
      const m = window.__portalFixtures.blue;
      if (backend === 'three') m.visible = true;
      else m.setEnabled(true);
    }, backend);
    const occluded = await snapshot('occlusion'),
      blue = average(occluded, 320, 180);
    assert.ok(blue[2] > blue[0] + 80 && blue[2] > blue[1] + 80, `foreground depth: ${blue}`);
    await page.evaluate(backend => {
      const m = window.__portalFixtures.blue;
      if (backend === 'three') m.visible = false;
      else m.setEnabled(false);
      window.__splatWorlds.pose([0.7, 1.6, 2], 0);
    }, backend);
    const shifted = await snapshot('parallax');
    const greenCentroid = png => {
      let x = 0,
        n = 0;
      for (let yy = 80; yy < 280; yy++)
        for (let xx = 100; xx < 540; xx++) {
          const i = (yy * 640 + xx) * 4;
          if (png.data[i + 1] > png.data[i] + 80 && png.data[i + 1] > png.data[i + 2] + 80) {
            x += xx;
            n++;
          }
        }
      assert.ok(n > 50);
      return x / n;
    };
    const displacement = greenCentroid(shifted) - greenCentroid(clipped);
    assert.ok(displacement < -15, `destination parallax: ${displacement}`);
    // Re-enable original data, enter the gallery and inspect the actual scan with effects.
    await page.evaluate(backend => {
      const p = window.__splatWorlds;
      if (backend === 'three')
        for (const w of p.host.worlds) w.scene.children.forEach(o => (o.visible = true));
      else for (const w of p.host.worlds) for (const m of w.meshes) m.setEnabled(true);
      for (const m of Object.values(window.__portalFixtures)) {
        if (backend === 'three') {
          m.removeFromParent();
          m.geometry.dispose();
          m.material.dispose();
        } else m.setEnabled(false);
      }
      p.pose([0, 1.6, 0], 0);
      p.move(0, 1.6, -2.2);
      p.pose([0, 1.6, 1], Math.PI);
    }, backend);
    await steps(30);
    const original = await snapshot('gallery');
    await page.evaluate(() => window.__splatWorlds.setEffect(4));
    const tinted = await snapshot('tint');
    const tintDifference = difference(original, tinted);
    assert.ok(tintDifference > 0.2, `splat tint affects actual pixels: ${tintDifference}`);
    const resourceCounts = await page.evaluate(async () => {
      const scene = nova64.scene.getScene();
      const { runCartResetHooks, listCartResetHooks } = await import('/runtime/cart-reset.js');
      await runCartResetHooks({ reason: 'portal-test' });
      return {
        probe: !!window.__splatWorlds,
        hooks: listCartResetHooks(),
        remaining: scene.isScene
          ? scene.children.filter(o => !o.isLight).length
          : scene.meshes.filter(m => m.name.includes('portal') || m.name.includes('Gaussian'))
              .length,
      };
    });
    assert.equal(resourceCounts.probe, false);
    assert.ok(!resourceCounts.hooks.includes('splat-worlds'));
    assert.equal(resourceCounts.remaining, 0, JSON.stringify(resourceCounts));
    assert.deepEqual(errors, []);
    report.checks.push({
      backend,
      counts,
      crossing,
      clipping: center,
      occlusion: blue,
      parallaxPixels: displacement,
      tintDifference,
      reset: resourceCounts,
      errors,
    });
    console.log(backend, 'PASS', JSON.stringify(report.checks.at(-1)));
    await page.close();
  }
  if (process.argv.includes('--capture')) {
    const labelPage = await browser.newPage();
    const labels = await labelPage.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 360;
      const context = canvas.getContext('2d');
      context.font = '14px sans-serif';
      for (const [text, x] of [
        ['Three.js / Spark', 10],
        ['Babylon.js', 650],
      ]) {
        context.fillStyle = 'rgba(0,0,0,.8)';
        context.fillRect(x, 29, 140, 22);
        context.fillStyle = 'white';
        context.fillText(text, x + 5, 45);
      }
      return canvas.toDataURL().split(',')[1];
    });
    await labelPage.close();
    fs.writeFileSync(path.join(out, 'labels.png'), Buffer.from(labels, 'base64'));
    const movie = spawnSync(
      'ffmpeg',
      [
        '-y',
        '-loglevel',
        'error',
        '-i',
        path.join(out, 'three-walkthrough.mp4'),
        '-i',
        path.join(out, 'babylon-walkthrough.mp4'),
        '-i',
        path.join(out, 'labels.png'),
        '-filter_complex',
        '[0:v][1:v]hstack=inputs=2[views];[views][2:v]overlay=0:0[v]',
        '-map',
        '[v]',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-crf',
        '18',
        path.join(out, 'comparison.mp4'),
      ],
      { encoding: 'utf8' }
    );
    assert.equal(movie.status, 0, movie.stderr);
    report.capture = {
      seconds: 48,
      fps: 15,
      type: 'Fixed-step camera motion, not a real-time performance benchmark',
      layout: 'Three.js/Spark left; Babylon right',
    };
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
