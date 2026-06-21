# Nova64 Hand-off (2026-06-21) — Video system + Multiplayer Phase 1

For Codex. This session shipped **cross-backend video** (fullscreen + in-world
"TV"), a **transcode tool + docs**, and started **multiplayer** (`nova64.net`)
with a verified Colyseus server. Companion notes:
`examples/indie-odyssey/HANDOFF.md`, `retroarch/HANDOFF.md`.

Source of truth for the two new subsystems:
- Video: [`docs/VIDEO_GUIDE.md`](docs/VIDEO_GUIDE.md)
- Multiplayer + identity: [`docs/MULTIPLAYER_AND_AUTH_DESIGN.md`](docs/MULTIPLAYER_AND_AUTH_DESIGN.md)

Mempalace: wing `nova64_runtime` drawer "nova64.video…" (full video reference),
diary topic `nova64-video` + `nova64-multiplayer` (this session, blow-by-blow).

---

## 1. Video — DONE across all backends

`nova64.video` now does **real video** everywhere (was web-only / a frame
slideshow at session start). Two modes:

### Fullscreen — `nova64.video.playFullscreen(url, opts)`
| Backend | How | Container |
|---|---|---|
| Web | HTML5 `<video>` overlay | `.mp4` |
| Godot | native `VideoStreamPlayer` | `.ogv` (Theora) |
| RetroArch | **pl_mpeg decoded in-core** | `.mpg` (MPEG1/MP2) |

- RetroArch decoder: vendored `retroarch/pl_mpeg.h`; C in
  `retroarch/nova64_libretro.c` (search `__novaVideoOpen` / `js_video_*`).
  Decoded frame → RGBA → blit into the 2D framebuffer (shown directly in
  software, composited over 3D in GLES). **MP2 audio** mixed in
  `audio_mix_frame` (gated on `plm_probe` + an actual audio stream).
- Cart contract: call `nova64.video._tick(dt)` in `update()` and `._draw()` in
  `draw()` (engine does not auto-drive). Always render a failure fallback on
  `{error:true}`.
- opts: `{ nativeUrl: <ogv, godot>, mpgUrl: <mpg, retroarch>, muted, onFinish }`.
- Demo: `examples/story-video-demo` (+ Godot/RetroArch cart copies).

### In-world texture (the "TV") — `nova64.video.loadTexture(url, opts)`
Handle: `{ applyToMesh(meshId), update(dt), isReady(), dispose() }`.
| Backend | How | Status |
|---|---|---|
| Web | THREE/BABYLON `VideoTexture` | ✅ |
| RetroArch | MPEG1 → GLES data texture, re-uploaded each frame (`glTexSubImage2D`), bound via `setMeshTexture` | ✅ **verified in GLES** |
| Godot | offscreen `VideoStreamPlayer` → `get_video_texture()` → material albedo | ✅ implemented; **user confirms in editor** |

- Demo: `examples/tv-demo` (a 3D television; synced into Godot project carts).
  Cart calls `tv.update(dt)` each frame (no-op on web/Godot, decodes on RetroArch).
- **Godot gotcha (fixed):** `get_video_texture()` is null until the first frame
  decodes. We bind **lazily** — `video.createTexture` returns the player;
  `video.getTexture(player)` is polled from the handle's `update()` until the
  texture resolves, then the material is built once. (Earlier eager fetch left
  a white square with working audio.) If it ever shows a *frozen* first frame,
  switch to a `SubViewport` + `ViewportTexture` (decode guaranteed) — the
  fallback is noted in the design/diary.

### Transcode tool — `scripts/transcode-video.py`
One source → `.mpg` (RetroArch) + `.ogv` (Godot) + optional `.mp4` (web),
letterboxed to 640×360; prints the `playFullscreen` snippet; warns on no audio.
`ffmpeg` required (`FFMPEG` env to point at a static build). Recipe baked in:
`mpeg1video -g 15 -bf 0 -b:v 1500k -r 24` + `mp2 -ar 44100 -ac 2`.

### pl_mpeg gotchas (cost real debugging — see diary)
1. `plm_frame_to_rgba` never writes the **alpha** byte → prime alpha=255 once or
   the alpha-blending blit renders frames transparent/black.
2. **Frame pacing:** track the displayed frame's PTS; only `plm_decode_video`
   while it's behind the clock, else you burn a 10s clip in ~4s.
3. **`plm_probe` up front** — stream counts read 0 lazily; enabling audio +
   `plm_decode_audio` on a video-only file scans to EOF and kills video.

### Assets / `.mp4` policy
- `*.mp4` is **gitignored + untracked** (web-only large sample; fetch/transcode
  locally). Native carts ship their own `.mpg`/`.ogv`.
- Demo clip is Big Buck Bunny **with audio** (public-domain; from
  `download.blender.org`). A no-audio source plays silent on all backends.

---

## 2. Multiplayer — Phase 1 STARTED (`nova64.net` + `nova64.auth`)

Full plan: [`docs/MULTIPLAYER_AND_AUTH_DESIGN.md`](docs/MULTIPLAYER_AND_AUTH_DESIGN.md).
Architecture: **one `colyseus.js` client + pluggable WebSocket transport** (browser
WS on web; bridge `net.*` over Godot `WebSocketPeer`, polled each frame).
**`nova64.auth`** is an extensible provider registry (OAuth/social via Supabase,
EVM wallet via SIWE later); auth mints a JWT that `nova64.net` hands to Colyseus
`onAuth`.

### Phase 0 decisions (LOCKED)
- Hosting: **self-host Docker** (dev `ws://localhost:2567`).
- Auth issuer: **Supabase Auth** (social/OAuth/JWT; Colyseus verifies its JWT
  directly). Wallet/SIWE is a thin custom step later. Kept behind the provider
  interface so it's swappable.
- First social provider: **Google**. Wallet: **EVM first**. Repo: **monorepo**.

### Done & VERIFIED this session
- `server/` — Colyseus server (plain JS, `defineTypes` schema, no TS).
  - `server/src/rooms/StateRoom.js` — generic authoritative room: `players`
    MapSchema (id/name/x/y/data) + `move`/`pos`/`set` intents + `*` relay.
  - `server/src/auth.js` — `onAuth` verifies a Supabase HS256 JWT when
    `NOVA64_SUPABASE_JWT_SECRET` is set; guests allowed in dev.
  - `server/src/index.js`, `server/test/sync.test.js`, `server/README.md`.
  - **`pnpm test` PASSES** headlessly: 2 colyseus.js clients join, see each
    other, a move replicates, names sync, relay delivers.

### Next for Codex (Phase 1 finish → Phase 2)
1. **`runtime/api-net.js`** — the web `nova64.net` facade over `colyseus.js`
   (`connect/joinOrCreate/leave`, `room.state.*.onAdd/onChange/onRemove`,
   `room.send/onMessage`, `isSupported`, `_tick` no-op on web). Wire it in
   **`src/main.js`** next to video/story: it imports `videoApi`/`storyApi` (~line
   40) and instantiates them (~line 162: `const storyInst = storyApi();`,
   `videoInst = videoApi(gpu)`) — add `netApi()` the same way, attach as
   `nova64.net`. Add `colyseus.js` to the **root** package.json deps.
2. **`runtime/api-auth.js`** — provider registry + `registerProvider`,
   `signIn/signOut/identity/token/onChange`; first provider = Supabase Google
   (web redirect/popup → access-token JWT). Needs the user's Supabase project +
   Google OAuth creds for a live test; until then the server's guest path works.
3. **`examples/multiplayer-lobby`** — sign in (or guest) → join `state` → render
   other players' avatars/cursors moving in realtime. The Phase 1 demo.
4. **Phase 2 (Godot):** bridge `net.connect/poll/send/close` over
   `WebSocketPeer`; shim WS object + `nova64.net._tick(dt)` pump; run colyseus.js
   in QuickJS. Godot OAuth via `OS.shell_open` + loopback `TCPServer`.
5. **RetroArch (later):** no in-core sockets — research the libretro
   `netpacket` interface (P2P/lockstep, not client-server). Separate spike;
   don't block web/Godot.

---

## 3. Build / run / verify recipes

All builds run under **WSL**. **Always use `pnpm`, never npm/yarn.**

```sh
# Node/pnpm in WSL (nvm node is NOT on a bare login PATH — add it like husky does):
export PATH="$HOME/.nvm/versions/node/v20.18.1/bin:$PATH"

# --- Multiplayer server ---
cd server && pnpm install && pnpm test     # headless 2-client sync proof
pnpm start                                 # ws://localhost:2567
#  ⚠ pnpm on /mnt/c (DrvFs) throws intermittent EACCES on atomic renames.
#    server/.npmrc sets node-linker=hoisted + package-import-method=copy to
#    minimize it; if install still trips on one package, just re-run pnpm install
#    (it's intermittent and completes — the test passed with one such warning).

# --- RetroArch core (WSL; clean when switching platforms) ---
cd retroarch
make platform=unix clean && make platform=unix -j4 && make harness   # Linux .so + harness
make platform=win-cross clean && make platform=win-cross -j4          # Windows DLL
cp nova64_libretro.dll /mnt/c/RetroArch-Win64/cores/                  # deploy (md5-verify; fails if RA running = file lock)
python3 retroarch/tools/package_example_cart.py <cart> --out-dir games
# headless GLES capture (Mesa EGL): NOVA64_GLES_TESTS=1 build/harness ./nova64_libretro.so games/<cart>.nova --gles --frames N --capture out.ppm
#   then tests/ppm_to_png.py out.ppm out.png ; compare orientation vs fullscreen
# conformance (batched): bash tests/run_conformance.sh --skip-build --from N --to M

# --- Godot GDExtension ---
cd nova64-godot/gdextension
scons platform=linux  target=template_debug -j4
scons platform=windows target=template_debug -j4
#   bin/*.so/.dll are GITIGNORED build artifacts (rebuilt locally; not committed).

# --- Web dev server (for visual checks; needs Chrome+vite, not headless here) ---
wsl ... pnpm exec vite --port 3000 --host    # then console.html?demo=<cart>
```

Git: commit via WSL + the nvm-PATH export (husky needs node); apostrophes in
`-F` messages are safe (use a file). Trunk-based: commits land on `main`,
nothing pushed.

---

## 4. Commits this session (newest first)
```
<server + handoff commit (this)>
0cd77cc docs(net): multiplayer + identity design (nova64.net + nova64.auth)
7f030e8 fix(godot): bind video texture lazily so the TV shows video, not white
82c8f40 feat(godot): in-world video texture (TV) via VideoStreamPlayer
3671150 feat(retroarch): in-world video texture (the TV) + tv-demo
9d1ac18 docs(video): cross-backend video guide + transcode tool + audio sample
a041943 feat(retroarch): real MPEG1 video via pl_mpeg (replaces frame slideshow)
2ccf456 feat(video): cross-backend story->video (Godot native + RetroArch frames)
```

## 5. Open items
- Godot **TV** + Godot **fullscreen** video: implemented, **need a live editor
  run** to confirm (no headless Godot here). White-square already fixed; watch
  for a *frozen* frame → SubViewport fallback.
- Multiplayer: `api-net.js` / `api-auth.js` / `multiplayer-lobby` not yet
  written (next). Supabase + Google creds needed for a real auth test.
- RetroArch in-world video model dirties one frame of white before first decode
  (acceptable). RetroArch multiplayer is unsolved by design (no sockets).
