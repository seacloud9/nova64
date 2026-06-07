#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const frames = Number(process.env.NOVA64_FRAME_RATE_FRAMES || 240);
const minFps = Number(process.env.NOVA64_FRAME_RATE_MIN_FPS || 60);
const warmupFrames = Number(process.env.NOVA64_FRAME_RATE_WARMUP_FRAMES || 120);

const corePath = path.join(root, 'retroarch', 'nova64_libretro.so');
const harnessPath = path.join(root, 'retroarch', 'build', 'harness');

const carts = [
  {
    name: 'wad-demo',
    buildScript: path.join(root, 'retroarch', 'tools', 'build_wad_nova.py'),
    cartPath: path.join(root, 'retroarch', 'games', 'wad-demo.nova'),
    args: ['--press', '5=enter'],
    expectOutput: /WAD textures:/,
  },
  {
    name: 'fps-demo-3d',
    buildScript: path.join(root, 'retroarch', 'tools', 'build_fps_demo_3d_nova.py'),
    cartPath: path.join(root, 'retroarch', 'games', 'fps-demo-3d.nova'),
    args: ['--key', 'enter'],
  },
];

function requireFile(file, label) {
  if (fs.existsSync(file)) return;
  console.error(`${label} missing: ${file}`);
  process.exit(1);
}

function run(command, args, opts = {}) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...opts.env },
  });
}

requireFile(corePath, 'RetroArch core');
requireFile(harnessPath, 'RetroArch harness');

for (const cart of carts) {
  const build = run('python3', [cart.buildScript]);
  if (build.status !== 0) {
    console.error(build.stdout || '');
    console.error(build.stderr || '');
    process.exit(1);
  }
}

let failed = false;
console.log(`name|frames|fps|frame_ms|status`);

for (const cart of carts) {
  const result = run(
    harnessPath,
    [
      corePath,
      cart.cartPath,
      '--gles',
      '--frames',
      String(frames),
      '--warmup-frames',
      String(warmupFrames),
      '--measure-fps',
      ...cart.args,
    ],
    { env: { NOVA64_GLES_TESTS: '1' } }
  );
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  const fps = Number(output.match(/\bmeasured_fps=([0-9.]+)/)?.[1] || 0);
  const frameMs = Number(output.match(/\bframe_ms=([0-9.]+)/)?.[1] || 0);
  const expectedOutputSeen = !cart.expectOutput || cart.expectOutput.test(output);
  const ok = result.status === 0 && output.includes('ok=1') && fps >= minFps && expectedOutputSeen;
  const status = ok ? 'PASS' : `FAIL min=${minFps}`;

  console.log(`${cart.name}|${frames}|${fps.toFixed(2)}|${frameMs.toFixed(4)}|${status}`);

  if (!ok) {
    failed = true;
    if (!expectedOutputSeen) console.error(`${cart.name}: expected gameplay marker was missing`);
    const firstError =
      output
        .split(/\r?\n/)
        .find(line =>
          /JS exception|ReferenceError|TypeError|SyntaxError|Cart init\(\) threw|Cart update\(\) error|ok=/.test(
            line
          )
        ) || output.trim().split(/\r?\n/).at(-1);
    if (firstError) console.error(`${cart.name}: ${firstError}`);
  }
}

if (failed) process.exitCode = 1;
