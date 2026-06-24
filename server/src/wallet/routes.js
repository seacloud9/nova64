// routes.js — HTTP endpoints for the wallet (SIWE) auth provider, mounted on the
// same server as Colyseus. The cart calls these before connecting:
//
//   POST /auth/wallet/nonce  -> { nonce }
//   POST /auth/wallet/verify { message, signature } -> { token, address, id, name }
//
// On success we mint a short-lived HS256 session JWT that the server's onAuth gate
// (verifyToken) accepts, with id = "wallet:<address>" and provider "wallet".

import jwt from 'jsonwebtoken';
import { createNonceStore, verifySiwe } from './siwe.js';

function shortAddr(a) {
  return a.slice(0, 6) + '…' + a.slice(-4);
}

// Mint a session JWT. Uses the same secret the server verifies with; in dev
// (no secret) a fallback keeps the token decodable by verifyToken.
function mintSession(address) {
  const secret = process.env.NOVA64_SUPABASE_JWT_SECRET || 'nova64-dev-secret';
  const addr = address.toLowerCase();
  return jwt.sign(
    {
      sub: 'wallet:' + addr,
      name: shortAddr(addr),
      address: addr,
      app_metadata: { provider: 'wallet' },
    },
    secret,
    { algorithm: 'HS256', expiresIn: '15m' }
  );
}

export function registerWalletAuth(app, opts = {}) {
  const nonceStore = opts.nonceStore || createNonceStore();

  // Permissive CORS: the cart is served from a different origin (vite) than the
  // server. Only these auth endpoints are exposed.
  app.use('/auth/wallet', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.post('/auth/wallet/nonce', (_req, res) => {
    res.json({ nonce: nonceStore.issue() });
  });

  app.post('/auth/wallet/verify', (req, res) => {
    const { message, signature } = req.body || {};
    const result = verifySiwe({ message, signature }, nonceStore);
    if (result.error) return res.status(400).json({ error: result.error });
    const address = result.address.toLowerCase();
    res.json({
      token: mintSession(address),
      address,
      id: 'wallet:' + address,
      name: shortAddr(address),
    });
  });

  return nonceStore;
}
