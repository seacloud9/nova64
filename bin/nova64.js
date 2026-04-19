#!/usr/bin/env node

import { preview } from 'vite';
import { stat } from 'fs/promises';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dirname, '..');
const distDir = resolve(root, 'dist');

function parseFlags(args) {
  const opts = { port: 3000, open: true };
  const remaining = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--no-open') opts.open = false;
    else if (arg === '--port' || arg === '-p') {
      const port = parseInt(args[++i], 10);
      if (Number.isFinite(port) && port > 0 && port < 65536) opts.port = port;
    } else {
      remaining.push(arg);
    }
  }
  return { opts, remaining };
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
    nova64 init [name]           Create a new Nova64 project
    nova64 template [name]       Create a project from an example template
    nova64 dev                   Start dev server for current project
    nova64 --start-demo          Launch the console with demos

  \x1b[1mCommands:\x1b[0m
    init [name]      Scaffold a new project (prompts for name if omitted)
    template [name]  Pick from 60+ example games/demos to use as a starter
    dev              Start a Vite dev server for the current project

  \x1b[1mOptions:\x1b[0m
    --start-demo     Start local server and open the full console
    -p, --port NUM   Port to listen on (default: 3000)
    --no-open        Don't auto-open the browser
    -h, --help       Show this help message

  \x1b[1mExamples:\x1b[0m
    nova64 init my-game          Create project in ./my-game/
    nova64 template              Browse and pick a template interactively
    nova64 template star-fox-nova-3d   Clone the Star Fox demo
    cd my-game && nova64 dev     Start developing your game
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
const args = process.argv.slice(2);
const { opts, remaining } = parseFlags(args);
const command = remaining[0];
const commandArg = remaining[1];

// Handle help
if (command === 'help' || args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

// Handle subcommands
if (command === 'init') {
  const { initCommand } = await import('./commands/init.js');
  await initCommand(commandArg);
} else if (command === 'template') {
  const { templateCommand } = await import('./commands/template.js');
  await templateCommand(commandArg);
} else if (command === 'dev') {
  const { devCommand } = await import('./commands/dev.js');
  await devCommand(opts);
} else if (args.includes('--start-demo')) {
  // Legacy flag — keep for backward compatibility
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
