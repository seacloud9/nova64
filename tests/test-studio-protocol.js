/**
 * Forged-message regression tests for the Game Studio ⇄ runtime protocol.
 *
 * The runtime executes cart code via `new Function` on EXECUTE_CODE, so these
 * tests lock down the validation that must run BEFORE any execution: untrusted
 * senders/origins are rejected, malformed/oversized payloads are rejected, and
 * only well-formed same-parent messages are accepted.
 *
 * Pure node, no DOM — fast enough for `pnpm test` / `pnpm test:quick`.
 */
import {
  STUDIO_PROTOCOL_VERSION,
  StudioMessageType,
  MAX_CART_SOURCE_BYTES,
  byteLength,
  isTrustedOrigin,
  validateInboundCode,
  validateInboundStatus,
  acceptExecuteCode,
} from '../runtime/studio-protocol.js';

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) {
    passed++;
    console.log(`✅ ${name}`);
  } else {
    failed++;
    console.error(`❌ ${name}`);
  }
}

const SELF = 'https://nova64.example';
const DEV_PARENT = 'http://localhost:3000';
const parentWin = { id: 'parent' };
const attackerWin = { id: 'attacker' };

// ── isTrustedOrigin ────────────────────────────────────────────────────────
check('same-origin is trusted', isTrustedOrigin(SELF, { selfOrigin: SELF }) === true);
check(
  'allowlisted dev origin is trusted',
  isTrustedOrigin(DEV_PARENT, { selfOrigin: SELF, allowedOrigins: [DEV_PARENT] }) === true
);
check('wildcard "*" is never trusted', isTrustedOrigin('*', { selfOrigin: '*' }) === false);
check('opaque "null" origin is never trusted', isTrustedOrigin('null', { selfOrigin: SELF }) === false);
check('unknown origin is rejected', isTrustedOrigin('https://evil.example', { selfOrigin: SELF }) === false);
check('empty origin is rejected', isTrustedOrigin('', { selfOrigin: SELF }) === false);
check('non-string origin is rejected', isTrustedOrigin(undefined, { selfOrigin: SELF }) === false);

// ── validateInboundCode ────────────────────────────────────────────────────
check('valid code accepted', validateInboundCode({ type: StudioMessageType.CODE, code: 'init()' }).ok === true);
check(
  'valid code with matching version accepted',
  validateInboundCode({ type: StudioMessageType.CODE, code: 'x', v: STUDIO_PROTOCOL_VERSION }).ok === true
);
check('wrong type rejected', validateInboundCode({ type: 'NOPE', code: 'x' }).ok === false);
check('missing code rejected', validateInboundCode({ type: StudioMessageType.CODE }).ok === false);
check('non-string code rejected', validateInboundCode({ type: StudioMessageType.CODE, code: 123 }).ok === false);
check('null data rejected', validateInboundCode(null).ok === false);
check(
  'future protocol version rejected',
  validateInboundCode({ type: StudioMessageType.CODE, code: 'x', v: 999 }).ok === false
);
check(
  'oversized code rejected',
  validateInboundCode({ type: StudioMessageType.CODE, code: 'a'.repeat(MAX_CART_SOURCE_BYTES + 1) }).ok === false
);
check(
  'runId passed through when string',
  validateInboundCode({ type: StudioMessageType.CODE, code: 'x', runId: 'r-1' }).runId === 'r-1'
);
check(
  'non-string runId dropped',
  validateInboundCode({ type: StudioMessageType.CODE, code: 'x', runId: 42 }).runId === null
);

// ── acceptExecuteCode (the full inbound guard) ─────────────────────────────
const goodEvent = {
  origin: SELF,
  source: parentWin,
  data: { type: StudioMessageType.CODE, code: 'init()' },
};
check('accepts code from parent window on trusted origin', acceptExecuteCode(goodEvent, {
  expectedSource: parentWin,
  selfOrigin: SELF,
}).ok === true);

check('REJECTS forged code from a non-parent window (same origin)', acceptExecuteCode({
  origin: SELF,
  source: attackerWin,
  data: { type: StudioMessageType.CODE, code: 'stealCookies()' },
}, { expectedSource: parentWin, selfOrigin: SELF }).ok === false);

check('REJECTS code from an untrusted origin (even if parent)', acceptExecuteCode({
  origin: 'https://evil.example',
  source: parentWin,
  data: { type: StudioMessageType.CODE, code: 'x' },
}, { expectedSource: parentWin, selfOrigin: SELF }).ok === false);

check('REJECTS oversized code from parent', acceptExecuteCode({
  origin: SELF,
  source: parentWin,
  data: { type: StudioMessageType.CODE, code: 'a'.repeat(MAX_CART_SOURCE_BYTES + 1) },
}, { expectedSource: parentWin, selfOrigin: SELF }).ok === false);

check('accepts dev cross-origin parent when allowlisted', acceptExecuteCode({
  origin: DEV_PARENT,
  source: parentWin,
  data: { type: StudioMessageType.CODE, code: 'init()' },
}, { expectedSource: parentWin, selfOrigin: SELF, allowedOrigins: [DEV_PARENT] }).ok === true);

// ── validateInboundStatus (Studio host side) ───────────────────────────────
check('READY status accepted', validateInboundStatus({ type: StudioMessageType.READY }).ok === true);
check('SUCCESS status accepted', validateInboundStatus({ type: StudioMessageType.SUCCESS }).ok === true);
check('LOG status accepted with string', validateInboundStatus({ type: StudioMessageType.LOG, message: 'hi' }).ok === true);
check('LOG with non-string message rejected', validateInboundStatus({ type: StudioMessageType.LOG, message: {} }).ok === false);
check('oversized LOG rejected', validateInboundStatus({ type: StudioMessageType.LOG, message: 'a'.repeat(70000) }).ok === false);
check('ERROR status accepted + coerced', validateInboundStatus({ type: StudioMessageType.ERROR, error: 'boom' }).error === 'boom');
check('unknown status type rejected', validateInboundStatus({ type: 'HACK' }).ok === false);

// ── byteLength sanity ──────────────────────────────────────────────────────
check('byteLength counts UTF-8 bytes', byteLength('a') === 1 && byteLength('€') === 3);
check('byteLength of non-string is 0', byteLength(null) === 0);

console.log(`\n📊 studio-protocol: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
