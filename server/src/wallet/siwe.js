// siwe.js — Sign-In With Ethereum (EIP-4361) verification for the wallet auth
// provider. The server issues a single-use nonce, the wallet signs a SIWE message
// embedding it, and we verify the signature recovers the claimed address and the
// nonce is valid. On success the caller mints a session JWT (see routes.js).
//
// Signature recovery uses ethers `verifyMessage` (EIP-191 personal_sign).

import crypto from 'crypto';
import { verifyMessage } from 'ethers';

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;
const DEFAULT_TTL_MS = 5 * 60 * 1000; // a nonce is good for 5 minutes

// In-memory, single-use nonce store. Fine for one server process; back it with a
// shared store (Redis) if you scale horizontally.
export function createNonceStore({ ttlMs = DEFAULT_TTL_MS } = {}) {
  const nonces = new Map(); // nonce -> expiresAt (ms)
  return {
    issue() {
      const nonce = crypto.randomBytes(16).toString('hex');
      nonces.set(nonce, Date.now() + ttlMs);
      return nonce;
    },
    // Consume returns true exactly once for a live nonce, then it's gone.
    consume(nonce) {
      const exp = nonces.get(nonce);
      if (exp == null) return false;
      nonces.delete(nonce);
      return Date.now() <= exp;
    },
    sweep() {
      const now = Date.now();
      for (const [n, e] of nonces) if (e < now) nonces.delete(n);
    },
    size: () => nonces.size,
  };
}

// Build an EIP-4361 message. The client signs exactly this; the server parses it.
export function buildSiweMessage({
  domain,
  address,
  uri,
  nonce,
  statement = 'Sign in to the Nova64 metaverse.',
  chainId = 1,
  issuedAt = new Date().toISOString(),
  expirationTime,
}) {
  const lines = [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    statement,
    '',
    `URI: ${uri}`,
    'Version: 1',
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ];
  if (expirationTime) lines.push(`Expiration Time: ${expirationTime}`);
  return lines.join('\n');
}

// Extract the fields we care about from an EIP-4361 message without a full parser:
// the address (first bare 0x line), Nonce:, and the optional Expiration Time:.
export function parseSiweMessage(message) {
  const lines = String(message || '').split('\n');
  const out = { domain: null, address: null, nonce: null, expirationTime: null };
  const head = lines[0] && lines[0].match(/^(.+?) wants you to sign in/);
  if (head) out.domain = head[1];
  for (const line of lines) {
    const t = line.trim();
    if (!out.address && ADDR_RE.test(t)) out.address = t;
    const n = line.match(/^Nonce:\s*(\S+)/);
    if (n) out.nonce = n[1];
    const e = line.match(/^Expiration Time:\s*(\S+)/);
    if (e) out.expirationTime = e[1];
  }
  return out;
}

// Verify a SIWE message + signature against the nonce store. Returns
// { ok:true, address } or { error }. The nonce is consumed only on full success,
// so a bad signature can't burn someone else's pending nonce.
export function verifySiwe({ message, signature }, nonceStore) {
  if (!message || !signature) return { error: 'missing_fields' };
  const parsed = parseSiweMessage(message);
  if (!parsed.address || !ADDR_RE.test(parsed.address)) return { error: 'bad_address' };
  if (!parsed.nonce) return { error: 'missing_nonce' };
  if (parsed.expirationTime) {
    const exp = Date.parse(parsed.expirationTime);
    if (Number.isFinite(exp) && Date.now() > exp) return { error: 'message_expired' };
  }
  let recovered;
  try {
    recovered = verifyMessage(message, signature);
  } catch (_) {
    return { error: 'bad_signature' };
  }
  if (recovered.toLowerCase() !== parsed.address.toLowerCase())
    return { error: 'address_mismatch' };
  if (!nonceStore.consume(parsed.nonce)) return { error: 'bad_nonce' };
  return { ok: true, address: recovered };
}
