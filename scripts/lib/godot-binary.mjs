// Locating the Godot binary, in one place.
//
// Two tools need this — scripts/visual-check.mjs and
// nova64-godot/scripts/visual-parity.js — and when each kept its own copy they
// drifted: visual-parity's list only knew the 4.4.1 install paths, so on a
// machine with Godot 4.5 it silently fell through to a bare `godot` that does
// not exist and the whole run failed. Keep the search order here.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';

// Windows installs, newest first — godot_project/project.godot declares
// config/features "4.5", so prefer a 4.5 install when several are present.
const WINDOWS_CANDIDATES = [
  'C:\\Program Files\\godot45\\Godot_v4.5-stable_win64_console.exe',
  'C:\\Program Files\\godot45\\Godot_v4.5-stable_win64.exe',
  'C:\\Program Files\\Godot\\Godot_v4.5-stable_win64_console.exe',
  'C:\\Program Files\\Godot\\Godot_v4.5-stable_win64.exe',
  'C:\\Program Files\\Godot_v4.4.1-stable_win64.exe\\Godot_v4.4.1-stable_win64_console.exe',
  'C:\\Program Files\\Godot_v4.4.1-stable_win64.exe\\Godot_v4.4.1-stable_win64.exe',
  'C:\\Program Files\\Godot\\Godot_v4.4.1-stable_win64_console.exe',
  'C:\\Program Files\\Godot\\Godot_v4.4.1-stable_win64.exe',
];

export function isWsl() {
  if (process.platform !== 'linux') return false;
  try {
    return /microsoft/i.test(fs.readFileSync('/proc/version', 'utf8'));
  } catch {
    return false;
  }
}

export function existsExecutable(p) {
  try {
    fs.accessSync(p, fs.constants.X_OK);
    return true;
  } catch {
    try {
      fs.accessSync(p, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

// C:\foo\bar.exe -> /mnt/c/foo/bar.exe
const toWslPath = winPath =>
  '/mnt/' + winPath[0].toLowerCase() + winPath.slice(2).replace(/\\/g, '/');

/**
 * Resolve a Godot 4.x executable.
 *
 * Order: an explicit path (or $GODOT) → a known install → whatever is on PATH.
 * Known installs beat PATH because a `godot` on PATH is frequently an older
 * build than the one this project targets; pass --godot= or set GODOT to
 * override that deliberately.
 *
 * @param {string} [explicit] path from --godot= or $GODOT
 * @returns {string} a path to try, or '' when nothing was found
 */
export function resolveGodotBinary(explicit) {
  if (explicit) return explicit;
  if (process.env.GODOT) return process.env.GODOT;

  if (process.platform === 'win32') {
    for (const c of WINDOWS_CANDIDATES) if (existsExecutable(c)) return c;
  } else if (isWsl()) {
    for (const c of WINDOWS_CANDIDATES) {
      const p = toWslPath(c);
      if (existsExecutable(p)) return p;
    }
  }

  for (const name of ['godot4', 'godot']) {
    const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], {
      encoding: 'utf8',
    });
    if (which.status === 0) {
      const first = (which.stdout || '').split(/\r?\n/).find(Boolean);
      if (first) return first.trim();
    }
  }
  return '';
}

/** A Windows .exe being driven from inside WSL needs Windows-shaped arguments. */
export function isWindowsExecutableFromWsl(exePath) {
  return process.platform === 'linux' && String(exePath).toLowerCase().endsWith('.exe');
}

/** Convert a path for consumption by `godotBin`, if that binary needs it. */
export function toGodotHostPath(filePath, godotBin) {
  if (!isWindowsExecutableFromWsl(godotBin)) return filePath;
  const result = spawnSync('wslpath', ['-w', filePath], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`wslpath failed for ${filePath}:\n${result.stderr}`);
  }
  return result.stdout.trim();
}

/** Run `--version` so a bad path fails with a useful message, not a stack. */
export function checkGodot(godotBin) {
  if (!godotBin) {
    throw new Error(
      'No Godot executable found.\n' +
        'Set GODOT=/path/to/Godot_4.4+ or pass --godot=/path/to/godot.\n' +
        `Looked for:\n  ${WINDOWS_CANDIDATES.join('\n  ')}\nand for godot4/godot on PATH.`
    );
  }
  const result = spawnSync(godotBin, ['--version'], { encoding: 'utf8' });
  if (result.error?.code === 'ENOENT') {
    throw new Error(
      `Godot executable not found: ${godotBin}\n` +
        'Set GODOT=/path/to/Godot_4.4+ or pass --godot=/path/to/godot.'
    );
  }
  if (result.status !== 0) {
    throw new Error(`Godot probe failed:\n${result.stdout}\n${result.stderr}`);
  }
  return (result.stdout || result.stderr || '').trim();
}
