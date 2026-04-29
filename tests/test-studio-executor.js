import { TestRunner, Assert } from './test-runner.js';
import { executeStudioCartCode } from '../runtime/studio-executor.js';

export async function runStudioExecutorTests() {
  const runner = new TestRunner();

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
