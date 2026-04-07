#!/usr/bin/env node

import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { resolve, join, extname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.glb': 'model/gltf-binary',
  '.gltf': 'application/json',
  '.wasm': 'application/wasm',
  '.map': 'application/json',
};

function parseArgs(args) {
  const opts = { port: 3000, open: true, help: false, startDemo: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--start-demo') opts.startDemo = true;
    else if (arg === '--no-open') opts.open = false;
    else if (arg === '--port' || arg === '-p') {
      const port = parseInt(args[++i], 10);
      if (Number.isFinite(port) && port > 0 && port < 65536) opts.port = port;
    }
  }
  return opts;
}

function openBrowser(url) {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} "${url}"`);
}

function printHelp() {
  console.log(`
  \x1b[1m\x1b[35m🎮 Nova64\x1b[0m — Ultimate 3D Fantasy Console

  \x1b[1mUsage:\x1b[0m
    nova64 --start-demo          Launch the console with demos
    nova64 --start-demo -p 8080  Use a custom port

  \x1b[1mOptions:\x1b[0m
    --start-demo     Start local server and open the console
    -p, --port NUM   Port to listen on (default: 3000)
    --no-open        Don't auto-open the browser
    -h, --help       Show this help message
`);
}

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

async function startServer(opts) {
  const server = createServer(async (req, res) => {
    // Sanitize URL path to prevent directory traversal
    const url = new URL(req.url, `http://localhost:${opts.port}`);
    const pathname = decodeURIComponent(url.pathname);
    const safePath = resolve(distDir, '.' + pathname);

    // Ensure resolved path is within distDir
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

  server.listen(opts.port, () => {
    const homeUrl = `http://localhost:${opts.port}/`;
    console.log(`
  \x1b[1m\x1b[35m🎮 Nova64\x1b[0m Fantasy Console

  \x1b[32m➜\x1b[0m  Home:     \x1b[36m${homeUrl}\x1b[0m
  \x1b[32m➜\x1b[0m  Console:  \x1b[36mhttp://localhost:${opts.port}/console.html\x1b[0m
  \x1b[32m➜\x1b[0m  NovaOS:   \x1b[36mhttp://localhost:${opts.port}/os9-shell/\x1b[0m

  Press \x1b[1mCtrl+C\x1b[0m to stop
`);

    if (opts.open) {
      openBrowser(homeUrl);
    }
  });

  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\x1b[31mError: Port ${opts.port} is already in use.\x1b[0m`);
      console.error(`Try: nova64 --start-demo --port ${opts.port + 1}`);
      process.exit(1);
    }
    throw err;
  });
}

// Main
const opts = parseArgs(process.argv.slice(2));

if (opts.help) {
  printHelp();
  process.exit(0);
}

if (opts.startDemo) {
  // Verify dist/ exists
  try {
    await stat(distDir);
  } catch {
    console.error('\x1b[31mError: dist/ directory not found.\x1b[0m');
    console.error('Run `pnpm build` first, or reinstall the package.');
    process.exit(1);
  }
  startServer(opts);
} else {
  printHelp();
}
