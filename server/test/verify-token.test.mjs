// Unit test for server-side session verification (src/auth.js verifyToken) — the
// Colyseus onAuth gate. Covers the guest fallback, the require-token guard, dev
// decode-without-secret, the require-verified prod guard, and real HS256
// verify + reject. Pure logic; toggles env per case.

import assert from 'assert';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../src/auth.js';

function resetEnv() {
  delete process.env.NOVA64_ALLOW_GUEST;
  delete process.env.NOVA64_SUPABASE_JWT_SECRET;
  delete process.env.NOVA64_REQUIRE_VERIFIED;
}

(async () => {
  resetEnv();

  // 1) No token, guests allowed by default → a guest identity.
  const g = await verifyToken(undefined, { name: 'IO' });
  assert.strictEqual(g.provider, 'guest', 'guest provider');
  assert.strictEqual(g.name, 'IO', 'guest name from options');

  // 2) No token with guests disabled → reject.
  process.env.NOVA64_ALLOW_GUEST = '0';
  await assert.rejects(
    () => verifyToken(undefined, {}),
    /auth_required/,
    'guests disabled rejects'
  );
  delete process.env.NOVA64_ALLOW_GUEST;

  // 3) Token but no secret (dev) → decode claims without verifying.
  const devToken = jwt.sign(
    { sub: 'user-1', name: 'Ada', app_metadata: { provider: 'google' } },
    'irrelevant'
  );
  const d = await verifyToken(devToken, {});
  assert.strictEqual(d.userId, 'user-1', 'dev decode → userId from sub');
  assert.strictEqual(d.name, 'Ada', 'dev decode → name');
  assert.strictEqual(d.provider, 'google', 'dev decode → provider from app_metadata');

  // 4) Token, no secret, but REQUIRE_VERIFIED → refuse to run unverified.
  process.env.NOVA64_REQUIRE_VERIFIED = '1';
  await assert.rejects(
    () => verifyToken(devToken, {}),
    /jwt_secret_not_configured/,
    'require-verified rejects without a secret'
  );
  delete process.env.NOVA64_REQUIRE_VERIFIED;

  // 5) Token + secret → verify HS256; tampered/wrong-secret tokens reject.
  const secret = 'test-secret';
  process.env.NOVA64_SUPABASE_JWT_SECRET = secret;
  const good = jwt.sign({ sub: 'u2', email: 'a@b.c' }, secret, { algorithm: 'HS256' });
  const v = await verifyToken(good, {});
  assert.strictEqual(v.userId, 'u2', 'verified token → userId');
  await assert.rejects(() => verifyToken(good + 'tamper', {}), 'tampered token rejected');
  const badSecret = jwt.sign({ sub: 'u3' }, 'other-secret', { algorithm: 'HS256' });
  await assert.rejects(() => verifyToken(badSecret, {}), 'wrong-secret token rejected');
  resetEnv();

  console.log(
    'PASS verify-token: guest fallback, guest-disabled, dev-decode, require-verified, HS256 verify+reject'
  );
  process.exit(0);
})().catch(e => {
  console.error('FAIL verify-token:', e && e.message ? e.message : e);
  process.exit(1);
});
