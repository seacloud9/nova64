// nova64-server — Colyseus game server (ESM; colyseus 0.17 is ESM-only).
// Registers the generic StateRoom that backs nova64.net. `npm start`
// (default ws://localhost:2567).

import http from 'http';
import { fileURLToPath } from 'url';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { StateRoom } from './rooms/StateRoom.js';

export function createServer() {
  const gameServer = new Server({
    // 64 KB frame cap: comfortably above any legitimate message (pos/chat/state
    // blobs) while bounding what a single client can push in one frame. The
    // StateRoom adds finer per-message size + rate guards on the relay.
    transport: new WebSocketTransport({ server: http.createServer(), maxPayload: 64 * 1024 }),
  });
  gameServer.define('state', StateRoom);
  return gameServer;
}

// `node src/index.js` entry point (ESM-safe main check).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 2567;
  // Bind dual-stack (IPv6 `::`, which also accepts IPv4) so BOTH `localhost`
  // (which Windows resolves to ::1) and `127.0.0.1` reach the server. With WSL
  // mirrored networking this is what lets a native Windows client (e.g. the
  // Godot metaverse) connect over ws://localhost — IPv4-only binds time out on
  // the ::1 lookup. Override with HOST if needed.
  const host = process.env.HOST || '::';
  const gameServer = createServer();
  gameServer
    .listen(port, host)
    .then(() => console.log(`[nova64-server] StateRoom on ws://localhost:${port} (host ${host})`))
    .catch(e => {
      console.error('[nova64-server] failed to start:', e);
      process.exit(1);
    });
}
