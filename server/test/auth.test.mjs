// Unit test for the nova64.auth provider registry (runtime/api-auth.js) — pure
// logic, no network. Covers: guest sign-in, unknown-provider + not-configured
// errors, custom provider registration, token/identity, onChange, sign-out.

import assert from 'assert';
const { authApi } = await import('../../runtime/api-auth.js');

(async () => {
  const auth = authApi();

  let changes = 0;
  auth.onChange(() => { changes++; });

  // guest works with no backend
  const g = await auth.signIn('guest', { name: 'IO' });
  assert.strictEqual(g.provider, 'guest', 'guest provider');
  assert.strictEqual(g.displayName, 'IO', 'guest name');
  assert.ok(g.id.startsWith('guest:'), 'guest id namespaced');
  assert.ok(auth.isSignedIn(), 'signed in');
  assert.strictEqual(auth.token(), '', 'guest token empty (server allows guests)');
  assert.ok(changes >= 1, 'onChange fired on sign-in');

  // unknown provider
  const unk = await auth.signIn('nope');
  assert.strictEqual(unk.error, 'unknown_provider', 'unknown provider error');

  // Supabase provider without configure() -> clear error, not a crash
  const ng = await auth.signIn('google');
  assert.strictEqual(ng.error, 'auth_not_configured', 'supabase not configured error');

  // extensibility: register a custom provider (e.g. wallet) and use it
  const ok = auth.registerProvider('wallet', {
    async signIn() {
      return { id: 'wallet:0xabc', provider: 'wallet', displayName: '0xabc', address: '0xabc', claims: {}, token: 'jwt123' };
    },
  });
  assert.ok(ok, 'registerProvider accepted');
  const w = await auth.signIn('wallet');
  assert.strictEqual(w.provider, 'wallet', 'custom provider used');
  assert.strictEqual(auth.token(), 'jwt123', 'custom provider token');
  assert.ok(auth.providers().includes('wallet'), 'provider listed');

  auth.signOut();
  assert.ok(!auth.isSignedIn(), 'signed out');

  console.log('PASS auth: guest, errors, registerProvider, token/identity, onChange, signOut');
  process.exit(0);
})().catch((e) => {
  console.error('FAIL auth:', e && e.message ? e.message : e);
  process.exit(1);
});
