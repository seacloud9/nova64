import { mkdir, writeFile, stat } from 'fs/promises';
import { resolve, basename } from 'path';
import { input } from '@inquirer/prompts';

const STARTER_CART = `// My Nova64 Game
// A spinning cube — edit this to build your game!

let cube;

export function init() {
  cube = createCube(2, 0x00aaff, [0, 0, -5]);
  setAmbientLight(0xffffff, 1.5);
  setCameraPosition(0, 2, 6);
  setCameraTarget(0, 0, 0);
  setFog(0x0a0a1a, 10, 40);
}

export function update(dt) {
  rotateMesh(cube, dt * 0.5, dt, 0);

  // Example: move cube with WASD
  // if (key('KeyW')) setPosition(cube, 0, 0, cube.position.z - 5 * dt);
}

export function draw() {
  printCentered('My Nova64 Game', 12, 0xffffff);
  print('Press WASD to move', 10, 30, 0x888888);
}
`;

const PACKAGE_JSON_TEMPLATE = name =>
  JSON.stringify(
    {
      name,
      version: '0.0.1',
      private: true,
      type: 'module',
      scripts: {
        dev: 'nova64 dev',
      },
      dependencies: {
        nova64: `^${process.env.NOVA64_VERSION || '0.4.8'}`,
      },
    },
    null,
    2
  ) + '\n';

const INDEX_HTML_TEMPLATE = name => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a1a; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 100vh; }
    canvas { display: block; image-rendering: pixelated; }
  </style>
  <script type="importmap">
  {
    "imports": {
      "three": "https://esm.sh/three@0.182.0",
      "three/": "https://esm.sh/three@0.182.0/"
    }
  }
  </script>
</head>
<body>
  <canvas id="screen" width="1280" height="720"></canvas>
  <script type="module">
    import 'nova64/src/main.js';
  </script>
</body>
</html>
`;

async function dirExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

export async function initCommand(dirArg) {
  let projectDir;
  let projectName;

  if (dirArg) {
    projectName = basename(dirArg);
    projectDir = resolve(process.cwd(), dirArg);
  } else {
    projectName = await input({
      message: 'Project name:',
      default: 'my-nova64-game',
      validate: v => v.trim().length > 0 || 'Name cannot be empty',
    });
    projectDir = resolve(process.cwd(), projectName);
  }

  if (await dirExists(projectDir)) {
    console.error(`\n  \x1b[31mError:\x1b[0m Directory "${projectName}" already exists.\n`);
    process.exit(1);
  }

  console.log(`\n  \x1b[35m🎮 Nova64\x1b[0m Creating project: \x1b[1m${projectName}\x1b[0m\n`);

  // Create project structure
  await mkdir(projectDir, { recursive: true });
  await writeFile(resolve(projectDir, 'code.js'), STARTER_CART);
  await writeFile(resolve(projectDir, 'package.json'), PACKAGE_JSON_TEMPLATE(projectName));
  await writeFile(resolve(projectDir, 'index.html'), INDEX_HTML_TEMPLATE(projectName));

  console.log(`  \x1b[32m✓\x1b[0m Created ${projectName}/code.js`);
  console.log(`  \x1b[32m✓\x1b[0m Created ${projectName}/package.json`);
  console.log(`  \x1b[32m✓\x1b[0m Created ${projectName}/index.html`);
  console.log();
  console.log(`  \x1b[1mNext steps:\x1b[0m`);
  console.log(`    cd ${projectName}`);
  console.log(`    pnpm install`);
  console.log(`    nova64 dev`);
  console.log();
}
