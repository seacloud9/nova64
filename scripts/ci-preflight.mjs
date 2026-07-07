#!/usr/bin/env node
// ci-preflight.mjs — run the gates GitHub CI runs, locally, BEFORE you push.
//
// Mirrors the BLOCKING steps of .github/workflows/ci.yml and publish.yml so a
// green run here means those workflows go green. Wired as `pnpm ci:check` and as
// the git pre-push hook (.husky/pre-push). CI fires on push (and tags), so this
// is a pre-PUSH gate — committing locally never triggers CI.
//
// Blocking (fails the preflight, exactly what fails CI):
//   • pnpm install --frozen-lockfile   lockfile in sync (a top CI failure)
//   • pnpm test                        ci.yml + publish.yml blocking test
//   • pnpm build                       ci.yml + publish.yml blocking build
// Reported but NON-blocking (warn-only in ci.yml via continue-on-error):
//   • pnpm lint
//   • pnpm format:check
// Optional:
//   --release/--publish/--full  also validate the npm publish path (publish.yml):
//                      lint becomes BLOCKING (npm runs prepublishOnly = lint &&
//                      test:all && build), runs test:all, checks the version isn't
//                      already on npm, and `npm publish --dry-run`. Use before
//                      tagging a v*.*.* release.
//   --cores            also build the host RetroArch core + conformance smoke
//                      (mirrors release-cores.yml's linux-x86_64 job). Needs make/gcc.
//   --full-tests       run `pnpm test:all` instead of `pnpm test` (heavier).
//   --skip-build       skip `pnpm build` (fast lint/test-only check).
//
// CANNOT be verified locally — reported explicitly, never silently "passed":
//   release-cores.yml macOS universal + iOS + tvOS jobs need a Mac + Xcode; they
//   only run green on GitHub's macos-latest runner. Android/RPi are reproducible
//   locally with docker/NDK but are not run here.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
// --release / --publish / --full: also validate the npm publish path (publish.yml
// + release-cores.yml), i.e. what a `v*.*.*` tag triggers. Here lint is BLOCKING
// (npm runs prepublishOnly = lint && test:all && build) and we add npm checks.
const RELEASE = has('--release') || has('--publish') || has('--full');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const c = { dim: '\x1b[2m', red: '\x1b[31m', grn: '\x1b[32m', yel: '\x1b[33m', cyn: '\x1b[36m', rst: '\x1b[0m' };
const hr = () => console.log(c.dim + '─'.repeat(68) + c.rst);

const results = [];
// Run a step. blocking=true → a failure fails the whole preflight.
function run(label, cmd, { blocking = true } = {}) {
  process.stdout.write(`\n${c.cyn}▶ ${label}${c.rst}\n${c.dim}  $ ${cmd}${c.rst}\n`);
  const r = spawnSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true });
  const ok = r.status === 0;
  results.push({ label, ok, blocking });
  console.log(ok ? `${c.grn}✓ ${label}${c.rst}` : `${(blocking ? c.red : c.yel)}${ok ? '✓' : (blocking ? '✗' : '!')} ${label}${c.rst}`);
  return ok;
}

console.log(`${c.cyn}Nova64 CI preflight${c.rst}  ${c.dim}(mirrors ci.yml + publish.yml blocking gates)${c.rst}`);

// 1. Lockfile in sync — CI uses --frozen-lockfile and fails if package.json drifted.
run('Dependencies in sync (pnpm install --frozen-lockfile)', 'pnpm install --frozen-lockfile');

// 2. Lint + format. Warn-only in ci.yml (continue-on-error) — but npm publish
//    runs prepublishOnly (lint && …), so lint is BLOCKING in --release mode.
run(`Lint (pnpm lint)${RELEASE ? ' [blocking for npm publish]' : ''}`, 'pnpm run lint', { blocking: RELEASE });
run('Format check (pnpm format:check)', 'pnpm run format:check', { blocking: false });

// 3. Tests — BLOCKING. --release / --full-tests use test:all (prepublishOnly does).
const fullTests = RELEASE || has('--full-tests');
run(fullTests ? 'Tests (pnpm test:all)' : 'Tests (pnpm test)', fullTests ? 'pnpm run test:all' : 'pnpm test');

// 4. Build — BLOCKING in CI.
if (!has('--skip-build')) run('Build (pnpm build)', 'pnpm run build');
else console.log(`${c.yel}! skipped build (--skip-build)${c.rst}`);

// 4b. npm publish compatibility (publish.yml). Validates the tarball + version.
if (RELEASE) {
  // A version already on npm cannot be re-published — publish.yml would fail.
  const probe = spawnSync(`npm view ${pkg.name}@${pkg.version} version`, { cwd: ROOT, shell: true, encoding: 'utf8' });
  const already = (probe.stdout || '').trim() === pkg.version;
  results.push({ label: `npm version ${pkg.name}@${pkg.version} is unpublished`, ok: !already, blocking: true });
  console.log(already
    ? `${c.red}✗ ${pkg.name}@${pkg.version} is ALREADY on npm — bump the version before tagging (npm publish would fail).${c.rst}`
    : `${c.grn}✓ ${pkg.name}@${pkg.version} not yet on npm (publishable)${c.rst}`);
  // Dry-run pack: validates files/.npmignore/package.json without uploading.
  run('npm publish --dry-run (packaging valid)', 'npm publish --dry-run --ignore-scripts');
}

// 5. RetroArch host core + smoke (mirrors release-cores.yml linux-x86_64). Run
//    on --cores or --release: the core is one C file, so compiling it on the host
//    is a strong signal it compiles on every platform — catch C errors before
//    burning the expensive CI core matrix. (macOS/iOS/tvOS still GitHub-only.)
if (has('--cores') || RELEASE) {
  if (run('Build RetroArch core (make -C retroarch clean all)', 'make -C retroarch clean all')) {
    run('Core harness + smoke', 'make -C retroarch harness && for cart in retroarch/conformance/00-boot.js retroarch/conformance/01-framebuffer.js retroarch/conformance/110-storage-compressed.js; do retroarch/build/harness retroarch/nova64_libretro.so "$cart" --frames 3 | grep -q "ok=1" || exit 1; done');
  }
}

// ── report ───────────────────────────────────────────────────────────────────
hr();
const blockingFails = results.filter((r) => r.blocking && !r.ok);
const warnFails = results.filter((r) => !r.blocking && !r.ok);
for (const r of results) console.log(`  ${r.ok ? c.grn + '✓' : (r.blocking ? c.red + '✗' : c.yel + '!')}${c.rst} ${r.label}`);
hr();
console.log(`${c.dim}Not run here (GitHub-only): release-cores.yml macOS universal + iOS + tvOS jobs`);
console.log(`  need a Mac + Xcode — they can only go green on GitHub's macos-latest runner.`);
console.log(`  Android/RPi cores are reproducible locally with docker/NDK but aren't run here.${c.rst}`);
hr();

if (blockingFails.length) {
  console.log(`${c.red}✗ CI preflight FAILED — these would fail CI:${c.rst}`);
  for (const r of blockingFails) console.log(`   • ${r.label}`);
  console.log(`${c.dim}Fix and re-run \`pnpm ci:check\`. To push anyway: git push --no-verify (not recommended).${c.rst}`);
  process.exit(1);
}
if (warnFails.length) console.log(`${c.yel}! ${warnFails.length} warn-only check(s) failed (lint/format) — CI won't block on these, but worth fixing.${c.rst}`);
console.log(`${c.grn}✓ CI preflight passed — ci.yml + publish.yml blocking gates are green locally.${c.rst}`);
console.log(`${c.dim}  Reminder: after pushing a v*.*.* tag, verify the Apple core jobs on GitHub Actions.${c.rst}`);
