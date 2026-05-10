// scripts/audit-carts.mjs
// Static audit: does every nova64.GROUP.METHOD reference in carts resolve to an
// entry in NAMESPACE_MAP? Reports unknown groups and unmapped methods.

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(process.cwd());
const nsUrl = pathToFileURL(resolve(ROOT, 'runtime/namespace.js')).href;
const { NAMESPACE_MAP } = await import(nsUrl);

const groupOf = new Map();   // method -> group
for (const [g, names] of Object.entries(NAMESPACE_MAP)) {
  for (const n of names) groupOf.set(n, g);
}
const groups = new Set(Object.keys(NAMESPACE_MAP));

const exDir = resolve(ROOT, 'examples');
const carts = readdirSync(exDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => resolve(exDir, d.name, 'code.js'));

const REF_RE = /\bnova64\.([a-zA-Z_][a-zA-Z0-9_]*)(?:\.([a-zA-Z_][a-zA-Z0-9_]*))?/g;

let fail = 0;
const summary = [];
for (const file of carts) {
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { continue; }
  const issues = [];
  let m;
  while ((m = REF_RE.exec(src))) {
    const [, a, b] = m;
    if (!groups.has(a)) {
      issues.push(`unknown group  nova64.${a}${b ? '.' + b : ''}`);
      continue;
    }
    if (b && !NAMESPACE_MAP[a].includes(b)) {
      issues.push(`unmapped       nova64.${a}.${b}`);
    }
  }
  // Dedup
  const uniq = [...new Set(issues)];
  if (uniq.length) {
    fail++;
    summary.push({ file, issues: uniq });
  }
}

if (!summary.length) {
  console.log('OK — every nova64.* reference in', carts.length, 'carts resolves.');
  process.exit(0);
}

for (const { file, issues } of summary) {
  console.log('—', file.replace(ROOT + '\\', '').replace(ROOT + '/', ''));
  for (const i of issues) console.log('   ', i);
}
console.log('\nFAIL:', fail, 'of', carts.length, 'carts');
process.exit(1);
