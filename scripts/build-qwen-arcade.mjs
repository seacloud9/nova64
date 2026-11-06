#!/usr/bin/env node
// Builds examples/QWEN/arcade.json: the list the console's QWEN Arcade shelf
// and the OS shell read. Run after adding or changing a QWEN game:
//
//   node scripts/build-qwen-arcade.mjs
//
// Each game is examples/QWEN/<id>/{code.js,meta.json}; its cover is
// examples/QWEN/blog/<id>-title.png (captured from the game's title screen).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';

const ROOT = 'examples/QWEN';
const games = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`${ROOT}/${d.name}/code.js`))
  .map((d) => {
    const id = d.name;
    const meta = JSON.parse(readFileSync(`${ROOT}/${id}/meta.json`, 'utf8'));
    const desc = String(meta.description || '');
    const colon = desc.indexOf(':');
    const title = colon > 0 ? desc.slice(0, colon).trim() : id;
    const rest = colon > 0 ? desc.slice(colon + 1) : desc;
    // First clause makes a short card blurb; the full description is kept too.
    let blurb = rest.split(/[;(]/)[0].trim();
    if (blurb.length > 72) blurb = blurb.slice(0, 72).replace(/\s+\S*$/, '') + '…';
    blurb = blurb.charAt(0).toUpperCase() + blurb.slice(1);
    const cover = `${ROOT}/blog/${id}-title.png`;
    return {
      id,
      title,
      blurb,
      description: desc,
      path: `/${ROOT}/${id}/code.js`,
      cover: existsSync(cover) ? `/${cover}` : null,
      model: meta.model || null,
      status: meta.qwenStatus || null,
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));

// Two runs can produce the same game name; tell them apart by folder suffix
// (crystal-cave-collector vs crystal-cave-styled -> "… (Styled)").
const seen = new Map();
for (const g of games) seen.set(g.title, (seen.get(g.title) || 0) + 1);
for (const g of games) {
  if (seen.get(g.title) < 2) continue;
  const words = g.title.toLowerCase().split(/\s+/);
  const extra = g.id.split('-').filter((w) => !words.includes(w));
  if (extra.length) g.title += ` (${extra.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')})`;
}

const manifest = {
  title: 'QWEN Arcade',
  tagline: 'Games written by a local Qwen model in Nova64 Studio',
  article: `/${ROOT}/blog/teaching-a-local-qwen-to-make-games.html`,
  games,
};
writeFileSync(`${ROOT}/arcade.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log(`wrote ${ROOT}/arcade.json (${games.length} games)`);
for (const g of games) console.log(`  ${g.title.padEnd(26)} ${g.cover ? 'cover' : 'NO COVER'}  ${g.blurb}`);
