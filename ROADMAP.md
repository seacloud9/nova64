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
- Unity host support
- Godot host support
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

### Phase 3: Unity Support

Goal:

Use Unity as a native host backend so Nova64 game logic can drive native Unity C# behavior for mobile and desktop shipping.

Architecture:

- JS remains the game-logic layer
- Unity owns rendering, audio, input, lifecycle, packaging, and platform services
- JS communicates through a controlled host API, not arbitrary C# execution

Scope:

- command-buffered host transport
- handle allocation and resource lifecycle tracking
- transforms, mesh creation, camera control, audio, and input polling
- prefab and asset-loading hooks after core runtime flow is proven
- mobile packaging proof on iOS/Android through Unity

Non-goals for this phase:

- unrestricted Unity API access
- arbitrary C# eval
- mirroring Unity objects into JS

Exit criteria:

- at least one Nova64 sample runs through the Unity host with native rendering
- bridge latency and frame cost are measured on a mobile target
- Unity host contract is documented and versioned

### Phase 4: Godot Support

Goal:

Add Godot as a second native host target to validate that Nova64 can bridge into more than one native engine ecosystem.

Why Godot:

- strong fit for open tooling and creator workflows
- good long-term hedge against overfitting Nova64 to Unity-only assumptions
- useful comparison for scene lifecycle, rendering ownership, and scripting boundaries

Scope:

- Godot transport layer for Nova64 host commands
- resource-handle model for meshes, materials, cameras, and audio
- transform and scene update flow compatible with the existing adapter contract
- demo path for desktop first, then mobile if justified

Non-goals for this phase:

- feature parity with all Unity-specific native integrations
- custom scripting passthrough from carts into GDScript/C# internals

Exit criteria:

- a thin but working Godot host path exists
- conformance tests validate the shared adapter contract
- differences between Unity and Godot host semantics are documented

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
3. complete Unity host MVP
4. decide whether Godot support is parallel or subsequent based on traction
5. add Colyseus multiplayer foundation
6. add RTC voice/media layer
7. add optional social/economy extensions later

This order reduces risk because it avoids solving host portability, authoritative multiplayer, and media networking all at once.

## Major Risks

- backend sprawl before the adapter contract is stable
- overfitting the API to Three.js internals
- adding Unity/Godot-specific concepts into the cart API
- trying to build Babylon, Unity, Godot, Colyseus, and RTC simultaneously
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
- Unity host MVP with transforms, camera, and input
- initial Colyseus prototype with guest join, transforms, and chat

### Next 90 Days

- Babylon compatibility report
- Unity mobile proof-of-concept
- Godot spike or decision memo
- Colyseus world room + leaderboard path
- RTC voice spike with strict room-size and moderation constraints

## Success Definition

Nova64 succeeds on this roadmap if:

- carts remain portable across backends
- native hosts feel like implementation targets, not forks of the API
- mobile deployment is credible through Unity and later Godot if justified
- multiplayer state is authoritative and predictable through Colyseus
- RTC features remain optional, moderated, and off the critical path until proven