---
name: nova64-new-cart
description: Scaffold a new Nova64 cart from scratch. Use this skill when creating a new cart, new demo, or new example — any time a new directory under examples/ needs to be initialized with code.js and meta.json. Handles both the source (examples/) and dist mirror (dist/examples/) correctly so the cart appears in the browser console.
---

# Nova64 New Cart

## What a cart needs

Every cart is a directory with two files:

```
examples/<cart-name>/
  code.js       ← the cart source (ES module)
  meta.json     ← display metadata for the console browser
```

And a mirror under `dist/`:

```
dist/examples/<cart-name>/
  code.js       ← identical copy of examples/<cart-name>/code.js
  meta.json     ← identical copy of meta.json
```

## code.js template

```js
// Nova64 Cart: <CART TITLE>
// Controls: Z = <action>  X = <action>  Arrows = <action>

export function init() {
  // Create 3D objects, lighting, skybox, load save data.
  // Called once on load and again on restart.
}

export function update(dt) {
  // Game logic. dt = seconds since last frame.
}

export function draw() {
  // 2D HUD only — 3D renders automatically before this.
  cls3D();  // use cls3D() for 3D carts, cls(0x000000) for 2D-only
  // print, rectfill, glowCircle, etc.
}
```

## meta.json template

```json
{
  "name": "Cart Title",
  "description": "One-sentence description of what this cart does.",
  "author": "Nova64",
  "version": "0.1.0",
  "category": "game",
  "source": "examples/<cart-name>"
}
```

Valid `category` values: `"game"`, `"demo"`, `"port"`, `"tool"`, `"experiment"`

## Creation steps

1. Create `examples/<cart-name>/` with `code.js` and `meta.json`.
2. Mirror both files to `dist/examples/<cart-name>/`:

```bash
mkdir -p dist/examples/<cart-name>
cp examples/<cart-name>/code.js dist/examples/<cart-name>/code.js
cp examples/<cart-name>/meta.json dist/examples/<cart-name>/meta.json
```

3. Verify the diff is clean:

```bash
diff -r examples/<cart-name> dist/examples/<cart-name>
```

4. Test with `pnpm test` (demoscene regression suite).

## Naming conventions

- Directory name: lowercase, hyphenated — e.g., `space-shooter`, `neon-snake`, `my-platformer`
- No spaces, no underscores in directory names
- `meta.json` → `"source"` field must match the directory path exactly

## Common 3D cart init pattern

```js
export function init() {
  best = loadData('prefix_best', 0);   // unique 2-3 char prefix per cart

  createSpaceSkybox({ starCount: 1200 });
  setAmbientLight(rgba8(120, 140, 200, 255), 0.9);
  setLightDirection(-0.3, -1, -0.5);
  nova64.post.setBloom(1.6);

  // Create meshes here, not in update/draw
  player = createSphere(0.4, rgba8(80, 200, 255, 255));
  setMeshEmissive(player, rgba8(80, 200, 255, 255), 1.2);

  state = 'start';
  score = 0;
}
```

## Applying the nova64-cart-dev skill

Once created, use the `nova64-cart-dev` skill for all subsequent editing. The dual-sync rule from that skill applies to every future change — always copy `examples/` → `dist/` after any edit.
