/**
 * Post-build script: copies examples/ and docs/ into dist/ so the CLI
 * can serve a fully self-contained console experience.
 */
import { cpSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');

function copyDir(src, destName) {
  const srcPath = resolve(root, src);
  const destPath = resolve(dist, destName);
  if (!existsSync(srcPath)) {
    console.warn(`  ⚠ ${src}/ not found, skipping`);
    return;
  }
  mkdirSync(destPath, { recursive: true });
  cpSync(srcPath, destPath, { recursive: true });
  console.log(`  ✓ ${src}/ → dist/${destName}/`);
}

console.log('📦 Nova64 post-build: copying assets into dist/');
copyDir('examples', 'examples');
copyDir('docs', 'docs');
console.log('  ✓ Done\n');
