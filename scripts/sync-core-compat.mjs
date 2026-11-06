// Copy createCoreCompat from runtime/core-compat.js into the Godot shim
// (between the BEGIN/END core-compat markers). The shim is a single script
// evaluated by QuickJS, so it can't import the module. Run after editing
// runtime/core-compat.js; tests/test-core-compat.js checks the copies match.
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'runtime/core-compat.js';
const SHIM = 'nova64-godot/godot_project/shim/nova64-compat.js';
const BEGIN = '// BEGIN core-compat';
const END = '// END core-compat';

const src = readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');
const block = src.slice(src.indexOf(BEGIN), src.indexOf(END) + END.length);
const shim = readFileSync(SHIM, 'utf8');
const nl = shim.includes('\r\n') ? '\r\n' : '\n';
const a = shim.indexOf('  ' + BEGIN);
const b = shim.indexOf(END, a) + END.length;
if (a < 0 || b < a) throw new Error(`core-compat markers not found in ${SHIM}`);
const indented = block
  .split('\n')
  .map(l => (l.trim() ? '  ' + l : l))
  .join(nl);
writeFileSync(SHIM, shim.slice(0, a) + indented + shim.slice(b));
console.log(`synced core-compat into ${SHIM}`);
