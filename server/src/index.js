// nova64-server — Colyseus game server. Registers the generic StateRoom that
// backs nova64.net. Boot with `npm start` (default ws://localhost:2567).

const http = require('http');
const { Server } = require('colyseus');
const { WebSocketTransport } = require('@colyseus/ws-transport');
const { StateRoom } = require('./rooms/StateRoom');

function createServer() {
  const gameServer = new Server({
    transport: new WebSocketTransport({ server: http.createServer() }),
  });
  gameServer.define('state', StateRoom);
  return gameServer;
}

if (require.main === module) {
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

module.exports = { createServer };
