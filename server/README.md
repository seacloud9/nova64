# nova64-server

Colyseus multiplayer server backing [`nova64.net`](../docs/MULTIPLAYER_AND_AUTH_DESIGN.md).
Phase 1 ships the generic **StateRoom** (presence + position + message relay).

## Run (dev)

```sh
pnpm install
pnpm start            # ws://localhost:2567  (room: "state")
```

Guests are allowed by default in dev. To require auth, set
`NOVA64_ALLOW_GUEST=0` and a `NOVA64_SUPABASE_JWT_SECRET` (the Supabase project
JWT secret); Colyseus then verifies the session JWT on join.

| env | meaning |
|---|---|
| `PORT` | listen port (default 2567) |
| `NOVA64_SUPABASE_JWT_SECRET` | HS256 secret — when set, tokens are verified |
| `NOVA64_ALLOW_GUEST=0` | require a token (default: guests allowed) |
| `NOVA64_REQUIRE_VERIFIED=1` | refuse to run without a JWT secret (prod guard) |

## Test (headless)

```sh
pnpm test            # boots the server + 2 clients, asserts state sync
```

The cart-facing client is [`runtime/api-net.js`](../runtime/api-net.js)
(`nova64.net`). See the design doc for the full architecture and roadmap.
