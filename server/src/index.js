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
    transport: new WebSocketTransport({ server: http.createServer() }),
  });
  gameServer.define('state', StateRoom);
  return gameServer;
}

// `node src/index.js` entry point (ESM-safe main check).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 2567;
  const gameServer = createServer();
  gameServer
    .listen(port)
    .then(() => console.log(`[nova64-server] StateRoom on ws://localhost:${port}`))
    .catch((e) => {
      console.error('[nova64-server] failed to start:', e);
      process.exit(1);
    });
}
