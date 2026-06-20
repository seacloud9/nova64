#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = process.env.NOVA64_COMPAT_OUT || '/tmp/compat-all';
const frames = Number(process.env.NOVA64_COMPAT_FRAMES || 30);
const failOnWarn = process.env.NOVA64_COMPAT_FAIL_ON_WARN === '1';
const cartFilter = new Set(
  (process.env.NOVA64_COMPAT_CART || '')
    .split(',')
    .map(name => name.trim())
    .filter(Boolean)
);
fs.mkdirSync(outDir, { recursive: true });

const carts = fs
  .readdirSync(path.join(root, 'examples'), { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .filter(name => fs.existsSync(path.join(root, 'examples', name, 'code.js')))
  .filter(name => cartFilter.size === 0 || cartFilter.has(name))
  .sort();

function packageCart(cart) {
  const nova = path.join(outDir, cart + '.nova');
  const result = spawnSync(
    'python3',
    [
      path.join(root, 'retroarch', 'tools', 'package_example_cart.py'),
      '--repo-root',
      root,
      '--out-dir',
      outDir,
      cart,
    ],
    { cwd: root, encoding: 'utf8' }
  );
  if (result.status !== 0) {
    const output = ((result.stdout || '') + (result.stderr || '')).trim();
    throw new Error(output || `failed to package ${cart}`);
  }
  return nova;
}

let pass = 0;
let warn = 0;
let fail = 0;

console.log('name|status|first_error');
for (const cart of carts) {
  const nova = packageCart(cart);
  const capture = path.join(outDir, cart + '.ppm');
  const result = spawnSync(
    path.join(root, 'retroarch', 'build', 'harness'),
    [
      path.join(root, 'retroarch', 'nova64_libretro.so'),
      nova,
      '--gles',
      '--frames',
      String(frames),
      '--capture',
      capture,
    ],
    { cwd: root, encoding: 'utf8', env: { ...process.env, NOVA64_GLES_TESTS: '1' } }
  );
  const output = (result.stdout || '') + (result.stderr || '');
  const firstError =
    output
      .split(/\r?\n/)
      .find(line =>
        /JS exception|ReferenceError|TypeError|SyntaxError|Cart init\(\) threw|Cart update\(\) error/.test(
          line
        )
      )
      ?.replace(/^\[nova64\]\s*/, '') || '';
  if (output.includes('ok=1')) {
    if (firstError) {
      warn++;
      console.log(cart + '|WARN|' + firstError);
    } else {
      pass++;
      console.log(cart + '|PASS|');
    }
  } else {
    fail++;
    console.log(cart + '|FAIL|' + firstError);
  }
}

console.log('---');
console.log('passed=' + pass + ' warned=' + warn + ' failed=' + fail + ' total=' + carts.length);

if (fail > 0 || (failOnWarn && warn > 0)) {
  process.exitCode = 1;
}
