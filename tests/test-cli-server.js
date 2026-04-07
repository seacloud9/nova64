// tests/test-cli-server.js
// Integration tests for the nova64 --start-demo CLI server
// Verifies that dist/ is properly built and all routes resolve correctly.

import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { resolve, join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, existsSync } from 'fs';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');

// ---------------------------------------------------------------------------
// Minimal reproduction of the CLI server from bin/nova64.js
// ---------------------------------------------------------------------------

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.map': 'application/json',
};

async function servePath(filePath) {
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) {
      filePath = join(filePath, 'index.html');
    }
    const data = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    return { data, mime, status: 200 };
  } catch {
    // Try adding .html extension (e.g. /console → /console.html)
    if (!extname(filePath)) {
      try {
        const htmlPath = filePath + '.html';
        const data = await readFile(htmlPath);
        return { data, mime: 'text/html; charset=utf-8', status: 200 };
      } catch {
        // fall through to null
      }
    }
    return null;
  }
}

function createTestServer() {
  return new Promise((resolvePromise, reject) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost`);
      const pathname = decodeURIComponent(url.pathname);
      const safePath = resolve(distDir, '.' + pathname);

      if (!safePath.startsWith(distDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      const result = await servePath(safePath);
      if (result) {
        res.writeHead(result.status, {
          'Content-Type': result.mime,
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(result.data);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    // Listen on port 0 to get a random available port
    server.listen(0, () => {
      const port = server.address().port;
      resolvePromise({ server, port });
    });
    server.on('error', reject);
  });
}

function httpGet(port, path) {
  return new Promise((resolvePromise, reject) => {
    const req = http.get(`http://localhost:${port}${path}`, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => resolvePromise({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${path}`));
    });
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

import { TestRunner, Assert } from './test-runner.js';

export async function runCLIServerTests() {
  const runner = new TestRunner();

  // ---- Phase 1: dist/ structure validation (no server needed) ----

  runner.test('dist/ directory exists', () => {
    Assert.isTrue(existsSync(distDir), 'dist/ directory must exist — run pnpm build first');
  });

  runner.test('dist/index.html exists', () => {
    Assert.isTrue(existsSync(resolve(distDir, 'index.html')), 'dist/index.html missing');
  });

  runner.test('dist/console.html exists', () => {
    Assert.isTrue(existsSync(resolve(distDir, 'console.html')), 'dist/console.html missing');
  });

  runner.test('dist/cart-runner.html exists', () => {
    Assert.isTrue(
      existsSync(resolve(distDir, 'cart-runner.html')),
      'dist/cart-runner.html missing'
    );
  });

  runner.test('dist/assets/ contains bundled JS', () => {
    const assetsDir = resolve(distDir, 'assets');
    Assert.isTrue(existsSync(assetsDir), 'dist/assets/ missing');
    const files = readdirSync(assetsDir);
    const hasMainJS = files.some(f => f.startsWith('main-') && f.endsWith('.js'));
    Assert.isTrue(hasMainJS, 'dist/assets/ must contain main-*.js bundle');
  });

  runner.test('dist/examples/hello-world/code.js exists', () => {
    Assert.isTrue(
      existsSync(resolve(distDir, 'examples', 'hello-world', 'code.js')),
      'dist/examples/hello-world/code.js missing — postbuild may have failed'
    );
  });

  // ---- Phase 2: HTTP route tests (start real server) ----

  let testServer = null;
  let port = 0;

  runner.test('CLI server starts successfully', async () => {
    const result = await createTestServer();
    testServer = result.server;
    port = result.port;
    Assert.isTrue(port > 0, 'Server should bind to a valid port');
  });

  runner.test('GET / → 200 homepage', async () => {
    const res = await httpGet(port, '/');
    Assert.equals(res.status, 200, 'Homepage should return 200');
    Assert.isTrue(res.body.includes('<html'), 'Homepage should be HTML');
    Assert.isTrue(
      res.headers['content-type'].includes('text/html'),
      'Content-Type should be text/html'
    );
  });

  runner.test('GET /console.html → 200', async () => {
    const res = await httpGet(port, '/console.html');
    Assert.equals(res.status, 200, 'console.html should return 200');
    Assert.isTrue(res.body.includes('NOVA-64'), 'Should contain NOVA-64 title');
  });

  runner.test('GET /cart-runner.html → 200', async () => {
    const res = await httpGet(port, '/cart-runner.html');
    Assert.equals(res.status, 200, 'cart-runner.html should return 200');
    Assert.isTrue(res.body.includes('<canvas'), 'Should contain canvas element');
  });

  runner.test('GET /console (no .html) → 200 via extension fallback', async () => {
    const res = await httpGet(port, '/console');
    Assert.equals(res.status, 200, '/console should resolve to console.html');
    Assert.isTrue(
      res.headers['content-type'].includes('text/html'),
      'Content-Type should be text/html'
    );
    Assert.isTrue(res.body.includes('NOVA-64'), 'Should serve console.html content');
  });

  runner.test('GET /cart-runner (no .html) → 200 via extension fallback', async () => {
    const res = await httpGet(port, '/cart-runner');
    Assert.equals(res.status, 200, '/cart-runner should resolve to cart-runner.html');
    Assert.isTrue(res.body.includes('<canvas'), 'Should serve cart-runner.html content');
  });

  runner.test('GET /examples/hello-world/code.js → 200', async () => {
    const res = await httpGet(port, '/examples/hello-world/code.js');
    Assert.equals(res.status, 200, 'Example cart should return 200');
    Assert.isTrue(
      res.headers['content-type'].includes('javascript'),
      'Content-Type should be javascript'
    );
    Assert.isTrue(res.body.includes('export function'), 'Cart code should contain export function');
  });

  runner.test('GET /assets/main-*.js → 200 (bundled JS)', async () => {
    // Find the actual main-*.js filename
    const assetsDir = resolve(distDir, 'assets');
    const files = readdirSync(assetsDir);
    const mainFile = files.find(f => f.startsWith('main-') && f.endsWith('.js'));
    Assert.isTrue(!!mainFile, 'main-*.js bundle must exist');

    const res = await httpGet(port, `/assets/${mainFile}`);
    Assert.equals(res.status, 200, 'Bundled JS should return 200');
    Assert.isTrue(
      res.headers['content-type'].includes('javascript'),
      'Content-Type should be javascript'
    );
  });

  runner.test('GET /nonexistent → 404', async () => {
    const res = await httpGet(port, '/nonexistent-path-that-does-not-exist');
    Assert.equals(res.status, 404, 'Missing path should return 404');
  });

  runner.test('GET /os9-shell/ → 200 (if os9-shell built)', async () => {
    if (existsSync(resolve(distDir, 'os9-shell', 'index.html'))) {
      const res = await httpGet(port, '/os9-shell/');
      Assert.equals(res.status, 200, 'os9-shell should return 200');
    } else {
      console.log('    ⚠ dist/os9-shell/ not found, skipping (run pnpm osBuild first)');
    }
  });

  runner.test('Directory traversal blocked', async () => {
    const res = await httpGet(port, '/../package.json');
    // Should either 403 or 404, never 200 with package.json contents
    Assert.isTrue(
      res.status === 403 || res.status === 404 || !res.body.includes('"nova64"'),
      'Directory traversal must not serve files outside dist/'
    );
  });

  runner.test('Console.html links use absolute paths that resolve', async () => {
    const res = await httpGet(port, '/console.html');
    Assert.equals(res.status, 200);
    // The built console.html should reference ./assets/main-*.js (relative)
    Assert.isTrue(
      res.body.includes('./assets/main-') || res.body.includes('/assets/main-'),
      'console.html should reference bundled main JS asset'
    );
  });

  runner.test('Demo card links resolve (?demo= parameter)', async () => {
    // Verify console.html loads with demo param (server just serves the file)
    const res = await httpGet(port, '/console.html?demo=hello-world');
    Assert.equals(res.status, 200, 'console.html with ?demo= should return 200');
    Assert.isTrue(res.body.includes('NOVA-64'), 'Should serve console.html');
  });

  // Run all and clean up
  const results = await runner.runAll();

  if (testServer) {
    testServer.close();
  }

  return results;
}
