#!/usr/bin/env node
// package-lemon-release.mjs — the ONE command behind `pnpm release:lemon`.
//
// Builds everything and assembles a single, inviting, upload-ready bundle:
//
//   dist-lemon/unified_export_build/        ← the polished, organized folder
//     START-HERE.txt                        ← friendly welcome / what to do
//     README.txt                            ← detailed per-platform install
//     LICENSE  SHA256SUMS.txt
//     1-Run-Standalone/                     ← desktop apps: run, no build/install
//       Nova64-Windows.exe   Nova64-Linux.x86_64
//     2-RetroArch-Cores/                    ← libretro cores for RetroArch
//       nova64_libretro_*.{dll,so,dylib}
//     3-Godot-Source/                       ← dev bundle: GDExtension libs + project
//       libnova64.*   godot_project/
//   dist-lemon/nova64-<version>.zip         ← the single file you upload to LS
//
// Honor-system delivery (source is public) — no DRM, no webhook. Buyers pay for
// ready-to-run convenience.
//
// Recurring release flow:
//   1. pnpm release:lemon
//   2. Upload dist-lemon/nova64-<version>.zip to the Nova64 product in Lemon Squeezy.
//
// Flags:
//   --skip-build     Package existing artifacts only; run no compilers/exporters.
//   --all-cores      Fetch the full 8-platform core set from the latest GitHub
//                    Release (gh CLI) instead of only building host + Windows.
//   --no-godot       Skip the Godot GDExtension source bundle.
//   --no-cores       Skip the RetroArch cores.
//   --no-desktop     Skip the standalone desktop (.exe / Linux) export.
//   --runner=wsl|bash  Force the shell used for builds (default: auto, WSL-first).
//
// Every step is guarded: a missing toolchain warns and continues, so the command
// always produces a bundle from whatever is present. See docs/LEMONSQUEEZY_SELLING.md.

import { execFileSync, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const VERSION = pkg.version;

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const opt = (name) => { const h = args.find((a) => a.startsWith(`--${name}=`)); return h ? h.split('=')[1] : undefined; };
const SKIP_BUILD = has('--skip-build');
const ALL_CORES = has('--all-cores');
const DO_GODOT = !has('--no-godot');
const DO_CORES = !has('--no-cores');
const DO_DESKTOP = !has('--no-desktop');

const OUT_DIR = path.join(ROOT, 'dist-lemon');
const STAGE = path.join(OUT_DIR, 'unified_export_build');
const ZIP = path.join(OUT_DIR, `nova64-${VERSION}.zip`);

const DIR_DESKTOP = '1-Run-Standalone';
const DIR_CORES = '2-RetroArch-Cores';
const DIR_GODOT = '3-Godot-Source';

// ── logging ──────────────────────────────────────────────────────────────────
const c = { dim: '\x1b[2m', grn: '\x1b[32m', yel: '\x1b[33m', cyn: '\x1b[36m', rst: '\x1b[0m' };
const step = (m) => console.log(`\n${c.cyn}▶ ${m}${c.rst}`);
const ok = (m) => console.log(`${c.grn}✓${c.rst} ${m}`);
const warn = (m) => console.log(`${c.yel}!${c.rst} ${m}`);
const info = (m) => console.log(`${c.dim}  ${m}${c.rst}`);

// ── shell runner (WSL-first on Windows) ──────────────────────────────────────
function detectRunner() {
  const forced = opt('runner');
  const onWin = process.platform === 'win32';
  const canRun = (bin, probe) => { try { execFileSync(bin, probe, { stdio: 'ignore' }); return true; } catch { return false; } };
  if (forced === 'bash' || (!forced && !onWin)) return { kind: 'bash', pathMode: onWin ? 'gitbash' : 'native' };
  if (forced === 'wsl' || onWin) {
    if (canRun('wsl.exe', ['bash', '-lc', 'true'])) return { kind: 'wsl', pathMode: 'wsl' };
    if (!forced && canRun('bash', ['-lc', 'true'])) return { kind: 'bash', pathMode: 'gitbash' };
  }
  return { kind: 'bash', pathMode: onWin ? 'gitbash' : 'native' };
}
function toShellPath(p, mode) {
  if (mode === 'native') return p;
  const m = /^([A-Za-z]):[\\/](.*)$/.exec(p);
  if (!m) return p.replace(/\\/g, '/');
  const drive = m[1].toLowerCase();
  const rest = m[2].replace(/\\/g, '/');
  return mode === 'wsl' ? `/mnt/${drive}/${rest}` : `/${drive}/${rest}`;
}
const RUNNER = SKIP_BUILD ? null : detectRunner();
const REPO_SH = RUNNER ? toShellPath(ROOT, RUNNER.pathMode) : ROOT;

function sh(label, cmd) {
  step(label);
  const full = `set -e; cd '${REPO_SH}'; ${cmd}`;
  try {
    if (RUNNER.kind === 'wsl') execFileSync('wsl.exe', ['bash', '-lc', full], { stdio: 'inherit' });
    else execFileSync('bash', ['-lc', full], { stdio: 'inherit' });
    ok(`${label} — done`); return true;
  } catch { warn(`${label} — failed or toolchain missing; continuing.`); return false; }
}

// ── fs helpers ───────────────────────────────────────────────────────────────
const rmrf = (p) => fs.rmSync(p, { recursive: true, force: true });
const mkdirp = (p) => fs.mkdirSync(p, { recursive: true });
function copyIfExists(src, dest) { if (!fs.existsSync(src)) return false; mkdirp(path.dirname(dest)); fs.copyFileSync(src, dest); return true; }
function copyDir(src, dest, skip = () => false) { if (!fs.existsSync(src)) return false; fs.cpSync(src, dest, { recursive: true, filter: (s) => !skip(s) }); return true; }

// ── 1. standalone desktop apps (run without building) ────────────────────────
function exportAndCollectDesktop(destDir) {
  mkdirp(destDir);
  if (!SKIP_BUILD) sh('Export standalone desktop apps (Windows + Linux)', 'bash scripts/export-desktop.sh');
  const src = path.join(ROOT, 'nova64-godot', 'godot_project', 'bin', 'export', 'desktop');
  let n = 0;
  if (fs.existsSync(src)) {
    for (const f of fs.readdirSync(src)) {
      const st = fs.statSync(path.join(src, f));
      if (st.isFile()) { fs.copyFileSync(path.join(src, f), path.join(destDir, f)); if (/\.(exe|x86_64|app)$|Nova64/.test(f)) n++; info(`+ ${f}`); }
    }
  }
  // Note macOS is not shipped yet.
  fs.writeFileSync(path.join(destDir, 'macOS-coming-soon.txt'),
    'A signed macOS .app is on the roadmap. For now, macOS users can run the\nRetroArch core (../2-RetroArch-Cores) or open the Godot source (../3-Godot-Source).\n'.replace(/\n/g, os.EOL));
  return n;
}

// ── 2. RetroArch cores ───────────────────────────────────────────────────────
// Sort a core filename into a buyer-friendly subfolder.
function coreGroup(name) {
  if (/_android_/i.test(name)) return 'Android';
  if (/_ios_|_ipados_|_tvos_/i.test(name)) return 'Apple';
  return 'Desktop';
}
function organizeCores(coresDir) {
  let n = 0;
  for (const f of fs.readdirSync(coresDir)) {
    if (!/\.(so|dll|dylib)$/i.test(f)) continue;
    const grp = coreGroup(f);
    const dst = path.join(coresDir, grp, f);
    mkdirp(path.dirname(dst));
    fs.renameSync(path.join(coresDir, f), dst);
    n++; info(`+ ${grp}/${f}`);
  }
  return n;
}
function buildAndCollectCores(coresDir) {
  mkdirp(coresDir);
  if (ALL_CORES) {
    step('Fetching ALL-platform cores from latest GitHub Release (desktop + Android + Apple)');
    try {
      execSync(`gh release download --clobber -D "${coresDir}" -p "*.so" -p "*.dll" -p "*.dylib" -p "SHA256SUMS.txt"`, { cwd: ROOT, stdio: 'inherit' });
      const n = organizeCores(coresDir);
      ok(`Downloaded + organized ${n} core(s)`); return n;
    } catch { warn('gh release download failed (gh not logged in / no release yet?); falling back to local build.'); }
  }
  if (SKIP_BUILD) info('--skip-build: collecting any pre-built cores from retroarch/');
  else {
    sh('Build RetroArch core (host)', 'make -C retroarch clean all');
    sh('Build RetroArch core (Windows, mingw)', 'make -C retroarch platform=win-cross clean all');
  }
  const rc = path.join(ROOT, 'retroarch');
  for (const [built, asset] of [
    ['nova64_libretro.so', 'nova64_libretro_linux_x86_64.so'],
    ['nova64_libretro.dll', 'nova64_libretro_windows_x86_64.dll'],
    ['nova64_libretro.dylib', 'nova64_libretro_macos_universal.dylib'],
  ]) copyIfExists(path.join(rc, built), path.join(coresDir, asset));
  return organizeCores(coresDir);
}

// ── 3. Godot source bundle (GDExtension libs + runnable project) ─────────────
function buildAndCollectGodot(godotDir) {
  mkdirp(godotDir);
  if (!SKIP_BUILD) sh('Build Godot GDExtension (linux + windows)', 'cd nova64-godot && ./scripts/build-all.sh linux windows');
  const bin = path.join(ROOT, 'nova64-godot', 'godot_project', 'bin');
  let libs = 0;
  if (fs.existsSync(bin)) for (const f of fs.readdirSync(bin))
    if (/^libnova64\..*\.(dll|so|dylib)$/.test(f)) { fs.copyFileSync(path.join(bin, f), path.join(godotDir, f)); libs++; info(`+ ${f}`); }
  // Ship only git-TRACKED project files. This deliberately excludes the large,
  // gitignored third-party asset dirs (godot_project/assets, /data — course
  // material we must not redistribute) and keeps the bundle small + legal.
  const projRel = 'nova64-godot/godot_project';
  const projDst = path.join(godotDir, 'godot_project');
  let tracked = [];
  try {
    tracked = execFileSync('git', ['ls-files', projRel], { cwd: ROOT }).toString().split('\n').filter(Boolean);
  } catch { warn('git ls-files failed; copying project without asset-dir filtering.'); }
  if (tracked.length) {
    for (const rel of tracked) {
      const src = path.join(ROOT, rel);
      if (!fs.existsSync(src)) continue; // tracked-but-deleted
      const dst = path.join(projDst, path.relative(projRel, rel));
      mkdirp(path.dirname(dst));
      fs.copyFileSync(src, dst);
    }
  } else {
    // Fallback: manual filter (still excludes the heavy dirs).
    copyDir(path.join(ROOT, projRel), projDst, (s) => {
      const rel = path.relative(path.join(ROOT, projRel), s);
      const top = rel.split(path.sep)[0];
      return ['.godot', 'assets', 'data'].includes(top) ||
             rel === path.join('bin', 'export') || rel.startsWith(path.join('bin', 'export') + path.sep);
    });
  }
  // Make sure the freshly-built GDExtension libs are present so the project runs.
  if (fs.existsSync(bin)) {
    mkdirp(path.join(projDst, 'bin'));
    for (const f of fs.readdirSync(bin))
      if (/^libnova64\..*\.(dll|so|dylib)$/.test(f)) fs.copyFileSync(path.join(bin, f), path.join(projDst, 'bin', f));
  }
  return libs;
}

// ── manifests ────────────────────────────────────────────────────────────────
function writeStartHere(dest, { desktop, cores, godotLibs }) {
  const line = (cond, s) => (cond ? s : `${s}  (not included in this build)`);
  const body = `
   ███╗   ██╗ ██████╗ ██╗   ██╗ █████╗  ██████╗ ██╗  ██╗
   ████╗  ██║██╔═══██╗██║   ██║██╔══██╗██╔════╝ ██║  ██║
   ██╔██╗ ██║██║   ██║██║   ██║███████║███████╗ ███████║
   ██║╚██╗██║██║   ██║╚██╗ ██╔╝██╔══██║██╔═══██╗╚════██║
   ██║ ╚████║╚██████╔╝ ╚████╔╝ ██║  ██║╚██████╔╝     ██║
   ╚═╝  ╚═══╝ ╚═════╝   ╚═══╝  ╚═╝  ╚═╝ ╚═════╝      ╚═╝
                  F A N T A S Y   C O N S O L E   ·  v${VERSION}

  Welcome — and thank you for supporting Nova64! 💾
  Nova64 is open source (MIT). You paid for ready-to-run convenience, and
  that directly funds more of the machine. You're the reason this exists.

  ┌─────────────────────────────────────────────────────────────────┐
  │  PICK YOUR PATH                                                   │
  └─────────────────────────────────────────────────────────────────┘

  ${line(desktop > 0, '① JUST WANT TO PLAY?  →  open  1-Run-Standalone/')}
        Double-click Nova64-Windows.exe  (or run Nova64-Linux.x86_64).
        No install. No build. It just runs.

  ${line(cores > 0, '② USE RETROARCH?      →  open  2-RetroArch-Cores/')}
        Drop the core for your OS into RetroArch, load a .js cart. See README.txt.

  ${line(godotLibs > 0, '③ WANT TO TINKER?     →  open  3-Godot-Source/')}
        The GDExtension libs + full Godot project. Open in Godot 4.5, press Play.

  ─────────────────────────────────────────────────────────────────────
  Full instructions:  README.txt
  Verify downloads:   SHA256SUMS.txt   (sha256sum -c SHA256SUMS.txt)
  Questions / issues: https://github.com/seacloud9/nova64/issues

  Now go make something weird. ✦
`;
  fs.writeFileSync(dest, body.replace(/^\n/, '').replace(/\n/g, os.EOL));
}

function writeReadme(dest, { desktop, cores, godotLibs }) {
  const body = `Nova64 — v${VERSION}
=====================================================================
Open source (MIT): https://github.com/seacloud9/nova64
This bundle is prebuilt binaries for convenience. Start with START-HERE.txt.

WHAT'S INSIDE
-------------
1-Run-Standalone/   Standalone desktop apps (${desktop} file(s)) — run, no build.
2-RetroArch-Cores/  RetroArch libretro cores (${cores} file(s)).
3-Godot-Source/     Godot GDExtension libs (${godotLibs}) + runnable godot_project/.
SHA256SUMS.txt      Integrity checksums.  LICENSE  MIT.

① STANDALONE DESKTOP
--------------------
  Windows : run  Nova64-Windows.exe
  Linux   : chmod +x Nova64-Linux.x86_64 && ./Nova64-Linux.x86_64
  macOS   : coming soon — use the RetroArch core or Godot source for now.

② RETROARCH  (cores grouped in Desktop/ Android/ Apple/)
-------------------------------------------------------
Copy the core matching your device into RetroArch's "cores" folder.
  Desktop/
    Windows : nova64_libretro_windows_x86_64.dll   -> nova64_libretro.dll
    Linux   : nova64_libretro_linux_x86_64.so      -> nova64_libretro.so
              (+ aarch64 / armhf builds for Raspberry Pi & ARM SBCs)
    macOS   : nova64_libretro_macos_universal.dylib -> nova64_libretro.dylib
              (xattr -dr com.apple.quarantine nova64_libretro.dylib)
  Android/  arm64-v8a / armeabi-v7a / x86_64 — place under your RetroArch
            cores path, rename to nova64_libretro_android.so
  Apple/    iOS/iPadOS (ios_arm64) and Apple TV (tvos_arm64) .dylib cores
            for sideloaded RetroArch (AltStore/Xcode). iPhone & iPad share
            the ios_arm64 core.
In RetroArch: Load Core -> Nova64, then load a .js cart as content.

③ GODOT SOURCE
--------------
1. Install Godot 4.5+.
2. Import 3-Godot-Source/godot_project/ (select project.godot).
3. Godot auto-loads the matching libnova64.* GDExtension lib. Press Play.

Support: https://github.com/seacloud9/nova64/issues
`;
  fs.writeFileSync(dest, body.replace(/\n/g, os.EOL));
}

function writeChecksums(root, outFile) {
  const lines = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (full === outFile) continue;
      const hash = createHash('sha256').update(fs.readFileSync(full)).digest('hex');
      lines.push(`${hash}  ${path.relative(root, full).replace(/\\/g, '/')}`);
    }
  };
  walk(root);
  fs.writeFileSync(outFile, lines.join('\n') + '\n');
  return lines.length;
}

// ── zip (cross-environment) ──────────────────────────────────────────────────
function zipStage(stageDir, zipPath) {
  step('Creating zip');
  rmrf(zipPath);
  const tryCmd = (bin, argv) => { try { execFileSync(bin, argv, { stdio: 'inherit' }); return true; } catch { return false; } };
  if (process.platform === 'win32') {
    const ps = `Compress-Archive -Path '${stageDir}\\*' -DestinationPath '${zipPath}' -Force`;
    if (tryCmd('powershell.exe', ['-NoProfile', '-Command', ps])) { ok(`Wrote ${path.relative(ROOT, zipPath)}`); return zipPath; }
  } else {
    try { execFileSync('zip', ['--version'], { stdio: 'ignore' });
      if (tryCmd('bash', ['-lc', `cd '${toShellPath(stageDir, 'native')}' && zip -r -q '${zipPath}' .`])) { ok(`Wrote ${path.relative(ROOT, zipPath)}`); return zipPath; }
    } catch { /* no zip */ }
    try {
      const winStage = execFileSync('wslpath', ['-w', stageDir]).toString().trim();
      const winZip = execFileSync('wslpath', ['-w', zipPath]).toString().trim();
      const ps = `Compress-Archive -Path '${winStage}\\*' -DestinationPath '${winZip}' -Force`;
      if (tryCmd('powershell.exe', ['-NoProfile', '-Command', ps])) { ok(`Wrote ${path.relative(ROOT, zipPath)} (via PowerShell interop)`); return zipPath; }
    } catch { /* no interop */ }
    const tgz = zipPath.replace(/\.zip$/, '.tar.gz');
    if (tryCmd('tar', ['-czf', tgz, '-C', stageDir, '.'])) { warn(`No zip tool — wrote ${path.relative(ROOT, tgz)} instead.`); return tgz; }
  }
  warn('Could not create an archive automatically. Staging dir ready at: ' + stageDir);
  return null;
}

// ── main ─────────────────────────────────────────────────────────────────────
console.log(`${c.cyn}Nova64 → Lemon Squeezy unified export build${c.rst}  v${VERSION}`);
info(`runner: ${RUNNER ? RUNNER.kind : '(skip-build)'}   out: dist-lemon/unified_export_build → nova64-${VERSION}.zip`);

rmrf(STAGE); mkdirp(STAGE);

let desktop = 0, cores = 0, godotLibs = 0;
if (DO_DESKTOP) desktop = exportAndCollectDesktop(path.join(STAGE, DIR_DESKTOP)); else warn('--no-desktop: skipping standalone apps');
if (DO_CORES) cores = buildAndCollectCores(path.join(STAGE, DIR_CORES)); else warn('--no-cores: skipping RetroArch cores');
if (DO_GODOT) godotLibs = buildAndCollectGodot(path.join(STAGE, DIR_GODOT)); else warn('--no-godot: skipping Godot source');

copyIfExists(path.join(ROOT, 'LICENSE'), path.join(STAGE, 'LICENSE'));
writeStartHere(path.join(STAGE, 'START-HERE.txt'), { desktop, cores, godotLibs });
writeReadme(path.join(STAGE, 'README.txt'), { desktop, cores, godotLibs });
step('Writing SHA256SUMS.txt');
const n = writeChecksums(STAGE, path.join(STAGE, 'SHA256SUMS.txt'));
ok(`${n} file(s) checksummed`);

const archive = zipStage(STAGE, ZIP);

console.log(`\n${c.grn}━━━ Unified export build ready ━━━${c.rst}`);
console.log(`  Standalone apps : ${desktop}`);
console.log(`  RetroArch cores : ${cores}`);
console.log(`  Godot libs      : ${godotLibs}  (+ godot_project/)`);
console.log(`  Folder          : ${c.cyn}${path.relative(ROOT, STAGE)}${c.rst}`);
if (archive) console.log(`  Archive         : ${c.cyn}${path.relative(ROOT, archive)}${c.rst}`);
if (desktop === 0 && cores === 0 && godotLibs === 0) {
  warn('No binaries collected. Install toolchains (WSL: scons + mingw + make; Godot 4.5 + export templates),');
  warn('or use --all-cores to pull cores from the latest GitHub Release, or --skip-build to package existing files.');
  warn('See docs/LEMONSQUEEZY_SELLING.md.');
}
console.log(`\n${c.cyn}Next:${c.rst} upload ${archive ? path.relative(ROOT, archive) : 'the bundle'} to Lemon Squeezy`);
console.log(`${c.dim}  Lemon Squeezy → Products → Nova64 → replace the download file → Save.${c.rst}`);
