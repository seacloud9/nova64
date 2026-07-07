#!/usr/bin/env node
// release.mjs — one-shot release cutter.  Validate → bump → commit → tag.
// YOU push (this never pushes). Checks run at THREE layers, most-safe first:
//   1. here, locally, before anything is committed (full ci-preflight --release)
//   2. on the push        → the pre-push hook re-runs the checks (belt & braces)
//   3. on CI              → the v*.*.* tag builds every platform core, and npm
//                           publish runs only after all of them are green.
//
//   pnpm release            # patch bump (0.5.2 → 0.5.3)
//   pnpm release minor      # 0.5.2 → 0.6.0
//   pnpm release major      # 0.5.2 → 1.0.0
//   pnpm release --dry-run  # show what it would do; no validation, no commit/tag
//
// If local validation fails, the version bump is reverted and nothing is
// committed or tagged — so a red release never leaves junk behind.

import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PKG = path.join(ROOT, 'package.json');
const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const kind = argv.find((a) => ['patch', 'minor', 'major'].includes(a)) || 'patch';

const c = { dim: '\x1b[2m', red: '\x1b[31m', grn: '\x1b[32m', yel: '\x1b[33m', cyn: '\x1b[36m', rst: '\x1b[0m' };
const die = (m) => { console.error(`${c.red}✗ ${m}${c.rst}`); process.exit(1); };
const out = (cmd) => { try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };

const meta = JSON.parse(fs.readFileSync(PKG, 'utf8'));
const writeVersion = (v) => fs.writeFileSync(PKG, fs.readFileSync(PKG, 'utf8').replace(/("version":\s*")[^"]+(")/, `$1${v}$2`));
const bump = (v, k) => { const [a, b, d] = v.split('.').map(Number); return k === 'major' ? `${a + 1}.0.0` : k === 'minor' ? `${a}.${b + 1}.0` : `${a}.${b}.${d + 1}`; };
const onNpm = (v) => out(`npm view ${meta.name}@${v} version`) === v;

console.log(`${c.cyn}Nova64 release${c.rst}  ${c.dim}(${kind} bump${DRY ? ', dry-run' : ''})${c.rst}`);

// Guard 1: the release commit must contain ONLY the version bump. We only ever
// `git add package.json`, so unrelated *unstaged* changes (dist/, examples/, …)
// are fine and stay out of the commit. But refuse if package.json is already
// dirty (we must own it) or if anything else is already staged (would be swept in).
if (!DRY) {
  const staged = out('git diff --cached --name-only');
  if (staged) die(`You have staged changes — unstage or commit them first (the release commit must be only the version bump):\n${staged}`);
  if (out('git status --porcelain -- package.json')) die('package.json has uncommitted changes — commit or discard them first.');
  const otherDirty = out('git status --porcelain').split('\n').filter(Boolean).length;
  if (otherDirty) console.log(`${c.yel}! Note: ${otherDirty} other file(s) are modified in your working tree; they will NOT be included in the release commit.${c.rst}`);
}

// Compute next version; skip anything already on npm; refuse an existing tag.
const current = meta.version;
let next = bump(current, kind);
while (onNpm(next)) { console.log(`${c.yel}! ${meta.name}@${next} already on npm — bumping again${c.rst}`); next = bump(next, 'patch'); }
if (out(`git tag -l v${next}`)) die(`Tag v${next} already exists locally. Delete it (git tag -d v${next}) or pick another bump.`);
console.log(`${c.dim}  ${current} → ${c.rst}${c.cyn}${next}${c.rst}`);

if (DRY) {
  console.log(`${c.dim}dry-run: would validate, then commit "chore(release): v${next}" + tag v${next}. No changes made.${c.rst}`);
  process.exit(0);
}

// 1. Apply the bump so the preflight validates the ACTUAL release version
//    (incl. the "v${next} not already on npm" check), then run full validation.
writeVersion(next);
console.log(`\n${c.cyn}▶ Validating the full release locally (pnpm ci:check --release)…${c.rst}`);
if (spawnSync('node', ['scripts/ci-preflight.mjs', '--release'], { cwd: ROOT, stdio: 'inherit' }).status !== 0) {
  execSync('git checkout -- package.json', { cwd: ROOT });
  die('Local release validation failed — reverted the version bump. Fix the above and re-run `pnpm release`.');
}

// 2. Commit + tag (still no push).
execSync('git add package.json', { cwd: ROOT });
if (spawnSync('git', ['commit', '-m', `chore(release): v${next}`], { cwd: ROOT, stdio: 'inherit' }).status !== 0) {
  execSync('git checkout -- package.json', { cwd: ROOT });
  die('Commit failed — reverted the version bump.');
}
execSync(`git tag v${next}`, { cwd: ROOT });

console.log(`\n${c.grn}✓ v${next} validated locally, committed, and tagged.${c.rst}`);
console.log(`\n${c.cyn}Push — the pre-push hook re-runs the checks, then CI builds + publishes:${c.rst}`);
console.log(`  git push && git push --tags        ${c.dim}# or: git push --follow-tags${c.rst}`);
