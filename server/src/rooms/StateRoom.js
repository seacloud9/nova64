// StateRoom — the generic, authoritative room backing nova64.net v1.
//
// A players map (presence + position + a small per-player data blob) plus a
// message relay. Carts get realtime presence and position sync with ZERO server
// code. The server owns state: clients send intents ("move"/"pos"/"set"), the
// server validates bounds/size and broadcasts patches. Typed authoritative
// rooms with real game rules come in a later phase (see the design doc).
//
// Plain-JS schema via defineTypes (no TS/decorators needed).

import { Room } from '@colyseus/core';
import { Schema, MapSchema, defineTypes } from '@colyseus/schema';
import { verifyToken } from '../auth.js';

class Player extends Schema {}
defineTypes(Player, {
  id: 'string',
  name: 'string',
  x: 'number',
  y: 'number',
  data: 'string', // small cart-defined blob (skin, state, etc.)
});

class StateRoomState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
  }
}
defineTypes(StateRoomState, { players: { map: Player } });

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const BOUND = 100000;

export class StateRoom extends Room {
  onCreate() {
    this.maxClients = 64;
    // Native clients (Godot) can be slow between the matchmaking HTTP reservation
    // and opening the room WebSocket; give the reservation room to breathe.
    this.setSeatReservationTime(30);
    this.setState(new StateRoomState());

    // Relative movement intent.
    this.onMessage('move', (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || !msg) return;
      p.x = clamp(p.x + (Number(msg.dx) || 0), -BOUND, BOUND);
      p.y = clamp(p.y + (Number(msg.dy) || 0), -BOUND, BOUND);
    });

    // Absolute position (the cart is trusted for its own avatar in v1; a later
    // authoritative room would validate against speed/collision instead).
    this.onMessage('pos', (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || !msg) return;
      if (Number.isFinite(msg.x)) p.x = clamp(Number(msg.x), -BOUND, BOUND);
      if (Number.isFinite(msg.y)) p.y = clamp(Number(msg.y), -BOUND, BOUND);
    });

    // Per-player data blob (bounded).
    this.onMessage('set', (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (p && msg && typeof msg.data === 'string' && msg.data.length <= 1024) {
        p.data = msg.data;
      }
    });

    // Relay any other message type to everyone else as an "event".
    this.onMessage('*', (client, type, msg) => {
      this.broadcast('event', { from: client.sessionId, type, msg }, { except: client });
    });
  }

  // Verify the session token (Supabase JWT) or allow a guest in dev.
  async onAuth(client, options) {
    console.log('[StateRoom] onAuth sessionId=%s options=%j', client.sessionId, options);
    return await verifyToken(options && options.token, options);
  }

  onJoin(client, options) {
    console.log('[StateRoom] onJoin sessionId=%s', client.sessionId);
    const p = new Player();
    p.id = client.sessionId;
    p.name = (client.auth && client.auth.name) || (options && options.name) || 'player';
    p.x = 0;
    p.y = 0;
    p.data = '';
    this.state.players.set(client.sessionId, p);
  }

  onLeave(client) {
    this.state.players.delete(client.sessionId);
  }
}

export { Player, StateRoomState };
