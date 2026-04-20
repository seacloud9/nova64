import { mkdir, readdir, readFile, writeFile, cp, stat } from 'fs/promises';
import { resolve, basename, join } from 'path';
import { fileURLToPath } from 'url';
import { select, input } from '@inquirer/prompts';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const NOVA64_ROOT = resolve(__dirname, '..', '..');
const EXAMPLES_DIR = resolve(NOVA64_ROOT, 'examples');

// Curated example metadata for the interactive picker
const CATEGORIES = {
  '⭐ Getting Started': ['hello-world', 'hello-3d', 'hello-namespaced', 'hello-skybox', 'input-showcase'],
  '🎮 Games': [
    'star-fox-nova-3d',
    'f-zero-nova-3d',
    'space-harrier-3d',
    'fps-demo-3d',
    'shooter-demo-3d',
    'space-combat-3d',
    'wing-commander-space',
    'super-plumber-64',
    'strider-demo-3d',
    'dungeon-crawler-3d',
    'wizardry-3d',
    'adventure-comic-3d',
  ],
  '⛏️ Voxel': ['minecraft-demo', 'voxel-terrain', 'voxel-creative', 'voxel-creatures'],
  '🌍 Worlds & Showcases': [
    'cyberpunk-city-3d',
    'mystical-realm-3d',
    'crystal-cathedral-3d',
    'nature-explorer-3d',
    'physics-demo-3d',
    'pbr-showcase',
    'skybox-showcase',
    'model-viewer-3d',
    '3d-advanced',
    'tsl-showcase',
    'instancing-demo',
  ],
  '🎨 Creative & Art': [
    'generative-art',
    'creative-coding',
    'boids-flocking',
    'game-of-life-3d',
    'particles-demo',
    'demoscene',
    'nft-art-generator',
    'nft-worlds',
  ],
  '🔊 Audio & UI': [
    'audio-lab',
    'screen-demo',
    'hud-demo',
    'ui-demo',
    'canvas-ui-showcase',
    'storage-quest',
    'startscreen-demo',
  ],
  '⚡ Framework Demos': ['hype-demo', 'flash-demo', 'wad-demo'],
};

async function getAvailableExamples() {
  const entries = await readdir(EXAMPLES_DIR, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort();
}

function buildChoices(available) {
  const choices = [];
  const categorized = new Set();

  for (const [category, names] of Object.entries(CATEGORIES)) {
    const items = names.filter(n => available.includes(n));
    if (items.length === 0) continue;
    choices.push({ type: 'separator', separator: `── ${category} ──` });
    for (const name of items) {
      choices.push({ name: name, value: name });
      categorized.add(name);
    }
  }

  // Add uncategorized examples
  const uncategorized = available.filter(n => !categorized.has(n));
  if (uncategorized.length > 0) {
    choices.push({ type: 'separator', separator: '── 📦 Other ──' });
    for (const name of uncategorized) {
      choices.push({ name: name, value: name });
    }
  }

  return choices;
}

async function dirExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

export async function templateCommand(templateArg) {
  const available = await getAvailableExamples();

  let templateName;

  if (templateArg) {
    // Validate the argument
    if (!available.includes(templateArg)) {
      console.error(`\n  \x1b[31mError:\x1b[0m Template "${templateArg}" not found.`);
      console.error(`  Run \x1b[1mnova64 template\x1b[0m to see available templates.\n`);
      process.exit(1);
    }
    templateName = templateArg;
  } else {
    // Interactive selection
    console.log(`\n  \x1b[35m🎮 Nova64\x1b[0m Select a template to scaffold:\n`);

    templateName = await select({
      message: 'Choose a template:',
      choices: buildChoices(available),
      pageSize: 20,
      loop: false,
    });
  }

  // Ask for project name
  const projectName = await input({
    message: 'Project name:',
    default: templateName,
    validate: v => v.trim().length > 0 || 'Name cannot be empty',
  });

  const projectDir = resolve(process.cwd(), projectName);

  if (await dirExists(projectDir)) {
    console.error(`\n  \x1b[31mError:\x1b[0m Directory "${projectName}" already exists.\n`);
    process.exit(1);
  }

  const srcDir = resolve(EXAMPLES_DIR, templateName);
  console.log(
    `\n  \x1b[35m🎮 Nova64\x1b[0m Creating project from template: \x1b[1m${templateName}\x1b[0m\n`
  );

  // Copy template files
  await mkdir(projectDir, { recursive: true });
  await cp(srcDir, projectDir, { recursive: true });

  // Generate package.json if not present
  const pkgPath = resolve(projectDir, 'package.json');
  if (!(await dirExists(pkgPath))) {
    const pkg =
      JSON.stringify(
        {
          name: projectName,
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
    await writeFile(pkgPath, pkg);
  }

  // Generate index.html if not present
  const htmlPath = resolve(projectDir, 'index.html');
  if (!(await dirExists(htmlPath))) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${projectName}</title>
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
    await writeFile(htmlPath, html);
  }

  // List created files
  const files = await readdir(projectDir, { recursive: true });
  for (const f of files) {
    console.log(`  \x1b[32m✓\x1b[0m Created ${projectName}/${f}`);
  }

  console.log();
  console.log(`  \x1b[1mNext steps:\x1b[0m`);
  console.log(`    cd ${projectName}`);
  console.log(`    pnpm install`);
  console.log(`    nova64 dev`);
  console.log();
}
