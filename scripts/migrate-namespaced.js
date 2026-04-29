#!/usr/bin/env node
/**
 * Migrate Nova64 examples from flat globals to nova64.* namespaced API.
 *
 * Usage: node scripts/migrate-namespaced.js [--dry-run] [example-name]
 *
 * Reads each example's code.js, detects which flat globals are used,
 * and prepends `const { ... } = nova64.<group>;` destructuring lines.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Import the namespace map
const { NAMESPACE_MAP } = await import(join(ROOT, 'runtime', 'namespace.js'));

// Build reverse map: function name → namespace group
const REVERSE_MAP = {};
for (const [group, fns] of Object.entries(NAMESPACE_MAP)) {
  for (const fn of fns) {
    REVERSE_MAP[fn] = group;
  }
}

// All known global names (for scanning)
const ALL_GLOBALS = new Set(Object.keys(REVERSE_MAP));

const DRY_RUN = process.argv.includes('--dry-run');
const SPECIFIC = process.argv.find(
  a => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1]
);

const examplesDir = join(ROOT, 'examples');
const dirs = SPECIFIC ? [SPECIFIC] : readdirSync(examplesDir).sort();

let migrated = 0;
let skipped = 0;
let errors = 0;

for (const dir of dirs) {
  const codeFile = join(examplesDir, dir, 'code.js');
  if (!existsSync(codeFile)) {
    continue;
  }

  const code = readFileSync(codeFile, 'utf8');

  // Skip if already migrated (has nova64. destructuring)
  if (/const\s*\{[^}]+\}\s*=\s*nova64\./.test(code)) {
    console.log(`⏭  ${dir} — already migrated`);
    skipped++;
    continue;
  }

  // Find all used globals by scanning for word boundaries
  const usedGlobals = new Set();
  for (const name of ALL_GLOBALS) {
    // Match bare function calls, property access, or standalone references
    // But not as object property assignments or string literals
    const pattern = new RegExp(`(?<![.'"\\w])\\b${escapeRegex(name)}\\b(?!\\s*:(?!:))`, 'g');
    if (pattern.test(code)) {
      usedGlobals.add(name);
    }
  }

  if (usedGlobals.size === 0) {
    console.log(`⏭  ${dir} — no globals found`);
    skipped++;
    continue;
  }

  // Group by namespace
  const groups = {};
  for (const name of usedGlobals) {
    const group = REVERSE_MAP[name];
    if (!groups[group]) groups[group] = [];
    groups[group].push(name);
  }

  // Sort each group alphabetically
  for (const g of Object.keys(groups)) {
    groups[g].sort();
  }

  // Build destructuring lines in a consistent namespace order
  const nsOrder = Object.keys(NAMESPACE_MAP);
  const destructLines = [];
  for (const ns of nsOrder) {
    if (!groups[ns]) continue;
    const names = groups[ns];
    if (names.length <= 5) {
      destructLines.push(`const { ${names.join(', ')} } = nova64.${ns};`);
    } else {
      // Multi-line for readability
      destructLines.push(`const {\n  ${names.join(',\n  ')},\n} = nova64.${ns};`);
    }
  }

  const header = destructLines.join('\n');

  // Insert after any leading comments/blank lines, before first real code
  // Find insertion point: after leading comment block(s)
  const lines = code.split('\n');
  let insertIdx = 0;

  // Skip leading comment blocks and blank lines
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (
      trimmed === '' ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('*/')
    ) {
      insertIdx = i + 1;
    } else {
      break;
    }
  }

  // Insert header with a blank line after
  lines.splice(insertIdx, 0, header, '');
  const newCode = lines.join('\n');

  if (DRY_RUN) {
    console.log(
      `🔍 ${dir} — would add ${usedGlobals.size} globals from ${Object.keys(groups).length} namespaces`
    );
    for (const [ns, names] of Object.entries(groups)) {
      console.log(`   nova64.${ns}: ${names.join(', ')}`);
    }
  } else {
    writeFileSync(codeFile, newCode, 'utf8');
    console.log(
      `✅ ${dir} — migrated ${usedGlobals.size} globals from ${Object.keys(groups).length} namespaces`
    );
  }
  migrated++;
}

console.log(`\n📊 Results: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
