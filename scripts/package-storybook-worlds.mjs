import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync, strToU8 } from 'fflate';
import { generateStorybookWorld, storybookWorlds } from '../experiments/splat-worlds/storybook.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'retroarch/build/storybook-portable');
const godot = path.join(root, 'nova64-godot/godot_project/carts/storybook-worlds');
// The small vector subset lets the exact browser collision implementation run
// without importing Three.js into QuickJS. Fail if its import changes.
const collision = await fs.readFile(
  path.join(root, 'experiments/splat-worlds/collision.js'),
  'utf8'
);
const importLine = "import { Vector3 } from 'three';";
if (!collision.startsWith(importLine))
  throw new Error('Review portable collision bundling: import changed');
const vector = `class Vector3 {
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 clone(){return new Vector3(this.x,this.y,this.z);}
 add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
 setY(y){this.y=y;return this;}
 length(){return Math.hypot(this.x,this.y,this.z);}
 divideScalar(n){this.x/=n;this.y/=n;this.z/=n;return this;}
}\n`;
// Door posts are authored in the same world coordinates as the browser pair.
const definitions = storybookWorlds.map(w => ({
  ...w,
  walk: {
    ...w.walk,
    blockers: [
      ...w.walk.blockers,
      [-1.24, w.door[2] - 0.06, -1.1, w.door[2] + 0.12],
      [1.1, w.door[2] - 0.06, 1.24, w.door[2] + 0.12],
    ],
  },
}));
const code =
  `const worldDefinitions=${JSON.stringify(definitions)};\n` +
  vector +
  collision.slice(importLine.length).replaceAll('export function', 'function') +
  '\n' +
  (await fs.readFile(path.join(root, 'experiments/splat-worlds/portable/code.js'), 'utf8'));
const assets = Object.fromEntries(
  storybookWorlds.map(w => ['assets/' + w.file, generateStorybookWorld(w.id)])
);
const manifest = { name: 'Nova64 Storybook Worlds', main: 'code.js', assets: Object.keys(assets) };
const archive = zipSync({
  ...assets,
  'code.js': strToU8(code),
  'manifest.json': strToU8(JSON.stringify(manifest)),
  LICENSE: strToU8(await fs.readFile(path.join(root, 'LICENSE'), 'utf8')),
});
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'storybook-worlds.nova'), archive);
for (const [name, bytes] of Object.entries({
  ...assets,
  'code.js': strToU8(code),
  'meta.json': strToU8(JSON.stringify({ title: manifest.name })),
})) {
  const target = path.join(godot, name);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes);
}
console.log(`Packaged ${path.join(out, 'storybook-worlds.nova')} and ${godot}`);
