#!/usr/bin/env node
// build-nova.mjs — bundle a cart folder into a `.nova` file (a plain ZIP the
// RetroArch core + tooling load). The web cart (examples/<cart>/) is the source
// of truth; this packs its runtime files into examples/<cart>/<cart>.nova.
//
// Usage:
//   node scripts/build-nova.mjs <cart> [cart2 ...]   # build named carts
//   node scripts/build-nova.mjs --all                # rebuild every cart that
//                                                     # already has a .nova
//   pnpm build:nova <cart> | pnpm build:nova --all
//
// Bundle contents: code.js + manifest.json + meta.json + assets/** (everything
// under the cart except *.nova, *.import, and *.md docs). A manifest is ALWAYS
// emitted — the cart's own manifest.json if present, otherwise one synthesized
// with `main: "code.js"` and the discovered files as assets — because the
// RetroArch core reads `manifest.main` to find the entry point. Zero deps:
// minimal store/deflate ZIP writer using zlib.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXAMPLES = join(ROOT, 'examples');

// ---- CRC32 (self-contained; no zlib.crc32 version dependency) --------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ---- minimal ZIP writer (deflate) ------------------------------------------
function zip(files) {
  // files: [{ name, data:Buffer }]
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const f of files) {
    const nameBuf = Buffer.from(f.name, 'utf8');
    const crc = crc32(f.data);
    let comp = deflateRawSync(f.data);
    let method = 8;
    if (comp.length >= f.data.length) {
      comp = f.data;
      method = 0; // store if deflate didn't help
    }
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4); // version needed
    lh.writeUInt16LE(0, 6); // flags
    lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(0, 10); // time
    lh.writeUInt16LE(0x21, 12); // date (1980-01-01-ish, valid)
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18);
    lh.writeUInt32LE(f.data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28); // extra len
    locals.push(lh, nameBuf, comp);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4); // version made by
    ch.writeUInt16LE(20, 6); // version needed
    ch.writeUInt16LE(0, 8); // flags
    ch.writeUInt16LE(method, 10);
    ch.writeUInt16LE(0, 12); // time
    ch.writeUInt16LE(0x21, 14); // date
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(comp.length, 20);
    ch.writeUInt32LE(f.data.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt32LE(0, 36); // external attrs
    ch.writeUInt32LE(offset, 42); // local header offset
    centrals.push(ch, nameBuf);

    offset += lh.length + nameBuf.length + comp.length;
  }
  const cd = Buffer.concat(centrals);
  const cdOffset = offset;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

// ---- collect a cart's bundle files -----------------------------------------
const EXCLUDE_EXT = ['.nova', '.import', '.md'];
function collect(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...collect(full, base));
    } else {
      if (EXCLUDE_EXT.some(e => entry.endsWith(e))) continue;
      out.push({ name: relative(base, full).split('\\').join('/'), data: readFileSync(full) });
    }
  }
  return out;
}

// Every .nova must carry a manifest.json (the core reads its "main" to find the
// entry and "assets" to serve bundled files). Use the cart's manifest if present,
// otherwise synthesize one from meta.json + the discovered files.
function ensureManifest(dir, name, files) {
  const mPath = join(dir, 'manifest.json');
  if (existsSync(mPath)) {
    try {
      const m = JSON.parse(readFileSync(mPath, 'utf8'));
      if (!m.main) m.main = 'code.js';
      return m;
    } catch (_) {
      /* fall through to generate */
    }
  }
  let title = name;
  let version = '1.0.0';
  const metaPath = join(dir, 'meta.json');
  if (existsSync(metaPath)) {
    try {
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
      title = meta.title || meta.name || name;
      if (meta.version) version = meta.version;
    } catch (_) {
      /* ignore */
    }
  }
  // assets = everything bundled except the entry + descriptors
  const assets = files
    .map(f => f.name)
    .filter(n => n !== 'code.js' && n !== 'manifest.json' && n !== 'meta.json');
  return { name, title, version, main: 'code.js', assets };
}

function buildCart(name) {
  const dir = join(EXAMPLES, name);
  if (!existsSync(join(dir, 'code.js'))) {
    console.error(`  SKIP ${name} (no examples/${name}/code.js)`);
    return false;
  }
  let files = collect(dir); // code.js, meta.json, (existing) manifest.json, assets/**
  const manifest = ensureManifest(dir, name, files);
  // Always (re)write the manifest entry from `manifest`, so it's guaranteed present.
  files = files.filter(f => f.name !== 'manifest.json');
  files.push({ name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest, null, 2)) });
  const out = join(dir, `${name}.nova`);
  writeFileSync(out, zip(files));
  const kb = (statSync(out).size / 1024).toFixed(1);
  console.log(`  built ${name}.nova  (${files.length} files incl manifest, ${kb} KB)`);
  return true;
}

// ---- CLI -------------------------------------------------------------------
const args = process.argv.slice(2);
let carts;
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log('Usage: node scripts/build-nova.mjs <cart> [cart2 ...] | --all');
  process.exit(args.length === 0 ? 1 : 0);
} else if (args[0] === '--all') {
  // every cart that already has a colocated <name>.nova (the RetroArch set)
  carts = readdirSync(EXAMPLES).filter(
    n => existsSync(join(EXAMPLES, n, `${n}.nova`)) || existsSync(join(EXAMPLES, n, 'code.js'))
  );
  carts = carts.filter(n => existsSync(join(EXAMPLES, n, `${n}.nova`)));
} else {
  carts = args;
}

console.log(`Building ${carts.length} .nova bundle(s)…`);
let ok = 0;
for (const c of carts) if (buildCart(c)) ok++;
console.log(`Done: ${ok}/${carts.length} built.`);
process.exit(ok === carts.length ? 0 : 1);
