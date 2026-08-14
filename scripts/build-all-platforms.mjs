#!/usr/bin/env node
// build-all-platforms.mjs — the ONE local command behind `pnpm build:all`.
//
// Builds every platform binary (standalone desktop apps + RetroArch libretro
// cores + Godot GDExtension source bundle) by delegating to the proven Lemon
// Squeezy packager, then stages the finished, upload-ready bundle into:
//
//   nova-release/                         ← gitignored parent (all builds live here)
//     nova-release-<tag>/                 ← one folder per build (the tag goes here)
//       nova64-<version>.zip              ← the single file you upload to Lemon Squeezy
//       unified_export_build/             ← the unzipped, organized bundle
//         1-Run-Standalone/  2-RetroArch-Cores/  3-Godot-Source/  START-HERE.txt ...
//
// <tag> defaults to v<package.json version>. Override with --tag=<anything>
// (e.g. --tag=v0.5.3-rc1 or --tag=nightly-20260814). Re-running with the same
// tag overwrites that folder so you always have one clean bundle per tag.
//
// All other flags are passed straight through to package-lemon-release.mjs, so
// the usual controls still work:
//   pnpm build:all                 build desktop+Windows cores locally, pull the
//                                  rest (Android/RPi/Apple) from the GitHub Release
//   pnpm build:all --all-cores     pull EVERY platform core from the release
//   pnpm build:all --skip-build    package existing artifacts only (no compilers)
//   pnpm build:all --no-fetch      use locally built cores only (no network)
//   pnpm build:all --tag=nightly   stage under nova-release/nova-release-nightly/

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const VERSION = pkg.version;

const c = { dim: '\x1b[2m', grn: '\x1b[32m', yel: '\x1b[33m', cyn: '\x1b[36m', rst: '\x1b[0m' };
const step = (m) => console.log(`\n${c.cyn}▶ ${m}${c.rst}`);
const ok = (m) => console.log(`${c.grn}✓${c.rst} ${m}`);
const warn = (m) => console.log(`${c.yel}!${c.rst} ${m}`);

// Split our own --tag flag out; everything else flows to the packager untouched.
const allArgs = process.argv.slice(2);
const tagArg = allArgs.find((a) => a.startsWith('--tag='));
const TAG = (tagArg ? tagArg.split('=')[1] : `v${VERSION}`).trim();
const passthrough = allArgs.filter((a) => a !== tagArg);

const RELEASE_ROOT = path.join(ROOT, 'nova-release');
const TAG_DIR = path.join(RELEASE_ROOT, `nova-release-${TAG}`);
const STAGE_SRC = path.join(ROOT, 'dist-lemon', 'unified_export_build');

console.log(`${c.cyn}Nova64 → all-platform local build${c.rst}  v${VERSION}  (tag: ${TAG})`);

// 1. Build + package everything via the existing, guarded packager.
step('Building all platforms (desktop + RetroArch cores + Godot)');
const res = spawnSync(process.execPath, [path.join(__dirname, 'package-lemon-release.mjs'), ...passthrough], {
  stdio: 'inherit',
  cwd: ROOT,
});
if (res.status !== 0) {
  warn('Packager exited non-zero — staging whatever was produced anyway.');
}

// 2. Stage the finished bundle into nova-release/nova-release-<tag>/.
step(`Staging bundle → nova-release/nova-release-${TAG}/`);
if (!fs.existsSync(STAGE_SRC)) {
  console.error(`${c.yel}!${c.rst} No build output found at ${path.relative(ROOT, STAGE_SRC)}. Nothing to stage.`);
  process.exit(res.status || 1);
}
fs.rmSync(TAG_DIR, { recursive: true, force: true });
fs.mkdirSync(TAG_DIR, { recursive: true });

// Copy the unzipped, organized bundle.
fs.cpSync(STAGE_SRC, path.join(TAG_DIR, 'unified_export_build'), { recursive: true });
ok('unified_export_build/');

// Copy the uploadable archive (zip, or tar.gz fallback on hosts without zip).
let archiveName = null;
for (const ext of ['.zip', '.tar.gz']) {
  const src = path.join(ROOT, 'dist-lemon', `nova64-${VERSION}${ext}`);
  if (fs.existsSync(src)) {
    archiveName = `nova64-${VERSION}${ext}`;
    fs.copyFileSync(src, path.join(TAG_DIR, archiveName));
    ok(archiveName);
    break;
  }
}
if (!archiveName) warn('No archive found in dist-lemon/ — bundle staged as folder only.');

console.log(`\n${c.grn}━━━ All-platform build staged ━━━${c.rst}`);
console.log(`  Location : ${c.cyn}nova-release/nova-release-${TAG}/${c.rst}`);
if (archiveName) {
  console.log(`  Upload   : ${c.cyn}nova-release/nova-release-${TAG}/${archiveName}${c.rst}`);
  console.log(`${c.dim}  Lemon Squeezy → Products → Nova64 → replace the download file → Save.${c.rst}`);
}
