# Nova64 WASM core (RetroArch web)

The libretro core in `nova64_libretro.c` also builds for WebAssembly so it can
run inside RetroArch's web player. It is the same C source as the native core.
The only difference is which GL context it asks for (see below).

Roadmap: `ROADMAP.md` → Phase 4b.

## Build the core

You need Emscripten. Docker is the easiest way to get it:

```sh
docker run --rm -v "$PWD":/src -w /src/retroarch emscripten/emsdk:3.1.74 \
  emmake make platform=emscripten OBJDIR=build-emscripten -j8
```

Output: `retroarch/nova64_libretro_emscripten.a`, a static library, which is
the format RetroArch's web build expects. CI builds it in
`.github/workflows/wasm-core.yml` and attaches it to `v*` releases.

## Link it into RetroArch web

```sh
git clone --depth 1 --branch v1.21.0 https://github.com/libretro/RetroArch.git
cp retroarch/nova64_libretro_emscripten.a RetroArch/libretro_emscripten.a
cd RetroArch
emmake make -f Makefile.emscripten LIBRETRO=nova64 HAVE_OPENGLES3=1 -j8
```

This produces `nova64_libretro.js` and `nova64_libretro.wasm`. Serve them with
RetroArch's web player files from `pkg/emscripten/libretro/`, then load a `.js`
or `.nova` cart. Select the `webgl2` video driver.

## How the web build differs

| Area       | Native            | Web (`EMSCRIPTEN`)                             |
| ---------- | ----------------- | ---------------------------------------------- |
| GL context | OpenGL 3.3 Core   | OpenGL ES 3.0 (WebGL2)                         |
| Shaders    | `#version 300 es` | unchanged                                      |
| zlib       | system `-lz`      | `-sUSE_ZLIB=1` port                            |
| Threads    | none              | none (no SharedArrayBuffer / COOP-COEP needed) |

HDR bloom renders into `RGBA16F` targets. Browsers without
`EXT_color_buffer_float` fail the framebuffer completeness check, and the core
then turns post effects off, the same as it does on native drivers.

## Status

- [x] Builds with `platform=emscripten`; exports the libretro entry points
- [x] Requests a GLES 3.0 context when built for the web
- [x] Built in CI and attached to releases
- [x] Linked into the bundled RetroArch web player and exercised in Chromium
- [x] Docker build path works on macOS (`pnpm build:retroarch-web`)
- [ ] Conformance carts diffed against native output in headless Chromium
- [ ] Performance check on heavy carts (QuickJS has no JIT in WASM)
