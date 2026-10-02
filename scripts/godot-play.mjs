#!/usr/bin/env node
// Link a Nova64 example cart into the Godot project's carts/ and launch it in
// Godot 4.5. Carts are exposed to the Godot host as `res://carts/<name>`, which
// are Windows *junctions* into examples/ (symlinks aren't followed by the
// Windows Godot, which is why `ln -s` doesn't work).
//
//   pnpm godot <cart>                  link (if needed) + play
//   pnpm godot <cart> ws://host:2567   ...with a multiplayer/net URL
//   pnpm godot <cart> --link           just create the carts/<cart> junction
//
// Works whether invoked from Windows node or from WSL (it creates a Windows
// junction via cmd.exe and launches the Windows Godot binary either way).

import { existsSync, readFileSync, symlinkSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import path from 'node:path';

const repo = process.cwd();
const argv = process.argv.slice(2);
const cart = argv.find((a) => !a.startsWith('--') && !a.startsWith('ws'));
const net = argv.find((a) => a.startsWith('ws'));
const linkOnly = argv.includes('--link');

if (!cart) {
  console.error('Usage: pnpm godot <cart-name> [ws://host:2567] [--link]');
  process.exit(1);
}

const cartSrc = path.join(repo, 'examples', cart);
if (!existsSync(path.join(cartSrc, 'code.js'))) {
  console.error(`✗ No cart at examples/${cart}/code.js`);
  process.exit(1);
}

const project = path.join(repo, 'nova64-godot', 'godot_project');
const link = path.join(project, 'carts', cart);

// /mnt/c/... (WSL) -> C:\... for Windows tools/args.
const toWin = (p) =>
  p.startsWith('/mnt/')
    ? p.replace(/^\/mnt\/([a-z])\//, (_, d) => `${d.toUpperCase()}:\\`).replace(/\//g, '\\')
    : p;

// Only WSL needs the cmd.exe detour: there the Godot that opens the project is a
// *Windows* binary, which does not follow Linux symlinks. On macOS and native
// Linux the engine is native and an ordinary symlink is both enough and the only
// thing available — `cmd.exe` does not exist there, so assuming "not win32 means
// WSL" made `pnpm godot <cart>` fail outright on those platforms.
const isWsl =
  process.platform === 'linux' &&
  (!!process.env.WSL_DISTRO_NAME ||
    (() => {
      try {
        return /microsoft/i.test(readFileSync('/proc/version', 'utf8'));
      } catch {
        return false;
      }
    })());

if (!existsSync(link)) {
  if (process.platform === 'win32') {
    symlinkSync(cartSrc, link, 'junction');
  } else if (isWsl) {
    // Make a *Windows* junction so the Windows Godot can follow it.
    execSync(`cmd.exe /c mklink /J "${toWin(link)}" "${toWin(cartSrc)}"`, { stdio: 'inherit' });
  } else {
    symlinkSync(cartSrc, link);
  }
  console.log(`✓ linked carts/${cart} → examples/${cart}`);
} else {
  console.log(`• carts/${cart} already linked`);
}

if (linkOnly) process.exit(0);

const godotExes = [
  'C:\\Program Files\\godot45\\Godot_v4.5-stable_win64_console.exe',
  '/mnt/c/Program Files/godot45/Godot_v4.5-stable_win64_console.exe',
  'C:\\Program Files\\godot45\\Godot_v4.5-stable_win64.exe',
  '/mnt/c/Program Files/godot45/Godot_v4.5-stable_win64.exe',
];
const godot = godotExes.find((p) => existsSync(p));
if (!godot) {
  console.error('✗ Godot 4.5 not found under C:\\Program Files\\godot45\\');
  process.exit(1);
}

const userArgs = net ? [net, cart] : [cart];
const args = ['--path', toWin(project), '--', ...userArgs];
console.log(`▶ launching ${path.basename(godot)} -- ${userArgs.join(' ')}`);
const child = spawn(godot, args, { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
