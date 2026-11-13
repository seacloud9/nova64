#!/usr/bin/env node
// Downloads the CC BY 4.0 Gaussian scan assets from their pinned commit URLs
// and verifies SHA-256. Binaries are gitignored; *.source.json is the record.
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'experiments/gaussian-splatting/assets');
const sha = buf => createHash('sha256').update(buf).digest('hex');
const exists = p => stat(p).then(() => true, () => false);

let failed = false;
for (const name of (await readdir(dir)).filter(f => f.endsWith('.source.json'))) {
  const meta = JSON.parse(await readFile(join(dir, name), 'utf8'));
  const target = join(dir, name.replace(/\.source\.json$/, ''));
  if (await exists(target) && sha(await readFile(target)) === meta.sha256) {
    console.log(`ok      ${name.replace('.source.json', '')}`);
    continue;
  }
  const res = await fetch(meta.url);
  if (!res.ok) { console.error(`FAIL    ${meta.url}: HTTP ${res.status}`); failed = true; continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  if (sha(buf) !== meta.sha256) { console.error(`FAIL    ${meta.url}: sha256 mismatch`); failed = true; continue; }
  await writeFile(target, buf);
  console.log(`fetched ${name.replace('.source.json', '')} (${buf.length} bytes)`);
}
process.exit(failed ? 1 : 0);
