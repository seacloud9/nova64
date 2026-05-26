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
// Engine-adapter stub — WAD textures in RA fall back to solid colors per
// surface. Returns opaque handles that the cart treats as valid texture refs
// without crashing on null. setTextureRepeat / invalidateTexture are no-ops.
const __wad_engine_stub = {
  createDataTexture(pixels, w, h, opts) {
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
        "  }\n"
        "  // Opt into per-frame overlay clear so menu pixels don't linger into the playing state\n"
        "  // (Three.js canvas autoclears in web; the RA 2D overlay buffer otherwise persists).\n"
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
