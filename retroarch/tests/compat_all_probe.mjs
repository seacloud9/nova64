#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = process.env.NOVA64_COMPAT_OUT || '/tmp/compat-all';
const frames = Number(process.env.NOVA64_COMPAT_FRAMES || 30);
fs.mkdirSync(outDir, { recursive: true });

const carts = fs
  .readdirSync(path.join(root, 'examples'), { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .filter(name => fs.existsSync(path.join(root, 'examples', name, 'code.js')))
  .sort();

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  return {
    dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    dosDate: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function makeZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { dosTime, dosDate } = dosDateTime(new Date('2026-01-01T00:00:00Z'));

  for (const file of files) {
    const name = Buffer.from(file.name);
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);
    const compressed = zlib.deflateRawSync(data);
    const crc = crc32(data);
    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(8),
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(compressed.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      compressed,
    ]);
    localParts.push(local);

    centralParts.push(
      Buffer.concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(8),
        u16(dosTime),
        u16(dosDate),
        u32(crc),
        u32(compressed.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name,
      ])
    );
    offset += local.length;
  }

  const central = Buffer.concat(centralParts);
  return Buffer.concat([
    ...localParts,
    central,
    Buffer.concat([
      u32(0x06054b50),
      u16(0),
      u16(0),
      u16(files.length),
      u16(files.length),
      u32(central.length),
      u32(offset),
      u16(0),
    ]),
  ]);
}

function packageCart(cart) {
  const dir = path.join(root, 'examples', cart);
  const files = [{ name: 'code.js', data: fs.readFileSync(path.join(dir, 'code.js')) }];
  const meta = path.join(dir, 'meta.json');
  if (fs.existsSync(meta)) files.push({ name: 'meta.json', data: fs.readFileSync(meta) });
  const nova = path.join(outDir, cart + '.nova');
  fs.writeFileSync(nova, makeZip(files));
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
