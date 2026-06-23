// Session-token verification for Colyseus onAuth (ESM; colyseus 0.17 is ESM-only).
//
// Phase 1 verifies a Supabase (or any HS256-compatible) JWT. The decisions doc
// uses Supabase Auth, which issues a standard JWT signed with the project JWT
// secret — Colyseus can verify it directly, so no separate session service is
// needed for the OAuth path. Wallet/SIWE will mint a compatible session later.
//
// Env:
//   NOVA64_SUPABASE_JWT_SECRET  HS256 secret — when set, tokens are verified.
//   NOVA64_ALLOW_GUEST=0        require a token (default: guests allowed, dev).
//   NOVA64_REQUIRE_VERIFIED=1   refuse to run unverified (no secret) — prod guard.

import jwt from 'jsonwebtoken';

export async function verifyToken(token, options) {
  if (!token) {
    if (process.env.NOVA64_ALLOW_GUEST === '0') {
      throw new Error('auth_required');
    }
    return {
      userId: 'guest',
      name: (options && options.name) || 'guest',
      provider: 'guest',
      claims: {},
    };
  }

  const secret = process.env.NOVA64_SUPABASE_JWT_SECRET;
  let claims;
  if (secret) {
    claims = jwt.verify(token, secret, { algorithms: ['HS256'] }); // throws on bad token
  } else {
    if (process.env.NOVA64_REQUIRE_VERIFIED === '1') {
      throw new Error('jwt_secret_not_configured');
    }
    claims = jwt.decode(token) || {}; // dev only: trust the decoded claims
  }

  return {
    userId: claims.sub || claims.user_id || 'unknown',
    name:
      claims.name ||
      (claims.user_metadata && claims.user_metadata.full_name) ||
      claims.email ||
      'player',
    provider: (claims.app_metadata && claims.app_metadata.provider) || 'oauth',
    claims,
  };
}
