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
        "    // Note: nova64's native colour is 0xRRGGBBAA so 0xb0b0b0 means\n"
        "    // R=0 G=B=0xb0 = cyan. Pass the alpha-suffixed full 32-bit\n"
        "    // form so ambient is actually neutral grey, not cyan.\n"
        "    var origAmb = l.setAmbientLight;\n"
        "    l.setAmbientLight = function(_color, intensity) {\n"
        "      if (origAmb) try { origAmb.call(l, 0xb0b0b0ff, intensity != null ? intensity : 0.6); } catch (e) {}\n"
        "    };\n"
        "    var origDir = l.setDirectionalLight;\n"
        "    l.setDirectionalLight = function(dir, _color, intensity) {\n"
        "      if (origDir) try { origDir.call(l, dir, 0xffffffff, intensity != null ? intensity : 0.9); } catch (e) {}\n"
        "    };\n"
        "    // Re-apply with the cart's existing init values neutralized\n"
        "    l.setAmbientLight(0xb0b0b0ff, 0.6);\n"
        "    l.setDirectionalLight([-1, -2, -1], 0xffffffff, 0.9);\n"
        "  }\n"
        "  // CRITICAL: nova64's native colour encoding is 0xRRGGBBAA,\n"
        "  // but wad-demo uses Three.js-style 0xRRGGBB literals (e.g.\n"
        "  // 0xffffff for white). Without remapping, 0xffffff unpacks\n"
        "  // as (R=0, G=255, B=255, A=255) = pure cyan. THIS is the\n"
        "  // 'everything is teal' bug at root: every mesh.color in the\n"
        "  // cart was secretly cyan, not white.\n"
        "  // The global use24BitColors flag would do this, but it\n"
        "  // also mis-promotes 2D HUD colours from rgba8() (which can\n"
        "  // legitimately have R=0). So we surgically wrap only the\n"
        "  // 3D-scene colour-accepting functions and promote 24-bit\n"
        "  // literals before they reach C.\n"
        "  if (typeof globalThis.nova64 !== 'undefined') {\n"
        "    var promo = function(c) {\n"
        "      if (typeof c !== 'number') return c;\n"
        "      // Treat any value 0x000000..0xFFFFFF (top byte == 0, no alpha)\n"
        "      // as a 24-bit literal and append FF alpha.\n"
        "      if (c >= 0 && c <= 0xFFFFFF) return (c * 0x100) + 0xFF;\n"
        "      return c;\n"
        "    };\n"
        "    var s = nova64.scene;\n"
        "    if (s && !s.__wadColorWrapped) {\n"
        "      s.__wadColorWrapped = true;\n"
        "      // Each create* has the colour at a known arg slot.\n"
        "      // Wrap them explicitly so the promotion is deterministic.\n"
        "      var colorSlot = {\n"
        "        createCube: 1,      // (size, color, [pos], opts)\n"
        "        createSphere: 1,    // (radius, color, [pos])\n"
        "        createPlane: 2,     // (w, h, color, [pos], opts)\n"
        "        createCone: 2,      // (radius, height, color, ...)\n"
        "        createCylinder: 2,  // (radius, height, color, ...)\n"
        "        createTorus: 2,     // (radius, tube, color, ...)\n"
        "        createCapsule: 2    // (radius, height, color, ...)\n"
        "      };\n"
        "      Object.keys(colorSlot).forEach(function(name){\n"
        "        var raw = s[name];\n"
        "        if (typeof raw !== 'function') return;\n"
        "        var slot = colorSlot[name];\n"
        "        s[name] = function(){\n"
        "          var args = Array.prototype.slice.call(arguments);\n"
        "          if (typeof args[slot] === 'number') args[slot] = promo(args[slot]);\n"
        "          return raw.apply(s, args);\n"
        "        };\n"
        "      });\n"
        "      var rawSetColor = s.setMeshColor;\n"
        "      if (typeof rawSetColor === 'function') {\n"
        "        s.setMeshColor = function(mesh, color){ return rawSetColor.call(s, mesh, promo(color)); };\n"
        "      }\n"
        "    }\n"
        "    var L = nova64.light;\n"
        "    if (L && !L.__wadColorWrapped) {\n"
        "      L.__wadColorWrapped = true;\n"
        "      // Note: setAmbientLight / setDirectionalLight already neutralized above; just wrap\n"
        "      // createPointLight + setFog so enemy light colour and fog literals get promoted.\n"
        "      ['createPointLight','setFog'].forEach(function(name){\n"
        "        var raw = L[name];\n"
        "        if (typeof raw !== 'function') return;\n"
        "        L[name] = function(){\n"
        "          var args = Array.prototype.slice.call(arguments);\n"
        "          if (typeof args[0] === 'number') args[0] = promo(args[0]);\n"
        "          return raw.apply(L, args);\n"
        "        };\n"
        "      });\n"
        "    }\n"
        "  }\n"
        "  // Mild saturation pull-down so the now-correct accent reds /\n"
        "  // greens / yellows don't read as oversaturated against the\n"
        "  // remaining cyan accent walls (designed in the cart).\n"
        "  if (typeof globalThis.nova64 !== 'undefined' && nova64.post && nova64.post.setSaturation) {\n"
        "    try { nova64.post.setSaturation(0.85); } catch (e) {}\n"
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
