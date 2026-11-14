import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('shared CPU Gaussian renderer: real C math, pixels and resource lifecycle', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'nova-gaussian-'));
  try {
    const binary = path.join(dir, 'test-gaussian');
    const compile = spawnSync(
      'cc',
      [
        '-std=c99',
        '-O1',
        '-g',
        '-fsanitize=address,undefined',
        'tests/test-gaussian-worlds.c',
        '-lm',
        '-o',
        binary,
      ],
      { encoding: 'utf8' }
    );
    assert.equal(compile.status, 0, compile.stdout + compile.stderr);
    const run = spawnSync(binary, [], {
      encoding: 'utf8',
      env: { ...process.env, ASAN_OPTIONS: 'detect_leaks=0' },
    });
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.match(run.stdout, /PASS Gaussian/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
