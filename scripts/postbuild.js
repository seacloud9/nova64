/**
 * Post-build script: copies examples/ and docs/ into dist/ so the CLI
 * can serve a fully self-contained console experience.
 * Also validates that all HTML files with <script type="module"> have proper import maps.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, relative } from 'path';
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
copyDir('runtime', 'runtime');
copyDir('examples', 'examples');
copyDir('docs', 'docs');
console.log('  ✓ Done\n');

// ---------------------------------------------------------------------------
// Validate import maps in all HTML files that use <script type="module">
// ---------------------------------------------------------------------------

const REQUIRED_IMPORTS = ['three', 'three/tsl', 'three/webgpu', 'three/examples/jsm/'];

// Files that use <script type="module"> but do NOT import three.js
const IMPORT_MAP_SKIP = ['tests/test-runner.html', 'index.html', 'test-mobile.html', 'os9-shellMobile/index.html', 'os9-shellMobile/dist/index.html', 'public/os9-shellMobile/index.html'];

function findHtmlFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (entry === 'node_modules' || entry === '.git') continue;
    const stat = statSync(full);
    if (stat.isDirectory()) results.push(...findHtmlFiles(full));
    else if (entry.endsWith('.html')) results.push(full);
  }
  return results;
}

function validateImportMaps() {
  console.log('🔍 Validating import maps in HTML files...');
  const htmlFiles = findHtmlFiles(root).filter(
    f => !f.includes('node_modules') && !f.includes('.git')
  );

  const issues = [];

  for (const file of htmlFiles) {
    const content = readFileSync(file, 'utf-8');
    const hasModule = /type\s*=\s*["']module["']/.test(content);
    if (!hasModule) continue;

    const rel = relative(root, file);
    if (IMPORT_MAP_SKIP.some(skip => rel === skip || rel.startsWith('dist/' + skip))) continue;

    const hasImportMap = /type\s*=\s*["']importmap["']/.test(content);

    if (!hasImportMap) {
      issues.push(`  ⚠ ${rel}: has <script type="module"> but NO import map`);
      continue;
    }

    // Extract and parse the import map
    const mapMatch = content.match(
      /<script\s+type\s*=\s*["']importmap["']\s*>([\s\S]*?)<\/script>/
    );
    if (!mapMatch) {
      issues.push(`  ⚠ ${rel}: import map tag found but could not parse contents`);
      continue;
    }

    try {
      const map = JSON.parse(mapMatch[1]);
      const imports = map.imports || {};
      const missing = REQUIRED_IMPORTS.filter(k => !imports[k]);
      if (missing.length > 0) {
        issues.push(`  ⚠ ${rel}: import map missing: ${missing.join(', ')}`);
      }
    } catch {
      issues.push(`  ⚠ ${rel}: import map contains invalid JSON`);
    }
  }

  if (issues.length > 0) {
    console.log('');
    issues.forEach(i => console.log(i));
    console.log(`\n❌ ${issues.length} import map issue(s) found. Fix before deploying!\n`);
    process.exit(1);
  } else {
    console.log('  ✓ All HTML files with modules have valid import maps\n');
  }
}

validateImportMaps();
