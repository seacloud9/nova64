#!/usr/bin/env node
// Bake the web runtime's procedural skies into 2:1 equirect panoramas for hosts
// without the GLSL sky shaders (Godot's PanoramaSkyMaterial).
//
//   node scripts/bake-sky-presets.mjs [baseUrl]   (default http://localhost:5173)
//
// Needs a running Nova64 server (pnpm dev or vite preview). For each preset in
// runtime/api-skybox.js (plus the default createSpaceSkybox look) it builds the
// real sky dome, renders it into a cube map, converts that to an equirect image
// and writes public/assets/sky/presets/<name>.jpg (JPEG q0.9, ~300 KB). Godot sees the folder through
// nova64-godot/godot_project/assets/sky -> public/assets/sky.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/assets/sky/presets');
const BASE = process.argv[2] || 'http://localhost:5173';
const WIDTH = 2048;
const HEIGHT = 1024;
// Fixed seeds so re-baking produces the same images.
const SKIES = [
  { name: 'space', call: 'createSpaceSkybox', opts: { seed: 7.3 } },
  ...['deepspace', 'cosmos', 'sunset', 'ocean', 'meadow', 'highlands', 'aurora'].map(name => ({
    name,
    call: 'createSkyPreset',
    preset: name,
    opts: { seed: 7.3 },
  })),
];

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto(`${BASE}/cart-runner.html?demo=hello-world`);
await page.waitForFunction(
  () => globalThis.__THREE__ && globalThis.__THREE_RENDERER__ && globalThis.nova64?.light,
  null,
  {
    timeout: 60000,
  }
);

for (const sky of SKIES) {
  const dataUrl = await page.evaluate(
    async ({ sky, W, H }) => {
      const THREE = globalThis.__THREE__;
      const renderer = globalThis.__THREE_RENDERER__;
      const scene = globalThis.__THREE_SCENE__;
      const light = globalThis.nova64.light;
      if (sky.call === 'createSkyPreset') light.createSkyPreset(sky.preset, sky.opts);
      else light.createSpaceSkybox(sky.opts);
      // Let the runtime tick once so time-based uniforms are initialised.
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      // Only the sky objects: the dome (renderOrder -1000) and the star sprites (-999).
      const skyObjs = scene.children.filter(o => o.renderOrder === -1000 || o.renderOrder === -999);
      if (!skyObjs.length) throw new Error('no sky objects for ' + sky.name);
      const bakeScene = new THREE.Scene();
      bakeScene.background = new THREE.Color(0x000000);
      const saved = skyObjs.map(o => ({ o, parent: o.parent, pos: o.position.clone() }));
      for (const o of skyObjs) {
        o.position.set(0, 0, 0);
        bakeScene.add(o);
      }
      const cubeRT = new THREE.WebGLCubeRenderTarget(1024, { type: THREE.UnsignedByteType });
      const cubeCam = new THREE.CubeCamera(0.1, 5000, cubeRT);
      const prevTarget = renderer.getRenderTarget();
      const prevTone = renderer.toneMapping;
      renderer.toneMapping = THREE.NoToneMapping;
      cubeCam.update(renderer, bakeScene);

      // Cube map -> equirect. u wraps longitude, v runs from zenith (top) to nadir.
      const quad = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({
          uniforms: { uCube: { value: cubeRT.texture } },
          vertexShader:
            'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
          fragmentShader: `
            uniform samplerCube uCube; varying vec2 vUv;
            void main(){
              float lon = (vUv.x - 0.5) * 6.28318530718;
              float lat = (vUv.y - 0.5) * 3.14159265359;
              vec3 dir = vec3(sin(lon) * cos(lat), sin(lat), -cos(lon) * cos(lat));
              gl_FragColor = vec4(textureCube(uCube, dir).rgb, 1.0);
            }`,
          depthTest: false,
          depthWrite: false,
        })
      );
      const quadScene = new THREE.Scene();
      quadScene.add(quad);
      const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType });
      renderer.setRenderTarget(rt);
      renderer.render(quadScene, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
      const px = new Uint8Array(W * H * 4);
      renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
      renderer.setRenderTarget(prevTarget);
      renderer.toneMapping = prevTone;

      // Restore the sky to the live scene, then clear it for the next bake.
      for (const { o, parent, pos } of saved) {
        o.position.copy(pos);
        (parent || scene).add(o);
      }
      light.clearSkybox();
      cubeRT.dispose();
      rt.dispose();

      // GL rows are bottom-up; flip into a canvas and encode JPEG.
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      const img = ctx.createImageData(W, H);
      for (let y = 0; y < H; y++)
        img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
      ctx.putImageData(img, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.9);
    },
    { sky, W: WIDTH, H: HEIGHT }
  );
  const file = path.join(OUT, `${sky.name}.jpg`);
  fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(
    `baked ${path.relative(ROOT, file)} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`
  );
}
await browser.close();
