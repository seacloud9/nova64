#!/usr/bin/env python3
"""Build retroarch/games/fps-demo-3d.nova bundling:
- examples/fps-demo-3d/code.js   (the cart)
- runtime/wad.js                 (WADLoader / WADTextureManager / convertWADMap,
                                   exposed on nova64.data so the cart's
                                   destructured imports resolve)
- manifest.json                  (lists freedoom1.wad as a packaged asset)
- meta.json                      (cart metadata + gameplay tunings)
- public/assets/freedoom1.wad    (the WAD asset itself)

The runtime/wad.js source is prepended to code.js with its ES module bits
stripped (no `import`, no `export`) and an engine-adapter stub so calls
like engine.createDataTexture() resolve to RA-native handles or harmless
sentinels. wadApi().exposeTo(nova64.data) wires the runtime onto the
shared nova64.data namespace the cart destructures from at startup, which
populates colSegs so player/enemy/bullet collision against WAD geometry
actually blocks the way it does on web Three.js / Babylon.
"""
from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "retroarch/games/fps-demo-3d.nova"
CART_JS = REPO / "examples/fps-demo-3d/code.js"
WAD_RUNTIME = REPO / "runtime/wad.js"
META = REPO / "examples/fps-demo-3d/meta.json"
WAD_FILE = REPO / "public/assets/freedoom1.wad"

ENGINE_STUB = """
// Engine-adapter stub for the WAD runtime. createDataTexture forwards
// to nova64.scene.createDataTexture if exposed; otherwise returns a
// sentinel so wad.js code paths that expect a texture handle don't
// crash. Mirrors retroarch/tools/build_wad_nova.py's stub but kept
// minimal — fps-demo-3d builds its own materials per-mesh and is less
// sensitive to texture-creation timing than wad-demo.
const __wad_engine_stub = {
  createDataTexture(pixels, w, h, opts) {
    if (typeof globalThis.nova64 !== 'undefined'
        && globalThis.nova64.scene
        && typeof globalThis.nova64.scene.createDataTexture === 'function') {
      try {
        const handle = globalThis.nova64.scene.createDataTexture(pixels, w, h, opts || {});
        if (typeof handle === 'number' && handle > 0) return handle;
      } catch (e) {}
    }
    return { __wadStubTex: true, width: w, height: h, opts: opts || {} };
  },
  invalidateTexture(tex) {},
  setTextureRepeat(tex, u, v) {},
};
const engine = __wad_engine_stub;
"""


def build_wad_module_source() -> str:
    raw = WAD_RUNTIME.read_text(encoding="utf-8")
    # Strip the single `import { engine } from './engine-adapter.js';` line.
    raw = re.sub(r"^\s*import\s+.+?from\s+['\"][^'\"]+['\"];\s*$", "", raw, flags=re.MULTILINE)
    # Strip every `export ` token but keep the names (`export function foo` -> `function foo`).
    raw = re.sub(r"^export\s+", "", raw, flags=re.MULTILINE)
    return raw


def build_wrapped_cart() -> str:
    cart = CART_JS.read_text(encoding="utf-8")
    wad_src = build_wad_module_source()
    return (
        "// --- BEGIN WAD bundle (auto-built by retroarch/tools/build_fps_demo_3d_nova.py) ---\n"
        "(function(){\n"
        + ENGINE_STUB
        + "\n"
        + wad_src
        + "\n"
        "  if (typeof globalThis.nova64 !== 'undefined' && globalThis.nova64.data && typeof wadApi === 'function') {\n"
        "    wadApi().exposeTo(globalThis.nova64.data);\n"
        "    // Mirror wad-demo's setWallUVs override: the upstream version pokes\n"
        "    // Three.js BufferAttribute fields that don't exist on the RA mesh\n"
        "    // stub. Use setMeshUVScale/setMeshUVOffset so wall textures tile\n"
        "    // correctly along each linedef's length and height.\n"
        "    if (nova64.scene && nova64.scene.setMeshUVScale && nova64.scene.setMeshUVOffset) {\n"
        "      nova64.data.setWallUVs = function(meshId, wallDoomLen, wallDoomH, texW, texH, xoff, yoff) {\n"
        "        if (!meshId || !texW || !texH) return;\n"
        "        var tileU = wallDoomLen / texW, tileV = wallDoomH / texH;\n"
        "        var ofsU = (xoff || 0) / texW, ofsV = (yoff || 0) / texH;\n"
        "        try { nova64.scene.setMeshUVScale(meshId, tileU, tileV); } catch(e) {}\n"
        "        try { nova64.scene.setMeshUVOffset(meshId, ofsU, ofsV); } catch(e) {}\n"
        "      };\n"
        "    }\n"
        "  }\n"
        "  if (typeof globalThis.nova64 !== 'undefined' && nova64.draw && nova64.draw.autoClear) {\n"
        "    nova64.draw.autoClear(true);\n"
        "  }\n"
        "})();\n"
        "// --- END WAD bundle ---\n"
        + cart
    )


def main() -> int:
    if not WAD_FILE.exists():
        print(f"WAD missing at {WAD_FILE}", file=sys.stderr)
        return 1
    if not WAD_RUNTIME.exists():
        print(f"WAD runtime missing at {WAD_RUNTIME}", file=sys.stderr)
        return 1
    if not CART_JS.exists():
        print(f"Cart missing at {CART_JS}", file=sys.stderr)
        return 1
    manifest = {
        "name": "fps-demo-3d",
        "title": "Neo-Doom",
        "author": "Nova64",
        "version": "1.0.0",
        "main": "code.js",
        "assets": ["freedoom1.wad"],
    }
    wrapped = build_wrapped_cart()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("manifest.json", json.dumps(manifest, indent=2) + "\n")
        z.writestr("code.js", wrapped)
        z.write(META, "meta.json")
        z.write(WAD_FILE, "freedoom1.wad")
    print(f"Built {OUT} ({OUT.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
