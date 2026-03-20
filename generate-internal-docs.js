import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const template = (title, icon, subtitle, overview, features) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Nova64 Documentation</title>
    <style>
        :root {
            --bg-primary: #0f1115; --bg-secondary: #151822; --bg-tertiary: #1a1d2e;
            --text-primary: #dcdfe4; --text-secondary: #99a1b3;
            --accent-cyan: #00ffff; --accent-magenta: #ff0080; --accent-yellow: #ffff00;
            --border: #2a324a; --code-bg: #1a1d2e;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, var(--bg-primary) 0%, #1a1625 50%, var(--bg-primary) 100%);
            background-attachment: fixed; color: var(--text-primary); line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        header {
            background: var(--bg-secondary); border: 2px solid var(--accent-cyan);
            border-radius: 12px; padding: 30px; margin-bottom: 30px;
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.3);
        }
        h1 { color: var(--accent-cyan); font-size: 2.5em; text-shadow: 0 0 20px rgba(0, 255, 255, 0.6); margin-bottom: 10px; }
        .back-link { display: inline-block; color: var(--accent-cyan); text-decoration: none; margin-bottom: 15px; transition: color 0.3s ease; }
        .back-link:hover { color: #33ffff; text-decoration: underline; }
        .subtitle { color: var(--text-secondary); font-size: 1.1em; }
        section { background: var(--bg-secondary); border-left: 4px solid var(--accent-cyan); padding: 25px; margin-bottom: 30px; border-radius: 8px; }
        h2 { color: var(--accent-magenta); font-size: 2em; margin-bottom: 15px; text-shadow: 0 0 10px rgba(255, 0, 128, 0.5); }
        .note { background: var(--bg-tertiary); border-left: 4px solid var(--accent-yellow); padding: 15px; margin: 15px 0; border-radius: 4px; }
        .note-title { color: var(--accent-yellow); font-weight: bold; margin-bottom: 10px; }
        footer { text-align: center; padding: 30px 20px; color: var(--text-secondary); border-top: 1px solid var(--border); margin-top: 40px; }
    </style>
</head>
<body>
    <div class="container">
        <a href="index.html" class="back-link">← Back to Documentation Index</a>
        
        <header>
            <h1>${icon} ${title}</h1>
            <p class="subtitle">${subtitle}</p>
        </header>

        <section>
            <h2>📋 Overview</h2>
            <p>${overview}</p>
            
            <div class="note">
                <div class="note-title">💡 Key Features</div>
                <ul>
${features.map(f => `                    <li>${f}</li>`).join('\n')}
                </ul>
            </div>
            
            <div class="note">
                <div class="note-title">⚠️ Internal API</div>
                <p>This is an internal system API used by the Nova64 runtime. Most game developers won't need to interact with it directly.</p>
            </div>
        </section>

        <section>
            <h2>📚 Related APIs</h2>
            <ul>
                <li><a href="index.html" style="color: var(--accent-cyan);">← Back to Documentation Index</a></li>
            </ul>
        </section>

        <footer>
            <p>Nova64 Fantasy Console © 2025 | <a href="index.html" style="color: var(--accent-cyan);">Back to Documentation</a></p>
        </footer>
    </div>
</body>
</html>`;

const pages = [
  {
    filename: 'console.html',
    title: 'Console System',
    icon: '🎬',
    subtitle: 'Core runtime console for loading and managing game cartridges',
    overview:
      'The Console System (Nova64 class) is the main runtime that loads game cartridges, manages the update/draw loop, handles screen transitions, and coordinates all subsystems.',
    features: [
      '<strong>Cartridge Loading</strong> - Load and execute game code',
      '<strong>Game Loop</strong> - 60 FPS update/draw cycle',
      '<strong>Lifecycle Management</strong> - init(), update(), draw(), destroy()',
      '<strong>Subsystem Coordination</strong> - Manages GPU, input, audio, UI',
      '<strong>Error Handling</strong> - Graceful error catching and reporting',
    ],
  },
  {
    filename: 'framebuffer.html',
    title: 'Framebuffer',
    icon: '🖼️',
    subtitle: 'Low-level pixel buffer for 2D rendering operations',
    overview:
      'The Framebuffer provides direct pixel access for 2D rendering. It stores a 640×360 array of pixels and provides methods for direct pixel manipulation.',
    features: [
      '<strong>Pixel Buffer</strong> - 640×360 RGBA pixel array',
      '<strong>Direct Access</strong> - pset(), fill() methods',
      '<strong>Color Blending</strong> - Alpha compositing support',
      '<strong>Memory Management</strong> - Efficient typed arrays',
      '<strong>GPU Upload</strong> - Transfers to GPU texture',
    ],
  },
  {
    filename: 'font.html',
    title: 'Font System',
    icon: '🔤',
    subtitle: 'Bitmap font rendering for text display',
    overview:
      'The Font System provides bitmap font rendering with a built-in 8×8 pixel font. It handles text drawing with color support.',
    features: [
      '<strong>Bitmap Font</strong> - 8×8 pixel characters',
      '<strong>Text Rendering</strong> - Fast character drawing',
      '<strong>Color Support</strong> - Colorize text on the fly',
      '<strong>Character Set</strong> - ASCII characters',
      '<strong>Efficient</strong> - Cached font atlas',
    ],
  },
  {
    filename: 'assets.html',
    title: 'Asset Loader',
    icon: '📦',
    subtitle: 'Loading and caching of images, sounds, and models',
    overview:
      'The Asset Loader handles loading and caching of game assets including images, sprite sheets, tilemaps, sounds, and 3D models.',
    features: [
      '<strong>Image Loading</strong> - PNG, JPG support',
      '<strong>Sprite Sheets</strong> - Tile-based sprite loading',
      '<strong>Tilemap Loading</strong> - JSON map format',
      '<strong>GLB Models</strong> - 3D model loading',
      '<strong>Caching</strong> - Avoid redundant loads',
    ],
  },
  {
    filename: 'editor.html',
    title: 'Sprite Editor',
    icon: '🖌️',
    subtitle: 'Built-in pixel art editor for creating sprites',
    overview:
      'The Sprite Editor is a built-in tool for creating and editing 8×8 pixel sprites. It provides a color palette and drawing tools.',
    features: [
      '<strong>8×8 Editor</strong> - Pixel art canvas',
      '<strong>Color Palette</strong> - 16 predefined colors',
      '<strong>Drawing Tools</strong> - Pencil, fill, erase',
      '<strong>Export</strong> - Save sprites to data URL',
      '<strong>Live Preview</strong> - See sprite in-game',
    ],
  },
  {
    filename: 'textinput.html',
    title: 'Text Input',
    icon: '⌨️',
    subtitle: 'Keyboard text input for UI forms and game chat',
    overview:
      'The Text Input system handles keyboard text entry for UI text fields, chat boxes, and other text input needs.',
    features: [
      '<strong>Text Field</strong> - Editable text input',
      '<strong>Cursor</strong> - Blinking cursor position',
      '<strong>Character Filter</strong> - Limit input types',
      '<strong>Max Length</strong> - Length restrictions',
      '<strong>Clipboard</strong> - Copy/paste support',
    ],
  },
  {
    filename: 'gpu-systems.html',
    title: 'GPU Rendering Backends',
    icon: '🎨',
    subtitle: 'Three.js, WebGL2, and Canvas2D rendering systems',
    overview:
      'Nova64 uses multiple GPU backends for rendering: Three.js for 3D graphics, WebGL2 for advanced effects, and Canvas2D as a fallback.',
    features: [
      '<strong>Three.js GPU</strong> - Primary 3D renderer (gpu-threejs.js)',
      '<strong>WebGL2</strong> - Advanced shader support (gpu-webgl2.js)',
      '<strong>Canvas2D</strong> - Fallback 2D renderer (gpu-canvas2d.js)',
      '<strong>Abstraction Layer</strong> - Unified API across backends',
      '<strong>Auto-Detection</strong> - Selects best available GPU',
    ],
  },
];

const docsDir = path.join(__dirname, 'docs');
pages.forEach(page => {
  const html = template(page.title, page.icon, page.subtitle, page.overview, page.features);
  const filepath = path.join(docsDir, page.filename);
  fs.writeFileSync(filepath, html, 'utf8');
  console.log(`✅ Created: ${page.filename}`);
});

console.log(`\n🎉 Generated ${pages.length} internal API documentation pages!`);
