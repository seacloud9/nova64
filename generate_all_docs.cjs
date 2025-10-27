#!/usr/bin/env node
/**
 * Generate complete Nova64 API Documentation
 * Creates comprehensive HTML pages for all 23 runtime APIs
 */

const fs = require('fs');
const path = require('path');

// HTML template generator
function generateDocPage(config) {
  const { title, subtitle, icon, sections } = config;
  
  let sectionsHTML = sections.map(section => {
    let functionsHTML = (section.functions || []).map(func => {
      let paramsHTML = '';
      if (func.params && func.params.length > 0) {
        paramsHTML = `
          <div class="param-list">
            ${func.params.map(p => `
              <div class="param">
                <span class="param-name">${p.name}</span> 
                <span class="param-type">${p.type}</span> - ${p.desc}
              </div>
            `).join('')}
          </div>
        `;
      }
      
      let returnHTML = '';
      if (func.returns) {
        returnHTML = `
          <div class="return-info">
            <strong>Returns:</strong> <span class="param-type">${func.returns.type}</span> - ${func.returns.desc}
          </div>
        `;
      }
      
      let exampleHTML = '';
      if (func.example) {
        exampleHTML = `
          <div class="example">
            <div class="example-title">Example:</div>
            <pre><code>${func.example}</code></pre>
          </div>
        `;
      }
      
      return `
        <div class="function">
          <div class="function-sig">${func.signature}</div>
          <p>${func.description}</p>
          ${paramsHTML}
          ${returnHTML}
          ${exampleHTML}
        </div>
      `;
    }).join('');
    
    let descHTML = section.description || '';
    let noteHTML = '';
    if (section.note) {
      noteHTML = `
        <div class="note">
          <div class="note-title">${section.note.title}</div>
          ${section.note.content}
        </div>
      `;
    }
    
    return `
      <section>
        <h2>${section.title}</h2>
        ${descHTML}
        ${noteHTML}
        ${functionsHTML}
      </section>
    `;
  }).join('');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Nova64 Documentation</title>
    <style>
        :root {
            --bg-primary: #0f1115;
            --bg-secondary: #151822;
            --bg-tertiary: #1a1d2e;
            --text-primary: #dcdfe4;
            --text-secondary: #99a1b3;
            --accent-cyan: #00ffff;
            --accent-magenta: #ff0080;
            --accent-yellow: #ffff00;
            --border: #2a324a;
            --code-bg: #1a1d2e;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, var(--bg-primary) 0%, #1a1625 50%, var(--bg-primary) 100%);
            background-attachment: fixed;
            color: var(--text-primary);
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background: var(--bg-secondary);
            border: 2px solid var(--accent-cyan);
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.3);
        }
        
        h1 {
            color: var(--accent-cyan);
            font-size: 2.5em;
            text-shadow: 0 0 20px rgba(0, 255, 255, 0.6);
            margin-bottom: 10px;
        }
        
        .back-link {
            display: inline-block;
            color: var(--accent-cyan);
            text-decoration: none;
            margin-bottom: 15px;
            transition: color 0.3s ease;
        }
        
        .back-link:hover {
            color: #33ffff;
            text-decoration: underline;
        }
        
        .subtitle {
            color: var(--text-secondary);
            font-size: 1.1em;
        }
        
        section {
            background: var(--bg-secondary);
            border-left: 4px solid var(--accent-cyan);
            padding: 25px;
            margin-bottom: 30px;
            border-radius: 8px;
        }
        
        h2 {
            color: var(--accent-magenta);
            font-size: 2em;
            margin-bottom: 15px;
            text-shadow: 0 0 10px rgba(255, 0, 128, 0.5);
        }
        
        h3 {
            color: var(--accent-cyan);
            font-size: 1.4em;
            margin: 25px 0 15px 0;
        }
        
        .function {
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
        }
        
        .function-sig {
            font-family: 'Courier New', Courier, monospace;
            font-size: 1.2em;
            color: var(--accent-yellow);
            margin-bottom: 15px;
            padding: 10px;
            background: var(--code-bg);
            border-radius: 4px;
            border-left: 3px solid var(--accent-yellow);
        }
        
        .param-list, .return-info {
            margin: 15px 0;
        }
        
        .param {
            padding: 8px 0;
            border-bottom: 1px solid var(--border);
        }
        
        .param:last-child {
            border-bottom: none;
        }
        
        .param-name {
            color: var(--accent-cyan);
            font-weight: bold;
            font-family: 'Courier New', Courier, monospace;
        }
        
        .param-type {
            color: var(--accent-magenta);
            font-style: italic;
            font-size: 0.9em;
        }
        
        .example {
            background: var(--code-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
            overflow-x: auto;
        }
        
        .example-title {
            color: var(--accent-yellow);
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        pre {
            margin: 0;
            font-family: 'Courier New', Courier, monospace;
            line-height: 1.5;
        }
        
        code {
            color: var(--text-primary);
        }
        
        .note {
            background: var(--bg-tertiary);
            border-left: 4px solid var(--accent-yellow);
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
        }
        
        .note-title {
            color: var(--accent-yellow);
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border: 1px solid var(--border);
        }
        
        th {
            background: var(--bg-tertiary);
            color: var(--accent-cyan);
            font-weight: bold;
        }
        
        tr:nth-child(even) {
            background: var(--bg-tertiary);
        }
        
        footer {
            text-align: center;
            padding: 30px 20px;
            color: var(--text-secondary);
            border-top: 1px solid var(--border);
            margin-top: 40px;
        }
        
        ul {
            margin-left: 20px;
            margin-top: 10px;
        }
        
        li {
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="index.html" class="back-link">← Back to Documentation Index</a>
        
        <header>
            <h1>${icon} ${title}</h1>
            <p class="subtitle">${subtitle}</p>
        </header>

        ${sectionsHTML}

        <footer>
            <p>Nova64 Fantasy Console © 2025 | <a href="index.html" style="color: var(--accent-cyan);">Back to Documentation</a></p>
        </footer>
    </div>
</body>
</html>`;
}

// API configurations
const apis = {
  'api-3d.html': {
    title: '3D Graphics API',
    subtitle: 'Complete 3D rendering system using Three.js for meshes, materials, lighting, and cameras',
    icon: '🎮',
    sections: [
      {
        title: '📋 Overview',
        description: '<p>The 3D Graphics API provides a complete Three.js-powered 3D rendering system with mesh management, primitive shapes, material system, lighting, and GLB model loading.</p>',
        note: {
          title: '💡 Key Features',
          content: '<ul><li><strong>Mesh Management</strong> - ID-based system for creating and destroying 3D objects</li><li><strong>Primitive Shapes</strong> - Cubes, spheres, planes with N64-style materials</li><li><strong>Material System</strong> - PBR materials with color, texture, and metalness</li><li><strong>Model Loading</strong> - GLB/GLTF model support with async loading</li><li><strong>Lighting</strong> - Directional, point, and ambient lights with shadows</li></ul>'
        }
      },
      {
        title: '🎨 Mesh Creation',
        functions: [
          {
            signature: 'createCube(size, color, position, options)',
            description: 'Creates a cube mesh with the specified properties.',
            params: [
              { name: 'size', type: 'number', desc: 'Cube dimensions (default: 1)' },
              { name: 'color', type: 'hex number', desc: 'Color in hex format (e.g., 0xff0000 for red)' },
              { name: 'position', type: 'array [x, y, z]', desc: 'Initial position (default: [0, 0, 0])' },
              { name: 'options', type: 'object', desc: 'Material options (metalness, roughness, etc.)' }
            ],
            returns: { type: 'number', desc: 'Mesh ID for later reference' },
            example: 'const cubeId = createCube(2, 0xff0000, [0, 1, 0], { metalness: 0.5 });'
          },
          {
            signature: 'createSphere(radius, color, position, segments, options)',
            description: 'Creates a sphere mesh.',
            params: [
              { name: 'radius', type: 'number', desc: 'Sphere radius (default: 1)' },
              { name: 'color', type: 'hex number', desc: 'Sphere color' },
              { name: 'position', type: 'array [x, y, z]', desc: 'Initial position' },
              { name: 'segments', type: 'number', desc: 'Detail level (default: 8)' },
              { name: 'options', type: 'object', desc: 'Material options' }
            ],
            returns: { type: 'number', desc: 'Mesh ID' },
            example: 'const ballId = createSphere(1.5, 0x00ff00, [5, 2, 0], 16);'
          },
          {
            signature: 'createPlane(width, height, color, position)',
            description: 'Creates a flat plane mesh (ground, walls, etc.).',
            params: [
              { name: 'width', type: 'number', desc: 'Plane width' },
              { name: 'height', type: 'number', desc: 'Plane height' },
              { name: 'color', type: 'hex number', desc: 'Plane color' },
              { name: 'position', type: 'array [x, y, z]', desc: 'Initial position' }
            ],
            returns: { type: 'number', desc: 'Mesh ID' },
            example: 'const groundId = createPlane(100, 100, 0x808080, [0, -1, 0]);'
          }
        ]
      },
      {
        title: '🔧 Mesh Management',
        functions: [
          {
            signature: 'getMesh(meshId)',
            description: 'Retrieves a mesh object by its ID for direct manipulation.',
            params: [
              { name: 'meshId', type: 'number', desc: 'ID returned from create function' }
            ],
            returns: { type: 'THREE.Mesh', desc: 'Three.js mesh object' },
            example: 'const mesh = getMesh(cubeId);\nmesh.rotation.y += 0.01;'
          },
          {
            signature: 'destroyMesh(meshId)',
            description: 'Removes a mesh and frees its resources.',
            params: [
              { name: 'meshId', type: 'number', desc: 'Mesh ID to destroy' }
            ],
            returns: { type: 'void', desc: 'No return value' },
            example: 'destroyMesh(cubeId); // Clean up'
          }
        ]
      },
      {
        title: '📦 Model Loading',
        functions: [
          {
            signature: 'loadModel(url, position, scale)',
            description: 'Loads a GLB/GLTF 3D model asynchronously.',
            params: [
              { name: 'url', type: 'string', desc: 'Path to .glb or .gltf file' },
              { name: 'position', type: 'array [x, y, z]', desc: 'Model position (default: [0,0,0])' },
              { name: 'scale', type: 'number', desc: 'Uniform scale multiplier (default: 1)' }
            ],
            returns: { type: 'Promise<number>', desc: 'Promise resolving to mesh ID' },
            example: 'const modelId = await loadModel("/models/character.glb", [0, 0, 0], 2);'
          }
        ]
      },
      {
        title: '💡 Lighting',
        functions: [
          {
            signature: 'addDirectionalLight(color, intensity, position)',
            description: 'Adds a directional light (like the sun).',
            params: [
              { name: 'color', type: 'hex number', desc: 'Light color' },
              { name: 'intensity', type: 'number', desc: 'Light strength (0-1)' },
              { name: 'position', type: 'array [x, y, z]', desc: 'Light direction' }
            ],
            returns: { type: 'THREE.Light', desc: 'Light object' },
            example: 'addDirectionalLight(0xffffff, 1.0, [10, 20, 5]);'
          },
          {
            signature: 'addAmbientLight(color, intensity)',
            description: 'Adds ambient light (overall scene brightness).',
            params: [
              { name: 'color', type: 'hex number', desc: 'Light color' },
              { name: 'intensity', type: 'number', desc: 'Light strength' }
            ],
            returns: { type: 'THREE.Light', desc: 'Light object' },
            example: 'addAmbientLight(0x404040, 0.5);'
          }
        ]
      }
    ]
  },
  
  'api-sprites.html': {
    title: 'Sprite System',
    subtitle: 'Retro-style 8×8 sprite rendering with animations and transformations',
    icon: '👾',
    sections: [
      {
        title: '📋 Overview',
        description: '<p>The Sprite System provides classic 2D sprite rendering perfect for retro games. Sprites are 8×8 pixel tiles that can be animated, flipped, and layered.</p>',
        note: {
          title: '💡 Key Features',
          content: '<ul><li><strong>8×8 Tile System</strong> - Classic retro sprite size</li><li><strong>Sprite Sheets</strong> - Multiple sprites in one image</li><li><strong>Animations</strong> - Frame-based sprite animation</li><li><strong>Transformations</strong> - Flip horizontal/vertical</li><li><strong>Layering</strong> - Z-index support for sprite ordering</li></ul>'
        }
      },
      {
        title: '🎨 Sprite Functions',
        functions: [
          {
            signature: 'spr(spriteIndex, x, y, flipX, flipY)',
            description: 'Draws a sprite from the sprite sheet.',
            params: [
              { name: 'spriteIndex', type: 'number', desc: 'Sprite number in sheet (0-255)' },
              { name: 'x, y', type: 'number', desc: 'Screen coordinates' },
              { name: 'flipX', type: 'boolean', desc: 'Flip horizontally (default: false)' },
              { name: 'flipY', type: 'boolean', desc: 'Flip vertically (default: false)' }
            ],
            returns: { type: 'void', desc: 'No return value' },
            example: 'spr(5, playerX, playerY, facingLeft); // Draw player sprite'
          },
          {
            signature: 'loadSpriteSheet(imageUrl)',
            description: 'Loads a sprite sheet image.',
            params: [
              { name: 'imageUrl', type: 'string', desc: 'Path to sprite sheet PNG' }
            ],
            returns: { type: 'Promise', desc: 'Promise that resolves when loaded' },
            example: 'await loadSpriteSheet("/sprites/characters.png");'
          }
        ]
      }
    ]
  },
  
  'api-skybox.html': {
    title: 'Skybox API',
    subtitle: 'Beautiful space backgrounds with stars, nebulae, and procedural effects',
    icon: '🌌',
    sections: [
      {
        title: '📋 Overview',
        description: '<p>The Skybox API creates stunning space backgrounds with procedural star fields, colorful nebulae, galaxy spirals, and atmospheric fog perfect for space games.</p>',
        note: {
          title: '💡 Key Features',
          content: '<ul><li><strong>Procedural Stars</strong> - Thousands of stars with depth and twinkling</li><li><strong>Nebula Effects</strong> - Colorful cloud gradients</li><li><strong>Galaxy Spirals</strong> - Rotating galaxy arms</li><li><strong>Fog System</strong> - Distance-based atmospheric effects</li><li><strong>Performance</strong> - Optimized rendering for smooth 60 FPS</li></ul>'
        }
      },
      {
        title: '🌟 Skybox Functions',
        functions: [
          {
            signature: 'createSpaceSkybox(options)',
            description: 'Creates a complete space environment.',
            params: [
              { name: 'options.starCount', type: 'number', desc: 'Number of stars (default: 5000)' },
              { name: 'options.nebulaColor', type: 'hex', desc: 'Nebula color tint' },
              { name: 'options.galaxySpiral', type: 'boolean', desc: 'Include galaxy spiral (default: false)' }
            ],
            returns: { type: 'object', desc: 'Skybox object' },
            example: 'createSpaceSkybox({ starCount: 10000, nebulaColor: 0x8800ff });'
          },
          {
            signature: 'setSkyboxRotation(x, y, z)',
            description: 'Rotates the skybox (animated background).',
            params: [
              { name: 'x, y, z', type: 'number', desc: 'Rotation in radians' }
            ],
            returns: { type: 'void', desc: 'No return value' },
            example: 'setSkyboxRotation(0, time * 0.001, 0);'
          }
        ]
      }
    ]
  },
  
  'api-effects.html': {
    title: 'Visual Effects',
    subtitle: 'Post-processing effects like bloom, chromatic aberration, and CRT scanlines',
    icon: '✨',
    sections: [
      {
        title: '📋 Overview',
        description: '<p>The Effects API provides stunning post-processing effects to enhance your game\'s visual style, from retro CRT effects to modern bloom and color grading.</p>',
        note: {
          title: '💡 Available Effects',
          content: '<ul><li><strong>Bloom</strong> - Glow effect for lights and bright objects</li><li><strong>Chromatic Aberration</strong> - RGB color split for retro/glitch aesthetic</li><li><strong>CRT Scanlines</strong> - Classic monitor effect</li><li><strong>FXAA</strong> - Fast anti-aliasing for smooth edges</li><li><strong>Color Grading</strong> - Adjust brightness, contrast, saturation</li></ul>'
        }
      },
      {
        title: '✨ Effect Functions',
        functions: [
          {
            signature: 'enableBloom(intensity, threshold)',
            description: 'Enables bloom glow effect.',
            params: [
              { name: 'intensity', type: 'number', desc: 'Bloom strength (0-3, default: 1)' },
              { name: 'threshold', type: 'number', desc: 'Brightness threshold (0-1, default: 0.8)' }
            ],
            returns: { type: 'void', desc: 'No return value' },
            example: 'enableBloom(1.5, 0.7); // Strong bloom effect'
          },
          {
            signature: 'enableChromaticAberration(strength)',
            description: 'Enables RGB color split effect.',
            params: [
              { name: 'strength', type: 'number', desc: 'Effect intensity (0-0.05, default: 0.002)' }
            ],
            returns: { type: 'void', desc: 'No return value' },
            example: 'enableChromaticAberration(0.005);'
          },
          {
            signature: 'enableScanlines(intensity)',
            description: 'Enables CRT scanline effect.',
            params: [
              { name: 'intensity', type: 'number', desc: 'Scanline darkness (0-1, default: 0.3)' }
            ],
            returns: { type: 'void', desc: 'No return value' },
            example: 'enableScanlines(0.5); // Retro CRT look'
          }
        ]
      }
    ]
  },
  
  'api-voxel.html': {
    title: 'Voxel Engine',
    subtitle: 'Minecraft-style voxel world with chunk management and block manipulation',
    icon: '🧱',
    sections: [
      {
        title: '📋 Overview',
        description: '<p>The Voxel Engine provides a complete Minecraft-style block world system with efficient chunk-based rendering, block types, and world generation.</p>',
        note: {
          title: '💡 Key Features',
          content: '<ul><li><strong>Chunk System</strong> - Efficient 16×16×16 chunk loading</li><li><strong>Block Types</strong> - Multiple block materials (grass, stone, wood, etc.)</li><li><strong>Meshing</strong> - Optimized face culling and greedy meshing</li><li><strong>World Gen</strong> - Procedural terrain generation</li><li><strong>Dig/Place</strong> - Interactive block manipulation</li></ul>'
        }
      },
      {
        title: '🧱 Voxel Functions',
        functions: [
          {
            signature: 'createVoxelWorld(size)',
            description: 'Creates a new voxel world.',
            params: [
              { name: 'size', type: 'number', desc: 'World size in chunks (e.g., 8 = 8×8×8 chunks)' }
            ],
            returns: { type: 'object', desc: 'Voxel world object' },
            example: 'const world = createVoxelWorld(8);'
          },
          {
            signature: 'setBlock(x, y, z, blockType)',
            description: 'Places or removes a block.',
            params: [
              { name: 'x, y, z', type: 'number', desc: 'Block coordinates' },
              { name: 'blockType', type: 'number', desc: 'Block ID (0=air, 1=grass, 2=stone, etc.)' }
            ],
            returns: { type: 'void', desc: 'No return value' },
            example: 'setBlock(10, 5, 10, 1); // Place grass block'
          },
          {
            signature: 'getBlock(x, y, z)',
            description: 'Gets the block type at coordinates.',
            params: [
              { name: 'x, y, z', type: 'number', desc: 'Block coordinates' }
            ],
            returns: { type: 'number', desc: 'Block type ID' },
            example: 'if (getBlock(x, y, z) === 0) { /* air */ }'
          }
        ]
      }
    ]
  },
  
  'physics.html': {
    title: 'Physics Engine',
    subtitle: 'Simple physics simulation with gravity, velocity, and forces',
    icon: '⚛️',
    sections: [
      {
        title: '📋 Overview',
        description: '<p>The Physics Engine provides basic 2D/3D physics simulation including gravity, velocity, acceleration, and force application perfect for platformers and arcade games.</p>',
        note: {
          title: '💡 Key Features',
          content: '<ul><li><strong>Gravity</strong> - Automatic downward force</li><li><strong>Velocity</strong> - Object movement with speed and direction</li><li><strong>Acceleration</strong> - Force-based movement</li><li><strong>Particle Systems</strong> - Efficient multi-object physics</li></ul>'
        }
      },
      {
        title: '⚛️ Physics Functions',
        functions: [
          {
            signature: 'applyGravity(object, gravity)',
            description: 'Applies gravity force to an object.',
            params: [
              { name: 'object', type: 'object', desc: 'Object with velocityY property' },
              { name: 'gravity', type: 'number', desc: 'Gravity strength (e.g., 0.5)' }
            ],
            returns: { type: 'void', desc: 'No return value' },
            example: 'applyGravity(player, 0.8);'
          },
          {
            signature: 'updateVelocity(object)',
            description: 'Updates object position based on velocity.',
            params: [
              { name: 'object', type: 'object', desc: 'Object with x, y, velocityX, velocityY' }
            ],
            returns: { type: 'void', desc: 'No return value' },
            example: 'updateVelocity(player);'
          }
        ]
      }
    ]
  },
  
  'collision.html': {
    title: 'Collision Detection',
    subtitle: 'AABB, circle, and tilemap collision detection utilities',
    icon: '💥',
    sections: [
      {
        title: '📋 Overview',
        description: '<p>The Collision Detection system provides fast and accurate collision checking for boxes (AABB), circles, and tile-based maps.</p>',
        note: {
          title: '💡 Collision Types',
          content: '<ul><li><strong>AABB</strong> - Axis-Aligned Bounding Box (rectangles)</li><li><strong>Circle</strong> - Circular collision detection</li><li><strong>Tilemap</strong> - Grid-based collision for platformers</li><li><strong>Raycasting</strong> - Line-of-sight checks</li></ul>'
        }
      },
      {
        title: '💥 Collision Functions',
        functions: [
          {
            signature: 'checkAABB(box1, box2)',
            description: 'Checks if two axis-aligned boxes overlap.',
            params: [
              { name: 'box1', type: 'object {x, y, width, height}', desc: 'First box' },
              { name: 'box2', type: 'object {x, y, width, height}', desc: 'Second box' }
            ],
            returns: { type: 'boolean', desc: 'true if boxes overlap' },
            example: 'if (checkAABB(player, enemy)) { /* collision! */ }'
          },
          {
            signature: 'checkCircle(circle1, circle2)',
            description: 'Checks if two circles overlap.',
            params: [
              { name: 'circle1', type: 'object {x, y, radius}', desc: 'First circle' },
              { name: 'circle2', type: 'object {x, y, radius}', desc: 'Second circle' }
            ],
            returns: { type: 'boolean', desc: 'true if circles overlap' },
            example: 'if (checkCircle(ball, hole)) { /* scored! */ }'
          }
        ]
      }
    ]
  },
  
  'storage.html': {
    title: 'Storage API',
    subtitle: 'LocalStorage wrapper for saving and loading game data',
    icon: '💾',
    sections: [
      {
        title: '📋 Overview',
        description: '<p>The Storage API provides easy save/load functionality using browser LocalStorage for persisting game state, high scores, and settings.</p>'
      },
      {
        title: '💾 Storage Functions',
        functions: [
          {
            signature: 'save(key, value)',
            description: 'Saves data to LocalStorage.',
            params: [
              { name: 'key', type: 'string', desc: 'Storage key name' },
              { name: 'value', type: 'any', desc: 'Data to save (auto-serialized to JSON)' }
            ],
            returns: { type: 'void', desc: 'No return value' },
            example: 'save("highScore", 1000);'
          },
          {
            signature: 'load(key, defaultValue)',
            description: 'Loads data from LocalStorage.',
            params: [
              { name: 'key', type: 'string', desc: 'Storage key name' },
              { name: 'defaultValue', type: 'any', desc: 'Value if key doesn\'t exist' }
            ],
            returns: { type: 'any', desc: 'Loaded data or default value' },
            example: 'const score = load("highScore", 0);'
          }
        ]
      }
    ]
  },
  
  'screens.html': {
    title: 'Screen Manager',
    subtitle: 'Multi-screen game state management (title, gameplay, game over)',
    icon: '📺',
    sections: [
      {
        title: '�� Overview',
        description: '<p>The Screen Manager handles transitions between different game states like title screen, gameplay, pause menu, and game over.</p>',
        note: {
          title: '💡 Screen Lifecycle',
          content: '<ul><li><strong>init()</strong> - Called when screen is created</li><li><strong>enter()</strong> - Called when switching to this screen</li><li><strong>update()</strong> - Called every frame while active</li><li><strong>draw()</strong> - Render the screen</li><li><strong>exit()</strong> - Called when leaving screen</li></ul>'
        }
      },
      {
        title: '📺 Screen Functions',
        functions: [
          {
            signature: 'addScreen(name, screenObject)',
            description: 'Registers a new screen.',
            params: [
              { name: 'name', type: 'string', desc: 'Screen identifier' },
              { name: 'screenObject', type: 'object', desc: 'Object with init, update, draw methods' }
            ],
            returns: { type: 'void', desc: 'No return value' },
            example: 'addScreen("title", { update() {}, draw() {} });'
          },
          {
            signature: 'switchScreen(name)',
            description: 'Switches to a different screen.',
            params: [
              { name: 'name', type: 'string', desc: 'Screen name to switch to' }
            ],
            returns: { type: 'void', desc: 'No return value' },
            example: 'if (btnp(12)) switchScreen("gameplay");'
          }
        ]
      }
    ]
  },
  
  'textinput.html': {
    title: 'Text Input',
    subtitle: 'Keyboard text input handling for game UI',
    icon: '⌨️',
    sections: [
      {
        title: '📋 Overview',
        description: '<p>The Text Input system handles keyboard text entry for things like player names, chat, and text fields in menus.</p>'
      },
      {
        title: '⌨️ Text Functions',
        functions: [
          {
            signature: 'createTextInput(x, y, maxLength)',
            description: 'Creates a text input field.',
            params: [
              { name: 'x, y', type: 'number', desc: 'Position on screen' },
              { name: 'maxLength', type: 'number', desc: 'Maximum characters (default: 20)' }
            ],
            returns: { type: 'object', desc: 'Text input object' },
            example: 'const nameInput = createTextInput(100, 100, 10);'
          },
          {
            signature: 'updateTextInput(input)',
            description: 'Updates text input (call each frame).',
            params: [
              { name: 'input', type: 'object', desc: 'Text input object' }
            ],
            returns: { type: 'void', desc: 'No return value' },
            example: 'updateTextInput(nameInput);'
          },
          {
            signature: 'getInputText(input)',
            description: 'Gets the current text value.',
            params: [
              { name: 'input', type: 'object', desc: 'Text input object' }
            ],
            returns: { type: 'string', desc: 'Current text' },
            example: 'const name = getInputText(nameInput);'
          }
        ]
      }
    ]
  },
  
  'editor.html': {
    title: 'Sprite Editor',
    subtitle: 'Built-in pixel art editor for creating and editing sprites',
    icon: '🖌️',
    sections: [
      {
        title: '📋 Overview',
        description: '<p>The Sprite Editor is a built-in tool for creating and editing 8×8 pixel sprites directly in Nova64 with drawing tools and color palette.</p>',
        note: {
          title: '💡 Features',
          content: '<ul><li><strong>8×8 Grid</strong> - Classic sprite editor size</li><li><strong>Color Palette</strong> - 16-color palette selector</li><li><strong>Drawing Tools</strong> - Pen, fill, eraser</li><li><strong>Export/Import</strong> - Save sprites to file</li></ul>'
        }
      },
      {
        title: '🖌️ Editor Functions',
        functions: [
          {
            signature: 'openSpriteEditor()',
            description: 'Opens the sprite editor interface.',
            params: [],
            returns: { type: 'void', desc: 'No return value' },
            example: 'if (btnp(4)) openSpriteEditor();'
          },
          {
            signature: 'getSpriteData(index)',
            description: 'Gets pixel data for a sprite.',
            params: [
              { name: 'index', type: 'number', desc: 'Sprite index (0-255)' }
            ],
            returns: { type: 'array', desc: '64-element array of color indices' },
            example: 'const spriteData = getSpriteData(0);'
          }
        ]
      }
    ]
  },
  
  'fullscreen-button.html': {
    title: 'Fullscreen Button',
    subtitle: 'Universal fullscreen toggle button for all demos',
    icon: '🖥️',
    sections: [
      {
        title: '📋 Overview',
        description: '<p>The Fullscreen Button provides a user-friendly toggle for entering and exiting fullscreen mode, automatically positioned in the lower-right corner of every demo.</p>',
        note: {
          title: '💡 Features',
          content: '<ul><li><strong>One-Click Toggle</strong> - Enter/exit fullscreen easily</li><li><strong>ESC Key Support</strong> - Exit with Escape key</li><li><strong>Auto-Positioning</strong> - Fixed to bottom-right corner</li><li><strong>Cross-Browser</strong> - Works in all modern browsers</li><li><strong>Visual Feedback</strong> - Icon changes based on state</li></ul>'
        }
      },
      {
        title: '🖥️ Fullscreen Functions',
        functions: [
          {
            signature: 'createFullscreenButton(canvas)',
            description: 'Creates a fullscreen button for the canvas.',
            params: [
              { name: 'canvas', type: 'HTMLCanvasElement', desc: 'Canvas element to make fullscreen' }
            ],
            returns: { type: 'object', desc: 'FullscreenButton instance' },
            example: 'const fsButton = createFullscreenButton(canvas);'
          },
          {
            signature: 'toggleFullscreen()',
            description: 'Manually toggles fullscreen mode.',
            params: [],
            returns: { type: 'void', desc: 'No return value' },
            example: 'if (isKeyPressed("f")) toggleFullscreen();'
          }
        ]
      }
    ]
  },
  
  'console.html': {
    title: 'Console System',
    subtitle: 'Core runtime console for loading and managing game cartridges',
    icon: '🎬',
    sections: [
      {
        title: '📋 Overview',
        description: '<p>The Console System is the core runtime that loads game cartridges, manages the game loop, and provides the main Nova64 API to game code.</p>',
        note: {
          title: '💡 Console Features',
          content: '<ul><li><strong>Cart Loading</strong> - Load JavaScript game files</li><li><strong>Scene Management</strong> - Handle 2D and 3D scenes</li><li><strong>Lifecycle Hooks</strong> - init(), update(), draw() callbacks</li><li><strong>Error Handling</strong> - Graceful error recovery</li></ul>'
        }
      }
    ]
  },
  
  'framebuffer.html': {
    title: 'Framebuffer',
    subtitle: 'Low-level pixel buffer for 2D rendering operations',
    icon: '🖼️',
    sections: [
      {
        title: '📋 Overview',
        description: '<p>The Framebuffer provides direct pixel-level access to the 640×360 display buffer for advanced 2D rendering techniques.</p>',
        note: {
          title: '⚠️ Advanced API',
          content: '<p>This is a low-level API. Most games should use the higher-level 2D Drawing API instead.</p>'
        }
      }
    ]
  },
  
  'font.html': {
    title: 'Font System',
    subtitle: 'Bitmap font rendering for text display',
    icon: '🔤',
    sections: [
      {
        title: '📋 Overview',
        description: '<p>The Font System handles bitmap font rendering used by the print() function, providing retro-style text display.</p>',
        note: {
          title: '💡 Font Features',
          content: '<ul><li><strong>Bitmap Fonts</strong> - Pixel-perfect retro text</li><li><strong>Character Set</strong> - Full ASCII support</li><li><strong>Color Support</strong> - Any RGBA color</li><li><strong>Scaling</strong> - Integer scaling for larger text</li></ul>'
        }
      }
    ]
  },
  
  'assets.html': {
    title: 'Asset Loader',
    subtitle: 'Loading and caching of images, sounds, and models',
    icon: '📦',
    sections: [
      {
        title: '📋 Overview',
        description: '<p>The Asset Loader manages loading and caching of game resources including images, audio files, and 3D models.</p>',
        note: {
          title: '💡 Asset Types',
          content: '<ul><li><strong>Images</strong> - PNG, JPG for sprites and textures</li><li><strong>Sounds</strong> - MP3, WAV, OGG audio files</li><li><strong>Models</strong> - GLB/GLTF 3D models</li><li><strong>Caching</strong> - Automatic resource caching</li></ul>'
        }
      },
      {
        title: '📦 Asset Functions',
        functions: [
          {
            signature: 'loadImage(url)',
            description: 'Loads an image file.',
            params: [
              { name: 'url', type: 'string', desc: 'Path to image file' }
            ],
            returns: { type: 'Promise<Image>', desc: 'Promise resolving to image' },
            example: 'const img = await loadImage("/sprites/player.png");'
          },
          {
            signature: 'loadSound(url)',
            description: 'Loads an audio file.',
            params: [
              { name: 'url', type: 'string', desc: 'Path to audio file' }
            ],
            returns: { type: 'Promise<AudioBuffer>', desc: 'Promise resolving to audio' },
            example: 'const sfx = await loadSound("/sounds/jump.mp3");'
          }
        ]
      }
    ]
  },
  
  'gpu-systems.html': {
    title: 'GPU Systems',
    subtitle: 'Low-level rendering backends (Canvas2D, WebGL2, Three.js)',
    icon: '🎨',
    sections: [
      {
        title: '📋 Overview',
        description: '<p>Nova64 uses multiple GPU backends to provide flexible rendering options: Three.js for 3D, WebGL2 for advanced effects, and Canvas2D as a fallback.</p>',
        note: {
          title: '💡 GPU Backends',
          content: '<ul><li><strong>Three.js (Primary)</strong> - Full 3D acceleration for 3D scenes</li><li><strong>WebGL2</strong> - Custom shaders and effects</li><li><strong>Canvas2D (Fallback)</strong> - Software rendering for compatibility</li></ul>'
        }
      }
    ]
  }
};

// Generate all documentation files
const docsDir = path.join(__dirname, 'docs');

let created = 0;
let updated = 0;

for (const [filename, config] of Object.entries(apis)) {
  const filepath = path.join(docsDir, filename);
  const html = generateDocPage(config);
  
  // Check if file exists
  const exists = fs.existsSync(filepath);
  
  fs.writeFileSync(filepath, html, 'utf-8');
  
  if (exists) {
    updated++;
    console.log(`✓ Updated: ${filename}`);
  } else {
    created++;
    console.log(`✓ Created: ${filename}`);
  }
}

console.log(`\n✅ Documentation generation complete!`);
console.log(`   Created: ${created} files`);
console.log(`   Updated: ${updated} files`);
console.log(`   Total: ${created + updated} files\n`);
