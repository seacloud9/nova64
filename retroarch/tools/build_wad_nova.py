#!/usr/bin/env python3
"""Build retroarch/games/wad-demo.nova bundling:
- examples/wad-demo/code.js   (the cart)
- runtime/wad.js              (WADLoader + texture manager, exposed on nova64.data)
- manifest.json               (lists freedoom1.wad as a packaged asset)
- meta.json                   (cart metadata)
- public/assets/freedoom1.wad (the WAD asset itself)

The runtime/wad.js source is prepended to code.js with its ES module bits
stripped (no `import`, no `export`) and a small engine-adapter stub so
calls like engine.createDataTexture() resolve to no-op placeholders that
keep the WAD walls rendering as solid colors instead of crashing.
"""
from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "retroarch/games/wad-demo.nova"
CART_JS = REPO / "examples/wad-demo/code.js"
WAD_RUNTIME = REPO / "runtime/wad.js"
META = REPO / "examples/wad-demo/meta.json"
WAD_FILE = REPO / "public/assets/freedoom1.wad"

ENGINE_STUB = """
// Engine-adapter stub for the WAD runtime. createDataTexture forwards
// straight into the nova64 scene API so the WADTextureManager's
// composited wall/flat/sprite RGBA buffers become real GL textures
// (returns an integer handle that engine.setMeshMaterial in the host
// compat layer wires up via setMeshTexture). Falls back to a sentinel
// object if the host doesn't expose the data-texture path so the cart
// never crashes on a null return.
const __wad_engine_stub = {
  createDataTexture(pixels, w, h, opts) {
    if (typeof globalThis.nova64 !== 'undefined'
        && globalThis.nova64.scene
        && typeof globalThis.nova64.scene.createDataTexture === 'function') {
      try {
        const handle = globalThis.nova64.scene.createDataTexture(pixels, w, h, opts || {});
        if (handle > 0) return handle;
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
        "// --- BEGIN WAD bundle (auto-built by retroarch/tools/build_wad_nova.py) ---\n"
        "(function(){\n"
        + ENGINE_STUB
        + "\n"
        + wad_src
        + "\n"
        "  if (typeof globalThis.nova64 !== 'undefined' && globalThis.nova64.data && typeof wadApi === 'function') {\n"
        "    wadApi().exposeTo(globalThis.nova64.data);\n"
        "    // Override setWallUVs for RA: the upstream implementation pokes\n"
        "    // Three.js BufferAttribute fields that don't exist on the RA mesh\n"
        "    // stub, so wall textures used to render at default 0..1 UVs (one\n"
        "    // tile stretched across the whole wall). Map the same tileU/tileV\n"
        "    // math to setMeshUVScale/Offset so the texture repeats correctly\n"
        "    // along each wall's length and height.\n"
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
        "  // Opt into per-frame overlay clear so menu pixels don't linger into the playing state\n"
        "  // (Three.js canvas autoclears in web; the RA 2D overlay buffer otherwise persists).\n"
        "  if (typeof globalThis.nova64 !== 'undefined' && nova64.draw && nova64.draw.autoClear) {\n"
        "    nova64.draw.autoClear(true);\n"
        "  }\n"
        "  // Neutralize the cart's blue ambient + directional lighting from\n"
        "  // init(): the web Three.js renderer can hide tinted lights behind\n"
        "  // its own tone-mapping curve, but in RA the blue tint multiplies\n"
        "  // the (cyan) accent walls and produces the 'everything is teal'\n"
        "  // wash the user reported. Override to neutral white once the\n"
        "  // cart has had a chance to set its own values; we patch the\n"
        "  // setters so any later cart-driven changes also stay neutral.\n"
        "  if (typeof globalThis.nova64 !== 'undefined' && nova64.light) {\n"
        "    var l = nova64.light;\n"
        "    var origAmb = l.setAmbientLight;\n"
        "    l.setAmbientLight = function(_color, intensity) {\n"
        "      if (origAmb) try { origAmb.call(l, 0xb0b0b0, intensity != null ? intensity : 0.6); } catch (e) {}\n"
        "    };\n"
        "    var origDir = l.setDirectionalLight;\n"
        "    l.setDirectionalLight = function(dir, _color, intensity) {\n"
        "      if (origDir) try { origDir.call(l, dir, 0xffffff, intensity != null ? intensity : 0.9); } catch (e) {}\n"
        "    };\n"
        "    // Re-apply with the cart's existing init values neutralized\n"
        "    l.setAmbientLight(0xb0b0b0, 0.6);\n"
        "    l.setDirectionalLight([-1, -2, -1], 0xffffff, 0.9);\n"
        "  }\n"
        "  // Dial down the cart's hyper-saturated accent walls / pickup\n"
        "  // emissives so the scene doesn't read as 'everything teal'\n"
        "  // under RA's tone-mapping. 0.7 keeps colour identity but pulls\n"
        "  // pure cyan closer to a grey-blue, matching FreeDoom's\n"
        "  // more-muted reference look.\n"
        "  if (typeof globalThis.nova64 !== 'undefined' && nova64.post && nova64.post.setSaturation) {\n"
        "    try { nova64.post.setSaturation(0.7); } catch (e) {}\n"
        "  }\n"
        "})();\n"
        "// --- END WAD bundle ---\n"
        + cart
    )


def main() -> int:
    if not WAD_FILE.exists():
        print(f"WAD missing at {WAD_FILE}", file=sys.stderr)
        return 1
    manifest = {
        "name": "wad-demo",
        "title": "FreeDoom WAD Explorer",
        "author": "Nova64",
        "version": "1.0.0",
        "main": "code.js",
        "assets": ["freedoom1.wad"],
    }
    wrapped = build_wrapped_cart()
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("manifest.json", json.dumps(manifest, indent=2) + "\n")
        z.writestr("code.js", wrapped)
        z.write(META, "meta.json")
        z.write(WAD_FILE, "freedoom1.wad")
    print(f"Built {OUT} ({OUT.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
