/**
 * Minimal smoke test for the @nova64/app-contracts public surface.
 *
 * The exhaustive forged-message regression suite lives in
 * tests/test-studio-protocol.js at the repo root; this just proves the package
 * re-exports the protocol correctly and is consumable via its own entry point.
 */
import assert from 'node:assert/strict';
import {
  STUDIO_PROTOCOL_VERSION,
  StudioMessageType,
  isTrustedOrigin,
  validateInboundCode,
  acceptExecuteCode,
} from '../index.js';

assert.equal(STUDIO_PROTOCOL_VERSION, 1);
assert.equal(StudioMessageType.CODE, 'EXECUTE_CODE');

// wildcard origin is never trusted
assert.equal(isTrustedOrigin('*', { selfOrigin: '*' }), false);
// same-origin is trusted
assert.equal(isTrustedOrigin('https://x.example', { selfOrigin: 'https://x.example' }), true);

// schema validation
assert.equal(validateInboundCode({ type: StudioMessageType.CODE, code: 'init()' }).ok, true);
assert.equal(validateInboundCode({ type: 'NOPE', code: 'x' }).ok, false);

// full inbound guard rejects a forged non-parent sender on a trusted origin
const parent = { id: 'parent' };
assert.equal(
  acceptExecuteCode(
    { origin: 'https://x.example', source: { id: 'attacker' }, data: { type: StudioMessageType.CODE, code: 'x' } },
    { expectedSource: parent, selfOrigin: 'https://x.example' }
  ).ok,
  false
);
assert.equal(
  acceptExecuteCode(
    { origin: 'https://x.example', source: parent, data: { type: StudioMessageType.CODE, code: 'x' } },
    { expectedSource: parent, selfOrigin: 'https://x.example' }
  ).ok,
  true
);

console.log('✅ @nova64/app-contracts smoke test passed');
