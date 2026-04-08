#!/usr/bin/env node

import { preview } from 'vite';
import { stat } from 'fs/promises';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dirname, '..');
const distDir = resolve(root, 'dist');

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

async function startServer(opts) {
  const server = await preview({
    root,
    preview: {
      port: opts.port,
      strictPort: true,
      host: true,
      open: false,
    },
  });

  const port = opts.port;
  console.log(`
  \x1b[1m\x1b[35m🎮 Nova64\x1b[0m Fantasy Console

  \x1b[32m➜\x1b[0m  Home:     \x1b[36mhttp://localhost:${port}/\x1b[0m
  \x1b[32m➜\x1b[0m  Console:  \x1b[36mhttp://localhost:${port}/console.html\x1b[0m
  \x1b[32m➜\x1b[0m  NovaOS:   \x1b[36mhttp://localhost:${port}/os9-shell/index.html\x1b[0m

  Press \x1b[1mCtrl+C\x1b[0m to stop
`);

  if (opts.open) {
    openBrowser(`http://localhost:${port}/`);
  }
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
