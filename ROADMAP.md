# Nova64 Roadmap

## Purpose

This roadmap captures the next major platform and networking directions for Nova64.

Two tracks matter most:

- expand Nova64 beyond the current Three.js-first runtime into portable host and renderer backends
- add a follow-up realtime stack for multiplayer, presence, chat, and RTC-enabled social experiences

The sequencing matters. Nova64 should first harden its runtime boundary, then add host and renderer targets, then layer in authoritative networking and realtime communication.

## Product Direction

Nova64 is moving toward a portable runtime model where the same gameplay-facing API can target:

- browser-native rendering backends
- native host bridges for mobile and desktop engines
- realtime multiplayer backends for social and game experiences

The near-term platform priorities are:

- Babylon.js support
- Godot host support
- RetroArch core support with `.nova` packages
- Unity host support
- Colyseus-based realtime multiplayer
- WebRTC-based realtime communication for voice and media where needed

## Guiding Principles

- one stable cart-facing API
- host and renderer backends hidden behind explicit adapters
- no arbitrary native code execution from carts
- server-authoritative multiplayer for shared game state
- WebRTC for media and low-latency communication, not game authority
- guest-first UX for social and multiplayer experiences
- mobile viability as a core constraint, not an afterthought

## Current State

Nova64 already has a useful seam in `runtime/engine-adapter.js`.

Current progress:

- pluggable engine adapter introduced
- Unity bridge scaffold added
- public adapter exports and typings added
- initial tests for bridge marshaling and backend switching added
- Unity bridge architecture documented in `docs/UNITY_BRIDGE_ARCHITECTURE.md`

That means the repo is ready for phased backend work instead of one large rewrite.

## Roadmap Overview

### Phase 1: Stabilize the Backend Contract

Goal:

Make the Nova64 runtime boundary explicit, versioned, and testable before adding more backends.

Deliverables:

- formal adapter contract for materials, textures, geometry, transforms, camera, lights, input, audio, and asset loading
- command-buffer model for host bridges
- backend capability reporting so carts can feature-detect optional systems
- shared conformance tests that every backend must pass
- clear separation between cart API, renderer API, and native host API

Exit criteria:

- the adapter surface is documented and versioned
- backend-specific behavior is covered by conformance tests
- new backends can be added without changing cart code

### Phase 2: Babylon.js Support

Goal:

Add a second browser-native renderer backend to prove Nova64 is not tightly coupled to Three.js.

Why Babylon first:

- it stays in the browser deployment model
- it exercises renderer portability without introducing a native host at the same time
- it gives a clearer comparison between engine abstractions and rendering abstractions

Scope:

- Babylon renderer adapter for scene, mesh, camera, materials, lights, and textures
- Babylon-backed implementations for the engine adapter surface
- compatibility layer for core Nova64 3D primitives and transforms
- backend smoke demos and performance comparisons against Three.js

Non-goals for this phase:

- full parity for every advanced Three.js-specific effect on day one
- TSL feature parity
- native packaging

Exit criteria:

- representative Nova64 example carts run on Babylon with no cart API changes
- adapter conformance suite passes for Babylon
- documented list of supported and unsupported features exists

### Phase 3: Godot Support

Goal:

Use Godot as the first native host backend for Nova64, targeting both desktop (Windows, macOS, Linux) and mobile (iOS, Android) shipping. Godot is sequenced before Unity because GDExtension's C API maps cleanly onto an embedded JS runtime (QuickJS), and Godot's single open export pipeline reduces per-platform plugin friction.

Architecture:

- Nova64 JS owns game logic, executed inside an embedded QuickJS runtime
- Godot owns rendering, audio, input, lifecycle, packaging, and platform services
- JS communicates through the existing Nova64 engine-adapter command protocol (handle-based, command-buffered, whitelist-driven)
- No arbitrary GDScript or C# evaluation from carts

Phase 3 Todo:

- [ ] Spike: build a minimal GDExtension that links QuickJS and exposes a `nova64_call(method, payloadJson)` entry point
- [ ] Define the Godot-side host contract mirroring `runtime/engine-adapter.js` method names (`material.create`, `texture.*`, `geometry.createPlane`, `mesh.setMaterial`, `camera.getPosition`, `transform.*`, `input.poll`, `audio.play`)
- [ ] Implement handle allocator and lifecycle tracker on the Godot side (meshes, materials, textures, cameras, audio sources)
- [ ] Implement command-buffer flush phase aligned to Godot's `_process` / `_physics_process` lifecycle
- [ ] Wire the Nova64 cart `init/update/draw` lifecycle into Godot's process callbacks
- [ ] Bundle Nova64 runtime JS as an asset loaded into QuickJS at boot
- [ ] Port one example cart end-to-end (recommended: a small example from `examples/` with no advanced TSL/PBR features)
- [ ] Capability reporting: surface which adapter methods Godot host supports vs. stubs
- [ ] Conformance test harness: run shared adapter conformance suite against the Godot host
- [ ] Desktop export proof on Windows, macOS, Linux
- [ ] Mobile export proof on iOS and Android, including bridge latency and frame-cost measurements
- [ ] Document Godot host contract, supported methods, capability matrix, and known divergences

Scope:

- Godot transport layer for Nova64 host commands via GDExtension + QuickJS
- resource-handle model for meshes, materials, textures, cameras, and audio sources
- transform and scene update flow compatible with the existing adapter contract
- input polling and audio playback through Godot's native systems
- desktop-first packaging, then mobile packaging proof

Non-goals for this phase:

- arbitrary GDScript/C# eval from JS
- mirroring the entire Godot scene tree into JS
- custom shaders authored in Godot's shading language from cart code
- feature parity with every Three.js or Babylon-specific effect

Exit criteria:

- at least one Nova64 sample cart runs end-to-end through the Godot host with native rendering
- the Godot host passes the shared adapter conformance suite for the supported method set
- desktop (Windows/macOS/Linux) and at least one mobile target (iOS or Android) produce shippable builds
- bridge latency and frame cost are measured on a representative mobile device
- Godot host contract is documented and versioned

### Phase 4: RetroArch Core Support

Goal:

Add a Nova64 RetroArch/libretro core after the Godot implementation proves the embedded QuickJS host model, but before Unity broadens the native engine path. RetroArch should validate Nova64 as a small fantasy-console runtime with a portable `.nova` distribution format, deterministic core lifecycle, and native backend APIs.

Architecture:

- Nova64 JS owns cart logic, executed inside an embedded QuickJS runtime
- RetroArch owns frontend lifecycle, video presentation, audio callbacks, input polling, save states, and platform integration
- `.nova` packages provide distributable carts containing `code.js`, optional metadata, and assets
- Plain `.js` carts remain supported for development and smoke tests
- The core implements Nova64 APIs natively through compact renderer, input, audio, storage, and package-loader subsystems
- Three.js and Babylon.js do not run inside RetroArch

Scope:

- CLI package workflow for `nova64 pack <project> --out game.nova` and `nova64 inspect game.nova`
- `.nova` package parser with path validation, manifest metadata, file hashes, and useful malformed-package errors
- QuickJS ES module loading with cached `init`, `update(dt)`, and `draw` exports
- 2D framebuffer API first: clear, pixels, lines, rectangles, text smoke support, and deterministic framebuffer checksums
- RetroArch joypad mapping into Nova64 `btn` and `btnp`
- versioned save-state format with stable size checks
- staged native 3D command bridge after lifecycle, input, package loading, and framebuffer tests pass
- WSL/Linux desktop first, then macOS, Windows, Raspberry Pi, and Steam Deck validation

Non-goals for this phase:

- embedding a browser engine
- claiming browser renderer parity on day one
- making `.nova` a new source language or cart programming model
- porting large demos before small conformance carts pass
- unversioned save-state blobs

Exit criteria:

- `retroarch/RETROARCH_CORE_PLAN.md` stays current as the implementation roadmap
- CLI can pack, inspect, and reject `.nova` packages through automated tests
- the libretro core loads both plain `.js` and `.nova` carts
- lifecycle calls occur in order: `init`, then per-frame `update(dt)`, then `draw`
- input mapping, framebuffer output, and save-state versioning have deterministic smoke tests
- the core builds on WSL/Linux and launches a sample cart through RetroArch

### Phase 5: Unity Support

Goal:

Add Unity as a second native engine host backend after Godot has validated the shared host-bridge contract and RetroArch has validated the compact `.nova` package/runtime path. Unity broadens reach to teams already invested in the Unity ecosystem and provides a battle-tested mobile distribution path.

Architecture:

- JS remains the game-logic layer
- Unity owns rendering, audio, input, lifecycle, packaging, and platform services
- JS communicates through the same controlled host API used by the Godot host
- transport on Unity goes JS (QuickJS) <-> native plugin (C) <-> C# P/Invoke <-> Unity

Scope:

- native plugin embedding QuickJS for iOS, Android, Windows, macOS, Linux
- C# bridge layer implementing the Nova64 host contract validated in Phase 3
- handle allocation and resource lifecycle tracking
- transforms, mesh creation, camera control, audio, and input polling
- prefab and asset-loading hooks after core runtime flow is proven
- mobile packaging proof on iOS/Android through Unity

Non-goals for this phase:

- unrestricted Unity API access
- arbitrary C# eval
- mirroring Unity objects into JS
- duplicating any host-contract decisions already settled in Phase 3

Exit criteria:

- at least one Nova64 sample runs through the Unity host with native rendering
- the Unity host passes the shared adapter conformance suite for the supported method set
- bridge latency and frame cost are measured on a mobile target and compared against the Godot host
- Unity host contract is documented and versioned, with explicit notes on differences from the Godot host

## Realtime Follow-Up Plan

After the backend foundation is stable, the next strategic layer is realtime multiplayer and communication.

The shared planning discussion points toward a clean split:

- Colyseus for authoritative multiplayer state, rooms, matchmaking, presence, and reliable gameplay events
- WebRTC for voice, livestream, or direct media-style communication where appropriate

Nova64 should not begin with WebRTC as the primary gameplay authority layer.

## Realtime Architecture Direction

### Use Colyseus For

- room management
- player presence
- authoritative game state
- matchmaking and room discovery
- chat events and interaction events
- scores, tickets, rewards, and synchronized interactables
- moderation and room controls

### Use WebRTC / RTC For

- proximity voice chat
- small-group voice rooms
- optional livestream/event audio or video
- direct media sessions where low-latency media matters more than authoritative state

### Do Not Use WebRTC As

- the primary source of truth for world state
- the persistence layer
- the moderation authority
- the only networking primitive for large shared rooms

## Realtime Roadmap

### Realtime Phase A: Multiplayer Foundation

Goal:

Add authoritative multiplayer without adding voice or crypto complexity.

Scope:

- Node.js + Colyseus server
- room types for lobby, shared world, minigame, and private sessions
- guest authentication and reconnection flow
- player transform sync with interpolation
- reliable interaction events and score submission
- text chat and presence
- moderation basics

Suggested room model:

- `LobbyRoom`
- `WorldRoom`
- `GameRoom`
- `PrivateRoom`
- `EventRoom`

Suggested state owned by the server:

- player id
- display name
- avatar id
- position and rotation
- emote or animation state
- room membership
- interaction state
- score/session rewards
- moderation flags

Exit criteria:

- 8 to 16 players stable in a shared room
- gameplay-critical interactions are server-authoritative
- reconnect and room rejoin flows work predictably

### Realtime Phase B: Social Shell

Goal:

Turn multiplayer into a usable social runtime, not just transform sync.

Scope:

- persistent profiles
- room browser and invitations
- announcements and events
- leaderboards
- creator showcases or cabinets
- friend/presence indicators

Exit criteria:

- users can discover rooms, chat, and interact with shared content reliably
- moderation tools are usable in a live test

### Realtime Phase C: RTC / Voice Layer

Goal:

Add realtime communication for voice and live event presence without destabilizing the core multiplayer model.

Scope:

- WebRTC signaling coordinated through the Colyseus or gateway layer
- proximity voice in shared spaces
- push-to-talk or voice-off-by-default for public rooms
- small-group voice sessions for private rooms or parties
- event-room broadcast path if live showcases are a target

Important constraints:

- default voice should be conservative for moderation reasons
- mobile battery and CPU cost must be measured
- room-size limits should apply to RTC participation

Exit criteria:

- proximity voice works in a controlled room size
- moderation controls exist for mute/block/report
- mobile test devices remain within acceptable performance budgets

### Realtime Phase D: Optional Social/Economy Extensions

Goal:

Layer optional badges, rewards, or commerce-like features only after the realtime social product works.

Scope:

- event badges
- tournament rewards
- creator support or tipping hooks
- optional wallet attach only if product demand exists

This should remain additive and off the critical gameplay path.

## Technical Recommendations For The Realtime Stack

- TypeScript for the server and shared schemas
- Colyseus as the room server
- Express or Fastify for HTTP APIs
- Postgres for production persistence once the feature set justifies it
- SQLite for local development or embedded demo environments
- Redis only when presence, matchmaking, or rate limiting actually require it
- structured logs, room metrics, and replayable event traces from the start

## Suggested Sequencing

Recommended order:

1. stabilize adapter contract
2. add Babylon renderer backend
3. complete Godot host MVP (desktop + mobile proof)
4. complete RetroArch core MVP with `.nova` packaging and QuickJS lifecycle
5. complete Unity host MVP, reusing the host contract validated by Godot
6. add Colyseus multiplayer foundation
7. add RTC voice/media layer
8. add optional social/economy extensions later

This order reduces risk because it avoids solving host portability, authoritative multiplayer, and media networking all at once.

## Major Risks

- backend sprawl before the adapter contract is stable
- overfitting the API to Three.js internals
- adding Unity/Godot-specific concepts into the cart API
- trying to build Babylon, Godot, RetroArch, Unity, Colyseus, and RTC simultaneously
- chatty bridge traffic on mobile devices
- weak moderation posture for voice features
- using WebRTC where authoritative state sync is needed

## Risk Mitigations

- keep one stable cart API and move complexity behind adapters
- require backend conformance tests
- keep realtime state server-authoritative through Colyseus
- treat RTC as a later layer for voice/media, not core state
- enforce command buffering and explicit capability reporting
- ship guest-first and voice-conservative defaults

## Near-Term Deliverables

### Next 30 Days

- finalize adapter contract document
- add command-buffer transport for host bridges
- define backend capability schema
- choose Babylon MVP feature slice
- define Colyseus room schema draft
- define realtime packet/event taxonomy

### Next 60 Days

- Babylon MVP backend running at least one sample cart
- Godot host spike: GDExtension + QuickJS + first adapter method working
- initial Colyseus prototype with guest join, transforms, and chat

### Next 90 Days

- Babylon compatibility report
- Godot host MVP with transforms, camera, input, and one running cart on desktop
- Godot mobile proof-of-concept on iOS or Android
- RetroArch `.nova` CLI packaging and QuickJS lifecycle spike
- Unity host scoping memo derived from Godot host learnings
- Colyseus world room + leaderboard path
- RTC voice spike with strict room-size and moderation constraints

## Success Definition

Nova64 succeeds on this roadmap if:

- carts remain portable across backends
- native hosts feel like implementation targets, not forks of the API
- mobile deployment is credible through Godot first, then Unity
- multiplayer state is authoritative and predictable through Colyseus
- RTC features remain optional, moderated, and off the critical path until proven
