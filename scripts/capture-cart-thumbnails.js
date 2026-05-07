import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const EXAMPLES_DIR = path.join(ROOT_DIR, 'examples');
const OUTPUT_DIR = path.join(ROOT_DIR, 'public', 'assets', 'cart-thumbs');

const DEV_PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${DEV_PORT}`;

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const carts = fs.readdirSync(EXAMPLES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`Found ${carts.length} carts. Launching browser...`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  let successCount = 0;
  let failCount = 0;

  for (const cart of carts) {
    // Use the ?demo= parameter which is properly handled by src/main.js
    const url = `${BASE_URL}/console.html?demo=${cart}`;
    console.log(`[${successCount + failCount + 1}/${carts.length}] Capturing ${cart}...`);

    // Create a fresh page per cart to avoid state leaking between carts
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });

      // Wait for the cart to fully load by polling __nova64CartLoadState.ready
      await page.waitForFunction(() => {
        return globalThis.__nova64CartLoadState && globalThis.__nova64CartLoadState.ready === true;
      }, { timeout: 15000 });

      // Wait for init() to complete and first frames to render
      await page.waitForTimeout(2000);

      // Force the game past any start screen by directly setting gameState
      // and clicking the canvas center (some carts use canvas UI buttons).
      // NOTE: We intentionally do NOT press Enter, because main.js treats
      // Enter as a cart-reset key, which would reload the cart back to the
      // start screen.
      await page.evaluate(() => {
        // Many carts gate on a global 'gameState' variable — force it past 'start'
        if (typeof globalThis.gameState !== 'undefined') {
          globalThis.gameState = 'playing';
        }
      });

      const canvasEl = page.locator('#screen');

      // Multiple rounds of mouse clicks + Space to bypass start screens
      // (Space triggers action buttons in many carts without resetting)
      for (let round = 0; round < 3; round++) {
        await canvasEl.click({ force: true, position: { x: 416, y: 233 } }); // center area
        await page.keyboard.press('Space');
        await page.keyboard.press('KeyZ');
        await page.keyboard.press('KeyX');
        await page.waitForTimeout(400);
      }

      // Wait for the game to run many frames so we capture actual gameplay
      await page.waitForTimeout(4000);

      // Screenshot ONLY the canvas element — no outer chrome
      const outputPath = path.join(OUTPUT_DIR, `${cart}.png`);
      await canvasEl.screenshot({ path: outputPath });

      successCount++;
      console.log(`  ✅ Saved ${cart}.png`);
    } catch (e) {
      failCount++;
      console.error(`  ❌ Failed ${cart}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log(`\nDone! ${successCount} succeeded, ${failCount} failed out of ${carts.length} carts.`);
}

main().catch(console.error);
