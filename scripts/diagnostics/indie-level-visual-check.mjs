import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORT = Number(process.env.NOVA64_VISUAL_PORT || 3021);
const BASE = process.env.NOVA64_TEST_BASE || `http://127.0.0.1:${PORT}`;
const OUT_DIR = path.join(ROOT, 'screenshots', 'indie-odyssey-fix');

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function serverReady() {
  try {
    const response = await fetch(BASE);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function pressSpace(page, ms = 100) {
  await page.keyboard.down('Space');
  await page.waitForTimeout(ms);
  await page.keyboard.up('Space');
}

function imageStats(buffer) {
  const png = PNG.sync.read(buffer);
  let r = 0;
  let g = 0;
  let b = 0;
  let bright = 0;
  let hot = 0;
  let pixels = 0;

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      const a = png.data[i + 3];
      if (a === 0) continue;
      const pr = png.data[i];
      const pg = png.data[i + 1];
      const pb = png.data[i + 2];
      const lum = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb;
      r += pr;
      g += pg;
      b += pb;
      bright += lum;
      if (lum > 180 || pr > 220 || pg > 220 || pb > 220) hot++;
      pixels++;
    }
  }

  return {
    width: png.width,
    height: png.height,
    avgRgb: [r / pixels, g / pixels, b / pixels].map(v => Number(v.toFixed(1))),
    avgLum: Number((bright / pixels).toFixed(1)),
    hotRatio: Number((hot / pixels).toFixed(4)),
  };
}

async function captureBackend(backend) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const html = backend === 'babylon' ? 'babylon_console.html' : 'console.html';
  const logs = [];
  page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

  await page.goto(`${BASE}/${html}?demo=indie-odyssey`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => globalThis.__INDIE_ODYSSEY_DEBUG?.forceCombat, {
    timeout: 60000,
  });

  await page.locator('#screen').click({ force: true });
  await pressSpace(page);
  await page.waitForFunction(() => globalThis.__INDIE_ODYSSEY_STATE?.screen === 'story', {
    timeout: 30000,
  });
  await page.waitForFunction(
    () => globalThis.__INDIE_ODYSSEY_STATE?.storyFrameStatus === 'ready',
    { timeout: 30000 }
  );

  for (let i = 0; i < 10; i++) {
    const screen = await page.evaluate(() => globalThis.__INDIE_ODYSSEY_STATE?.screen);
    if (screen !== 'story') break;
    await pressSpace(page);
    await page.waitForTimeout(900);
  }
  await page.waitForFunction(() => globalThis.__INDIE_ODYSSEY_STATE?.screen === 'game', {
    timeout: 30000,
  });
  await page.waitForTimeout(1000);

  const file = path.join(OUT_DIR, `${backend}-level-current.png`);
  const buffer = await page.locator('#screen').screenshot({ path: file });
  const state = await page.evaluate(() => globalThis.__INDIE_ODYSSEY_STATE);
  await browser.close();

  return {
    backend,
    file,
    stats: imageStats(buffer),
    state: {
      screen: state?.screen,
      position: state?.position,
      direction: state?.direction,
    },
    badLogs: logs.filter(
      log =>
        log.type === 'error' ||
        /Unable to compile effect|shader compilation|program link|fragment shader|vertex shader/i.test(
          log.text
        )
    ),
  };
}

let server = null;
if (!process.env.NOVA64_TEST_BASE) {
  server = spawn('pnpm', ['exec', 'vite', '--host', '127.0.0.1', '--port', String(PORT)], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  for (let i = 0; i < 120 && !(await serverReady()); i++) await wait(500);
}

try {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [];
  for (const backend of ['threejs', 'babylon']) {
    results.push(await captureBackend(backend));
  }
  console.log(JSON.stringify(results, null, 2));
  if (results.some(result => result.badLogs.length)) process.exitCode = 1;
} finally {
  server?.kill('SIGTERM');
}
