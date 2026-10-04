import { TestRunner, Assert } from './test-runner.js';
import { executeStudioCartCode } from '../runtime/studio-executor.js';
import { createStudioCartFunction } from '../runtime/studio-executor.js';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import { NAMESPACE_MAP } from '../runtime/namespace.js';

export async function runStudioExecutorTests() {
  const runner = new TestRunner();

  runner.test(
    'README first cart executes in Studio without legacy globals or browser print',
    () => {
      const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
      const section = readme.split('## 🎨 **Creating Your First 3D Cart**')[1];
      const source = section.match(/```javascript\n([\s\S]*?)```/)[1];
      const calls = [];
      const nova64 = Object.fromEntries(
        Object.entries(NAMESPACE_MAP).map(([group, names]) => [
          group,
          Object.fromEntries(
            names.map(name => [
              name,
              (...args) => {
                calls.push({ name: `${group}.${name}`, args });
                return 1;
              },
            ])
          ),
        ])
      );
      const compiled = createStudioCartFunction(source);
      const cart = runInNewContext(`(${compiled.toString()})()`, {
        nova64,
        print() {
          throw new Error('The cart called browser print');
        },
      });
      cart.init();
      cart.update(1 / 60);
      cart.draw();
      assert.ok(calls.some(call => call.name === 'scene.createCube'));
      assert.ok(calls.some(call => call.name === 'scene.createPlane'));
      assert.ok(calls.some(call => call.name === 'draw.print' && call.args[0] === 'Score: 0'));
    }
  );

  runner.test('Studio module syntax errors explain the script contract', () => {
    for (const source of ['export function init() {}', "import cart from './cart.js'"]) {
      assert.throws(
        () => createStudioCartFunction(source),
        error =>
          error instanceof SyntaxError &&
          /studio/i.test(error.message) &&
          /without.*import.*export/i.test(error.message)
      );
    }
    // The diagnostic must not rewrite strings/comments containing module keywords.
    const cart = executeStudioCartCode(`
      // export function init() {}
      function draw() { return 'export function init() {}'; }
    `);
    assert.equal(cart.draw(), 'export function init() {}');
  });

  runner.test('Game Studio executor allows carts to destructure namespaced draw APIs', () => {
    const previousNova64 = globalThis.nova64;
    const previousCls = globalThis.cls;

    globalThis.cls = () => {};
    globalThis.nova64 = {
      draw: {
        cls: () => 'cleared',
        print: () => 'printed',
      },
    };

    try {
      const cart = executeStudioCartCode(`
        const { cls, print } = nova64.draw;

        function init() {
          cls();
          print('ok');
        }

        function update(dt) {
          return dt;
        }
      `);

      Assert.isFunction(cart.init, 'init should be returned');
      Assert.isFunction(cart.update, 'update should be returned');
      Assert.doesNotThrow(() => cart.init(), 'namespaced destructuring should not collide');
    } finally {
      if (previousNova64 === undefined) delete globalThis.nova64;
      else globalThis.nova64 = previousNova64;

      if (previousCls === undefined) delete globalThis.cls;
      else globalThis.cls = previousCls;
    }
  });

  runner.test('Game Studio executor still resolves legacy global API identifiers', () => {
    const previousCreateCube = globalThis.createCube;
    globalThis.createCube = () => ({ id: 'cube' });

    try {
      const cart = executeStudioCartCode(`
        let cube;

        function init() {
          cube = createCube();
        }

        function draw() {
          return cube.id;
        }
      `);

      cart.init();
      Assert.equals(cart.draw(), 'cube', 'legacy global createCube should resolve');
    } finally {
      if (previousCreateCube === undefined) delete globalThis.createCube;
      else globalThis.createCube = previousCreateCube;
    }
  });

  return runner.runAll();
}

if (process.argv[1] && process.argv[1].endsWith('test-studio-executor.js')) {
  runStudioExecutorTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  });
}
