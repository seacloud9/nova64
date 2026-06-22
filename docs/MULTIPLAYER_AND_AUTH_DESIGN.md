# Nova64 Multiplayer + Identity Design (`nova64.net` + `nova64.auth`)

Status: **design / phased plan** — nothing implemented yet. This document is the
plan we execute against.

Two new cart-facing namespaces:

- **`nova64.net`** — realtime multiplayer over [Colyseus](https://colyseus.io)
  (authoritative rooms, schema state sync, messages). Targets **web + Godot**
  first; RetroArch is a later, separate model (see [§7](#7-retroarch-later)).
- **`nova64.auth`** — an **extensible identity** layer: OAuth/OIDC (social +
  generic JWT) and crypto wallet sign-in, behind a pluggable provider registry.
  Auth issues the JWT that `nova64.net` presents when joining a room.

They are designed together because **auth gates net**: a player authenticates
once via `nova64.auth`, and the resulting token authorizes room joins.

Related: [VIDEO_GUIDE.md](VIDEO_GUIDE.md) (the same "one cart API, per-backend
host implementation" pattern), [GODOT_HOST_CONTRACT.md](GODOT_HOST_CONTRACT.md),
[api-improvements.md](api-improvements.md).

---

## 1. Goals & non-goals

**Goals**
- One cart API that runs the same multiplayer cart on **web and Godot**.
- Authoritative server (anti-cheat-friendly); clients send intents, server owns
  state and broadcasts patches.
- Pluggable identity: social login, generic OAuth2/OIDC → JWT, and crypto
  wallet (EVM Sign-In-With-Ethereum) — **extensible** so new ID methods drop in.
- Graceful degradation: a cart that calls `nova64.net`/`nova64.auth` on a host
  that lacks them gets a clean "unsupported" result, never a crash (same
  contract as `nova64.video`).

**Non-goals (initially)**
- Cart-authored server game logic (carts shipping sandboxed server code). v1
  uses generic server room types; cart-defined server logic is a later phase.
- P2P / rollback netcode. We are client–server. (RetroArch may force a different
  model — see §7.)
- Being an identity provider of record. We **broker** existing IdPs and wallets
  and mint our own short-lived session JWT.

---

## 2. Architecture overview

```
   Cart (init/update/draw)
        │  nova64.net / nova64.auth   (identical API on every backend)
        ▼
   ┌─────────────────────────────────────────────────────────┐
   │  Nova64 runtime shim (JS)                                 │
   │   - colyseus.js client (schema decode, room protocol)     │
   │   - auth provider registry                                │
   │   - pluggable transport seam ───────────────┐             │
   └──────────────────────────────────────────────┼───────────┘
            web │                          Godot   │
                ▼                                  ▼
        browser WebSocket             bridge: net.* over Godot WebSocketPeer
        window.ethereum (wallet)      OS.shell_open + loopback (OAuth)
                │                                  │
                └──────────────┬───────────────────┘
                               ▼
              ┌──────────────────────────────────┐
              │  nova64-server (Node)             │
              │   - Colyseus rooms (@schema)      │
              │   - onAuth: verify session JWT    │
              │  nova64-auth (Node)               │
              │   - OAuth code exchange → JWT     │
              │   - wallet nonce/verify (SIWE)→JWT│
              └──────────────────────────────────┘
```

**Key decision — one JS client, two transports.** `colyseus.js` and
`@colyseus/schema` are pure JS and run in both the browser and Godot's QuickJS.
The only backend-specific piece is the **WebSocket transport**:

- **Web** uses the browser's event-driven `WebSocket`.
- **Godot** has no JS WebSocket, but the host does (`WebSocketPeer`). The bridge
  exposes `net.connect / net.poll / net.send / net.close`; the shim wraps these
  in a `WebSocket`-shaped object and **pumps `net.poll` every frame** via
  `nova64.net._tick(dt)` (the same per-frame-pump contract as `nova64.video`).

This keeps the room protocol and schema decoding in **one** codebase **on web**
(verified — the web lobby works end to end).

> **Phase 2 Godot — revised (2026-06-22).** The "run colyseus.js in QuickJS"
> idea proved **costly**: the published colyseus.js bundles (node and the
> `colyseus-cocos-creator` engine build) drag in `ws`/`Buffer`/`process`
> internals (`isUtf8`, etc.) that don't run in a bare QuickJS sandbox (verified
> via a sandbox test). Making it work needs a **custom browser-clean rollup of
> colyseus.js's browser entry + Buffer/TextEncoder/process polyfills** — a real
> bundling effort.
>
> **The cleaner path (recommended) is the official Colyseus Godot SDK**
> (https://docs.colyseus.io/getting-started/godot) — a native GDExtension addon
> (GDScript, beta) that already speaks the protocol + schema over WebSockets.
> Integration shape for Nova64: the Godot host drives the native client and the
> bridge exposes the same `nova64.net` surface to the JS cart — `net.join`,
> per-frame `net.poll` returning state diffs (player add/change/remove) +
> inbound messages, and `net.send`. The cart code stays identical to web; only
> the Godot host's net implementation differs (native client instead of a JS
> WebSocket). Trade-off: a C++/GDScript ↔ QuickJS marshaling layer for state
> callbacks, vs. the colyseus.js-bundling effort. **Decision pending a green
> light** (this needs Godot-side testing, which can't be done headlessly here).

---

## 3. `nova64.net` — cart API

Modeled closely on `colyseus.js` so it's familiar and thin:

```js
// 1) connect (token comes from nova64.auth; optional for guest/dev)
await nova64.net.connect({ url: 'wss://play.nova64.dev', token: nova64.auth.token() });

// 2) join a room (joinOrCreate | create | join | joinById)
const room = await nova64.net.joinOrCreate('arena', { name: 'IO', skin: 3 });

// 3) authoritative state (server-owned). Schema add/remove/change callbacks:
room.state.players.onAdd((p, id) => spawnAvatar(id, p));
room.state.players.onRemove((p, id) => despawn(id));
room.state.players.onChange((p, id) => moveAvatar(id, p.x, p.y));

// 4) messages (client → server intents, server → client events)
room.send('move', { dx, dy });
room.onMessage('hit', e => flash(e.target));

// 5) lifecycle
room.sessionId;                       // this client's id in the room
room.onLeave(code => toLobby());
room.onError((code, msg) => toast(msg));
nova64.net.leave();                   // leave current room
nova64.net.isSupported();             // false on hosts without net
```

**Per-frame pump (native):** carts call `nova64.net._tick(dt)` in `update()` (no-op
on web, drives the Godot transport poll). The reference helpers (`nova64.level`
etc.) and a `multiplayer-demo` cart will model this.

**Helpers we ship on top** (reduce per-cart boilerplate):
- `nova64.net.interpolate(entity, state, dt)` — smoothing for remote actors.
- `nova64.net.onPresence(cb)` / room player list convenience.
- `nova64.net.reconnect()` with backoff + session resume token.

---

## 4. The server — `nova64-server` (Colyseus)

A Node project (new top-level `server/` or repo) running Colyseus.

**Room model (phased):**
- **Phase 1 — `RelayRoom` / `StateRoom` (generic).** A schema with
  `players: MapSchema<Player>` (id, name, x, y, custom blob) plus a typed
  message relay. Carts get presence + position sync + chat/events with **zero
  server code**. Authoritative enough for casual play (server validates rate +
  bounds); not cheat-proof for competitive.
- **Phase 4 — typed/authoritative rooms.** Named room types with real
  server-side rules (movement validation, hit detection, scoring), selected by
  the cart via room name. Either built-in game templates or, later, a vetted
  cart-server module system (sandboxed) — explicitly a later decision.

**Auth hook:** `onAuth(client, options)` verifies the `options.token` (session
JWT from `nova64-auth`) — signature, expiry, audience. Rejects on failure;
attaches `{ userId, displayName, provider }` to the client. Guest mode (no token)
is allowed in dev / for public rooms, gated by config.

**Hosting:** self-host (Docker) or Colyseus Cloud — a Phase 0 decision (§9).

---

## 5. `nova64.auth` — extensible identity

### 5.1 Cart API

```js
// sign in with a provider (returns a session)
const s = await nova64.auth.signIn('google');                  // social preset
const s = await nova64.auth.signIn('oauth', {                  // generic OIDC
  issuer: 'https://id.example.com', clientId: '...', scopes: ['openid','profile'],
});
const s = await nova64.auth.signIn('wallet');                  // EVM SIWE

nova64.auth.signOut();
const me = nova64.auth.identity();   // unified profile (below) or null
const jwt = nova64.auth.token();     // session JWT for nova64.net.connect
nova64.auth.onChange(session => updateHud(session));
await nova64.auth.restore();         // silent resume from stored token

// EXTENSIBILITY — register a custom provider
nova64.auth.registerProvider('steam', mySteamProvider);
```

### 5.2 Unified identity model

```ts
type Identity = {
  id: string;            // stable, provider-namespaced: "google:1234", "wallet:0xabc…"
  provider: string;      // "google" | "discord" | "oauth" | "wallet" | custom
  displayName: string;
  avatar?: string;       // URL or data URI
  address?: string;      // wallet address when provider is crypto
  claims: object;        // verified JWT claims / profile
  token: string;         // session JWT (short-lived) for the server
};
```

A **stable, provider-namespaced `id`** lets the same human link multiple methods
later (account linking is a future claim on the server). The server is the
source of truth for `userId`; the client identity mirrors it.

### 5.3 Provider interface (the extensibility seam)

```ts
interface AuthProvider {
  name: string;
  signIn(opts?): Promise<Session>;   // run the flow, return identity + token
  restore?(): Promise<Session|null>; // silent re-auth from stored refresh/token
  signOut?(): Promise<void>;
}
```

Built-in providers:
- **`oauth`** — generic OAuth2 + OIDC (Authorization Code + PKCE). The browser
  side does the redirect/popup; the **code exchange and JWT minting happen in
  `nova64-auth` (server)** so client secrets never ship in a cart.
- **`social`** — thin presets (`google`, `discord`, `github`, …) configured on
  top of `oauth`.
- **`wallet`** — EVM **Sign-In-With-Ethereum** (EIP-4361): server issues a
  nonce → wallet signs → server verifies the signature and mints a session JWT.
  `id = "wallet:<address>"`. Extensible to other chains (Solana `signMessage`,
  etc.) behind the same provider seam.

### 5.4 JWT / session

`nova64-auth` mints a **short-lived session JWT** (e.g. 15 min) + a refresh
token. The session JWT is what `nova64.net` presents to Colyseus `onAuth`.
Algorithm RS256 (server holds the private key; Colyseus verifies with the public
key). Claims: `sub` (userId), `provider`, `name`, `iat/exp/aud/iss`.

---

## 6. Per-backend matrix

| | Web | Godot | RetroArch |
|---|---|---|---|
| **net transport** | browser `WebSocket` | bridge `net.*` over `WebSocketPeer` (poll each frame) | none in-core → §7 |
| **net protocol** | colyseus.js (shared) | colyseus.js in QuickJS (shared) | — |
| **OAuth flow** | popup/redirect | `OS.shell_open` + loopback `TCPServer` (or custom URI scheme) to catch the redirect | Device Code grant (RFC 8628): show code+URL, poll |
| **wallet** | `window.ethereum` (EIP-1193) SIWE | WalletConnect (QR / deep link) | out of scope (no secure signer) |
| **token storage** | `localStorage` (or cookie) | `user://` encrypted store | core save storage (if pursued) |

The cart code is identical; only these host mechanisms differ, hidden behind the
shim + bridge.

---

## 7. RetroArch (later)

The libretro core has **no general socket API**, so standard client–server
Colyseus is not reachable from inside the core. Options to research as a
**separate phase** (not blocking web/Godot):

1. **libretro netpacket interface**
   (`RETRO_ENVIRONMENT_SET_NETPACKET_INTERFACE`). The frontend moves packets
   between peers for netplay. This is **P2P / lockstep-flavored**, not
   client-server — it could carry a custom rollback protocol but does **not**
   map onto Colyseus rooms. Best fit for deterministic head-to-head, not a live
   authoritative MMO-style room.
2. **Frontend-assisted socket bridge** — a non-standard environment callback /
   custom RetroArch build that proxies a WebSocket to the core. Powerful but
   forks the frontend; portability cost is high.
3. **Async / turn-based via HTTP** — if a future core gains an HTTP fetch hook
   (frontend-mediated), turn-based or lobby features work even without realtime
   sockets.

Recommendation: treat RetroArch multiplayer as a **research spike** after web +
Godot ship, most likely landing as **netpacket-based rollback for 1v1/local-style
carts**, with realtime authoritative rooms staying web/Godot only. Document the
decision; don't block the main line.

---

## 8. Security & ops considerations

- **Authoritative state**: clients send intents, never trusted positions; the
  server validates and owns state. Even the Phase-1 generic room enforces
  rate-limits and value bounds.
- **Secrets**: OAuth client secrets + JWT signing keys live **only** in
  `nova64-auth`, never in a cart or the bundle.
- **PKCE** for all OAuth; **short-lived** session JWTs + refresh rotation.
- **SIWE** nonce is single-use and server-issued; verify domain + expiry.
- **Transport**: `wss://` only in production; CORS/origin allow-list on auth.
- **Abuse**: room join rate limits, per-IP caps, message size/throughput caps.
- **Privacy**: store the minimum profile; let players play as guests where the
  cart allows.

---

## 9. Decisions (Phase 0)

**Locked (2026-06-21):**
- **Hosting:** self-host locally via Docker for dev (`ws://localhost:2567`).
- **Auth issuer:** **Supabase Auth** for social/OAuth/JWT (self-hostable, issues
  a standard JWT that Colyseus `onAuth` verifies directly — no separate
  session-minting service needed for OAuth). Wallet/SIWE is a thin custom step
  that mints a Supabase-compatible session. `nova64.auth` keeps Supabase behind
  the provider interface so it stays swappable.
- **First social provider:** **Google** (via Supabase).
- **Wallet scope:** EVM-only first (SIWE), Solana later behind the same seam.
- **Repo layout:** monorepo (`/server`).
- **v1 room model:** generic `StateRoom` (presence + position + relay).

Still open (revisit before public deploy): production hosting, refresh-token
rotation specifics, account-linking across providers.

### Original option analysis

1. **Server hosting**: self-host (Docker on a VPS) vs **Colyseus Cloud**.
   *Recommendation: self-host a single small instance for dev; revisit for prod.*
2. **Auth issuer**: roll our own `nova64-auth` (full control, more work) vs a
   managed broker (Auth0 / Clerk / Supabase Auth / Logto) that already does
   social + JWT, with us adding wallet. *Recommendation: managed broker for
   social/OAuth to move fast; our own thin service only for the wallet/SIWE
   flow + session minting. Logto/Supabase are self-hostable + support custom
   flows.*
3. **First social provider** to wire end-to-end (Discord and Google are easiest
   for games). *Recommendation: Discord.*
4. **Wallet scope**: EVM-only at first (SIWE) vs EVM+Solana. *Recommendation:
   EVM first, Solana behind the same provider seam later.*
5. **Repo layout**: server in this monorepo (`/server`, `/auth`) vs a separate
   repo. *Recommendation: monorepo for now.*
6. **Room model for v1**: confirm the generic `StateRoom` (presence + position +
   relay) is enough for the first demo.

---

## 10. Phased roadmap

Each phase ends with a runnable demo + verification.

### Phase 0 — Foundations & decisions
- Resolve §9 decisions. Stand up an empty `nova64-server` (Colyseus) + a
  `nova64-auth` stub. Pick hosting. Define the session-JWT shape.
- **Deliverable:** empty server boots locally; a `wss` echo room; this doc's
  decisions filled in.

### Phase 1 — `nova64.net` on web + minimal auth
- `runtime/api-net.js`: colyseus.js facade (connect/join/state/messages/leave),
  `nova64.net.isSupported()`, web `WebSocket` transport.
- `nova64-server`: generic `StateRoom` (players MapSchema + relay) with
  `onAuth` verifying the session JWT (guest allowed in dev).
- `nova64-auth`: **one** social provider end-to-end (per §9.3) → session JWT;
  `runtime/api-auth.js` with `signIn/signOut/identity/token/onChange` + the
  provider registry + `registerProvider`.
- **Demo:** `examples/multiplayer-lobby` — sign in, join a room, see other
  players' cursors/avatars move in realtime (web). 
- **Verify:** two browser tabs sync; bad/no token is rejected per config.

### Phase 2 — `nova64.net` + auth on Godot
- Bridge `net.connect/poll/send/close` over Godot `WebSocketPeer`; shim
  `WebSocket` shim + `nova64.net._tick(dt)` pump. colyseus.js runs in QuickJS.
- Godot OAuth: `OS.shell_open` + loopback `TCPServer` capture → bridge → token;
  `user://` token storage.
- **Demo:** the **same** `multiplayer-lobby` cart runs cross-play web ↔ Godot.
- **Verify:** a Godot client and a browser client share a room (manual run on
  Godot; web verified as in Phase 1).

### Phase 3 — Wallet + provider extensibility
- `wallet` provider: web `window.ethereum` SIWE; `nova64-auth` nonce/verify →
  JWT; `id = wallet:0x…`. Godot wallet via WalletConnect (QR).
- Finalize `registerProvider` extensibility + docs + a custom-provider example.
- More social presets (Google/GitHub) on the `oauth` base.
- **Demo:** wallet sign-in joins the lobby; a third-party provider registered by
  a cart works.

### Phase 4 — Hardening & authoritative rooms
- Reconnection + resume tokens, interpolation helper, server-side movement/hit
  validation, rate limiting, basic anti-cheat, metrics.
- Optional: typed room templates (e.g. `arena`, `race`) with real server rules.
- **Demo:** a small authoritative game cart (e.g. tag / air-hockey).

### Phase 5 — RetroArch research spike
- Prototype the libretro **netpacket** path (§7) for a deterministic 1v1 cart;
  document feasibility + the decision on realtime vs turn-based for the core.

---

## 11. Proposed repo layout

```
server/                 # Colyseus (nova64-server)
  src/rooms/StateRoom.ts
  src/auth/verify.ts     # session-JWT verification (onAuth)
auth/                    # nova64-auth (or config for a managed broker)
  src/oauth/…            # code exchange + JWT minting
  src/wallet/siwe.ts     # nonce + verify
runtime/api-net.js       # nova64.net facade (colyseus.js + transport seam)
runtime/api-auth.js      # nova64.auth registry + providers
nova64-godot/gdextension/src/bridge.cpp   # net.* (WebSocketPeer), auth helpers
examples/multiplayer-lobby/               # the cross-backend demo cart
docs/MULTIPLAYER_AND_AUTH_DESIGN.md        # this doc
```

---

To **start**: answer the Phase 0 decisions in §9 (especially hosting + auth
issuer + first social provider), and I'll build Phase 1 (web `nova64.net` + the
generic `StateRoom` + one-provider `nova64.auth` + the lobby demo).
