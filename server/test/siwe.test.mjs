// Tests for wallet (SIWE) auth: the verify logic with a real ethers signature,
// nonce single-use/expiry, tamper/mismatch rejection, and the full HTTP flow
// (nonce -> sign -> verify -> session token that verifyToken accepts).

import assert from 'assert';
import { Wallet } from 'ethers';
import {
  createNonceStore,
  buildSiweMessage,
  parseSiweMessage,
  verifySiwe,
} from '../src/wallet/siwe.js';
import { createServer } from '../src/index.js';
import { verifyToken } from '../src/auth.js';

const DOMAIN = 'localhost';
const URI = 'http://localhost:3001';

async function signed(wallet, nonce, over = {}) {
  const message = buildSiweMessage({
    domain: DOMAIN,
    address: wallet.address,
    uri: URI,
    nonce,
    ...over,
  });
  const signature = await wallet.signMessage(message);
  return { message, signature };
}

(async () => {
  // --- unit: verifySiwe with a genuine signature --------------------------
  const store = createNonceStore();
  const wallet = Wallet.createRandom();

  const nonce = store.issue();
  const { message, signature } = await signed(wallet, nonce);

  assert.strictEqual(
    parseSiweMessage(message).address,
    wallet.address,
    'parser extracts the address'
  );

  const ok = verifySiwe({ message, signature }, store);
  assert.ok(ok.ok, 'valid SIWE verifies');
  assert.strictEqual(ok.address.toLowerCase(), wallet.address.toLowerCase(), 'recovered address');

  // nonce is single-use → replay rejected
  const replay = verifySiwe({ message, signature }, store);
  assert.strictEqual(replay.error, 'bad_nonce', 'nonce is single-use (replay rejected)');

  // tampered signature → recovers a different address (not ok). Flip a hex char
  // inside r (early in the sig); flipping the trailing v byte wouldn't work since
  // ethers normalizes recovery ids.
  const n2 = store.issue();
  const sm2 = await signed(wallet, n2);
  const c = sm2.signature[12] === '0' ? '1' : '0';
  const tampered = sm2.signature.slice(0, 12) + c + sm2.signature.slice(13);
  const bad = verifySiwe({ message: sm2.message, signature: tampered }, store);
  assert.ok(bad.error, 'tampered signature rejected');

  // address mismatch: B signs a message that claims A's address
  const a = Wallet.createRandom();
  const b = Wallet.createRandom();
  const n3 = store.issue();
  const msgA = buildSiweMessage({ domain: DOMAIN, address: a.address, uri: URI, nonce: n3 });
  const sigB = await b.signMessage(msgA);
  const mism = verifySiwe({ message: msgA, signature: sigB }, store);
  assert.strictEqual(mism.error, 'address_mismatch', 'signer must match the claimed address');

  // unknown / expired nonce
  const expiredStore = createNonceStore({ ttlMs: -1 });
  const n4 = expiredStore.issue();
  const sm4 = await signed(wallet, n4);
  assert.strictEqual(verifySiwe(sm4, expiredStore).error, 'bad_nonce', 'expired nonce rejected');

  // --- integration: the HTTP flow against the real server -----------------
  const port = 2603;
  const server = createServer();
  await server.listen(port);
  const base = `http://localhost:${port}/auth/wallet`;

  const nres = await fetch(`${base}/nonce`, { method: 'POST' });
  const { nonce: httpNonce } = await nres.json();
  assert.ok(httpNonce, 'server issued a nonce');

  const w2 = Wallet.createRandom();
  const sm = await signed(w2, httpNonce);
  const vres = await fetch(`${base}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sm),
  });
  assert.strictEqual(vres.status, 200, 'verify succeeded');
  const body = await vres.json();
  assert.ok(body.token, 'verify returned a session token');
  assert.strictEqual(body.id, 'wallet:' + w2.address.toLowerCase(), 'namespaced wallet id');

  // the minted token is accepted by the server onAuth gate as a wallet identity
  const identity = await verifyToken(body.token, {});
  assert.strictEqual(identity.provider, 'wallet', 'token verifies as a wallet identity');
  assert.strictEqual(identity.userId, 'wallet:' + w2.address.toLowerCase(), 'userId from sub');

  // a bad signature over HTTP is a 400
  const nres2 = await fetch(`${base}/nonce`, { method: 'POST' });
  const { nonce: n5 } = await nres2.json();
  const sm5 = await signed(w2, n5);
  const badres = await fetch(`${base}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: sm5.message, signature: '0xdeadbeef' }),
  });
  assert.strictEqual(badres.status, 400, 'bad signature → HTTP 400');

  await server.gracefullyShutdown(false);
  console.log(
    'PASS siwe: verify + nonce single-use/expiry + mismatch + HTTP nonce→sign→verify→token'
  );
  process.exit(0);
})().catch(e => {
  console.error('FAIL siwe:', e && e.stack ? e.stack : e);
  process.exit(1);
});
