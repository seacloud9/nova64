// Unit test for the nova64.auth provider registry (runtime/api-auth.js) — pure
// logic, no network. Covers: guest sign-in, unknown-provider + not-configured
// errors, custom provider registration, token/identity, onChange, sign-out.

import assert from 'assert';
const { authApi } = await import('../../runtime/api-auth.js');

(async () => {
  const auth = authApi();

  let changes = 0;
  auth.onChange(() => {
    changes++;
  });

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

  // built-in wallet (SIWE): drive the flow with a mock EIP-1193 wallet + fetch.
  const ethCalls = [];
  const mockEth = {
    request: async ({ method }) => {
      ethCalls.push(method);
      if (method === 'eth_requestAccounts') return ['0xAbC0000000000000000000000000000000000001'];
      if (method === 'personal_sign') return '0xsignature';
      return null;
    },
  };
  let postedVerify = null;
  const mockFetch = async (url, init) => {
    if (url.endsWith('/auth/wallet/nonce'))
      return { ok: true, json: async () => ({ nonce: 'NONCE123' }) };
    if (url.endsWith('/auth/wallet/verify')) {
      postedVerify = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({ token: 'jwt-wallet', id: 'wallet:0xabc0…0001', name: '0xAbC0…0001' }),
      };
    }
    return { ok: false, json: async () => ({}) };
  };
  const wid = await auth.signIn('wallet', {
    ethereum: mockEth,
    fetch: mockFetch,
    authUrl: 'http://localhost:2567',
  });
  assert.strictEqual(wid.provider, 'wallet', 'built-in wallet provider used');
  assert.strictEqual(wid.token, 'jwt-wallet', 'wallet session token from verify');
  assert.ok(wid.address.startsWith('0xabc'), 'wallet address namespaced + lowercased');
  assert.ok(ethCalls.includes('personal_sign'), 'wallet asked to sign the SIWE message');
  assert.ok(
    postedVerify && /Nonce: NONCE123/.test(postedVerify.message),
    'signed message embeds the issued nonce'
  );
  assert.ok(auth.providers().includes('wallet'), 'wallet is a built-in provider');

  // extensibility: register a brand-new provider and use it
  const ok = auth.registerProvider('custom-idp', {
    async signIn() {
      return {
        id: 'custom:1',
        provider: 'custom-idp',
        displayName: 'Custom',
        claims: {},
        token: 'jwt123',
      };
    },
  });
  assert.ok(ok, 'registerProvider accepted');
  const w = await auth.signIn('custom-idp');
  assert.strictEqual(w.provider, 'custom-idp', 'custom provider used');
  assert.strictEqual(auth.token(), 'jwt123', 'custom provider token');
  assert.ok(auth.providers().includes('custom-idp'), 'provider listed');

  auth.signOut();
  assert.ok(!auth.isSignedIn(), 'signed out');

  console.log('PASS auth: guest, errors, registerProvider, token/identity, onChange, signOut');
  process.exit(0);
})().catch(e => {
  console.error('FAIL auth:', e && e.message ? e.message : e);
  process.exit(1);
});
