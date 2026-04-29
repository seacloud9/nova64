/**
 * Fix name collisions in examples where destructured nova64.* names
 * conflict with local function/let/const/var declarations.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exDir = path.join(__dirname, '..', 'examples');

const carts = fs.readdirSync(exDir).filter(d => {
  return fs.existsSync(path.join(exDir, d, 'code.js'));
});

let totalFixed = 0;

for (const cart of carts) {
  const file = path.join(exDir, cart, 'code.js');
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('nova64.')) continue;

  // Extract all destructured names and their source lines
  const names = [];
  for (const m of src.matchAll(/const\s*\{([^}]+)\}\s*=\s*nova64\.(\w+)/g)) {
    for (const n of m[1].split(',')) {
      const trimmed = n.trim();
      if (trimmed) names.push(trimmed);
    }
  }
  if (!names.length) continue;

  // Strip the destructuring lines to check for redeclarations in the rest
  const strippedForCheck = src.replace(/^const\s*\{[^}]+\}\s*=\s*nova64\.\w+;\s*$/gm, '');

  const collisions = names.filter(n => {
    // Check for function declarations, let/const/var declarations
    const re = new RegExp(
      `\\b(function|let|const|var)\\s+${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`
    );
    return re.test(strippedForCheck);
  });

  if (!collisions.length) continue;

  console.log(`${cart}: fixing collisions: ${collisions.join(', ')}`);

  for (const collision of collisions) {
    // Find the destructuring line containing this name
    // Handle both single-line and multi-line destructuring

    // Pattern 1: Name is the ONLY member -> remove entire line
    const soleRe = new RegExp(
      `^const\\s*\\{\\s*${collision}\\s*\\}\\s*=\\s*nova64\\.\\w+;\\s*\\n`,
      'gm'
    );
    if (soleRe.test(src)) {
      src = src.replace(soleRe, '');
      continue;
    }

    // Pattern 2: Multi-line - name on its own line with trailing comma
    // e.g. "  collision,\n"
    const multiLineTrailingRe = new RegExp(`^\\s*${collision},\\s*\\n`, 'gm');
    if (multiLineTrailingRe.test(src)) {
      // Only replace within the context of nova64 destructuring blocks
      // Find the block, then remove the line
      const blockRe = new RegExp(
        `(const\\s*\\{[^}]*?)\\n\\s*${collision},\\s*\\n([^}]*\\}\\s*=\\s*nova64\\.)`,
        'g'
      );
      if (blockRe.test(src)) {
        src = src.replace(blockRe, `$1\n$2`);
        continue;
      }
    }

    // Pattern 3: Multi-line - name on its own line, LAST item (no trailing comma)
    // e.g. "  ,\n  collision\n} = nova64.xxx;"
    const multiLineLastRe = new RegExp(
      `(const\\s*\\{[^}]*?),\\s*\\n\\s*${collision}\\s*\\n(\\}\\s*=\\s*nova64\\.)`,
      'g'
    );
    if (multiLineLastRe.test(src)) {
      src = src.replace(multiLineLastRe, `$1\n$2`);
      continue;
    }

    // Pattern 4: Single-line - name with comma after: "collision, "
    const inlineAfterRe = new RegExp(`${collision},\\s*`, 'g');
    // Pattern 5: Single-line - name with comma before: ", collision"
    const inlineBeforeRe = new RegExp(`,\\s*${collision}(?=[\\s}])`, 'g');

    // Try pattern 4 first (within a nova64 destructuring context)
    const check4 = new RegExp(`(const\\s*\\{[^}]*)${collision},\\s*([^}]*\\}\\s*=\\s*nova64\\.)`);
    if (check4.test(src)) {
      src = src.replace(check4, '$1$2');
      continue;
    }

    // Try pattern 5
    const check5 = new RegExp(`(const\\s*\\{[^}]*),\\s*${collision}([^}]*\\}\\s*=\\s*nova64\\.)`);
    if (check5.test(src)) {
      src = src.replace(check5, '$1$2');
      continue;
    }

    console.log(`  WARNING: could not auto-fix '${collision}' in ${cart}`);
  }

  fs.writeFileSync(file, src);
  totalFixed++;
}

console.log(`\nFixed ${totalFixed} files`);
