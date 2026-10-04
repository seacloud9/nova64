import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

// Set NOVA64_PACKAGE_ROOT to exercise an installed release tarball as well.
const root = process.env.NOVA64_PACKAGE_ROOT || fileURLToPath(new URL('../', import.meta.url));
const cli = resolve(root, 'bin/nova64.js');

test('installed CLI scaffolds the current version and serves the selected cart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nova64-cli-test-'));
  let child;
  try {
    const env = { ...process.env };
    delete env.NOVA64_VERSION;
    const init = spawnSync(process.execPath, [cli, 'init', 'game'], {
      cwd: directory,
      env,
      encoding: 'utf8',
    });
    assert.equal(init.status, 0, init.stderr);
    const project = join(directory, 'game');
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    const generated = JSON.parse(await readFile(join(project, 'package.json'), 'utf8'));
    assert.equal(generated.dependencies.nova64, `^${pkg.version}`);

    // Run the starter against the real namespace names without legacy globals.
    const { NAMESPACE_MAP } = await import(pathToFileURL(join(root, 'runtime/namespace.js')));
    const previousNamespace = globalThis.nova64;
    globalThis.nova64 = Object.fromEntries(
      Object.entries(NAMESPACE_MAP).map(([group, names]) => [
        group,
        Object.fromEntries(names.map(name => [name, () => {}])),
      ])
    );
    try {
      const cartModule = await import(pathToFileURL(join(project, 'code.js')));
      cartModule.init();
      cartModule.update(1 / 60);
      cartModule.draw();
    } finally {
      if (previousNamespace === undefined) delete globalThis.nova64;
      else globalThis.nova64 = previousNamespace;
    }

    const probe = createServer();
    await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
    const port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));
    child = spawn(process.execPath, [cli, 'dev', '--no-open', '--port', String(port)], {
      cwd: project,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', chunk => {
      output += chunk;
    });
    child.stderr.on('data', chunk => {
      output += chunk;
    });
    const origin = `http://127.0.0.1:${port}`;
    let response;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        response = await fetch(origin, { redirect: 'manual' });
        break;
      } catch {
        if (child.exitCode !== null) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    assert.ok(response, `CLI did not start: ${output}`);
    assert.equal(response.status, 302);
    const runner = new URL(response.headers.get('location'), origin);
    assert.equal(runner.pathname, '/cart-runner.html');
    const cart = runner.searchParams.get('path');
    assert.ok(cart.endsWith('/game/code.js'), cart);
    const page = await fetch(runner);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<canvas/);
    const source = await fetch(new URL(cart, origin));
    assert.equal(source.status, 200);
    assert.match(await source.text(), /My Nova64 Game/);
    const shell = await fetch(new URL('/os9-shell/index.html', origin));
    assert.equal(shell.status, 200, 'bundled public assets must remain available');
    assert.match(await shell.text(), /<html/);
  } finally {
    if (child && child.exitCode === null) {
      child.kill();
      await new Promise(resolve => child.once('exit', resolve));
    }
    await rm(directory, { recursive: true, force: true });
  }
});
