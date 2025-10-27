#!/usr/bin/env node

// Script to generate remaining Nova64 API documentation pages
// This generates stub pages for all remaining APIs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const template = (title, icon, subtitle, overviewText, features) => `<!DOCTYPE html>
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
            <p>${overviewText}</p>
            
            <div class="note">
                <div class="note-title">💡 Key Features</div>
                <ul>
${features.map(f => `                    <li>${f}</li>`).join('\n')}
                </ul>
            </div>
            
            <div class="note">
                <div class="note-title">📝 Documentation Status</div>
                <p>This page is currently a stub. Detailed function documentation, parameters, examples, and usage tips will be added soon.</p>
                <p>For now, refer to the source code in <code>runtime/${title.toLowerCase().replace(/ /g, '-')}.js</code> or check the examples in the <code>examples/</code> directory.</p>
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
        filename: 'api-3d.html',
        title: '3D Graphics API',
        icon: '🎮',
        subtitle: 'Three.js-powered 3D rendering with meshes, materials, lighting, and GLB models',
        overview: 'The 3D Graphics API provides comprehensive 3D rendering capabilities using Three.js. Create primitive shapes (cubes, spheres, planes), load GLB/GLTF models, manage materials with PBR properties, and control lighting and shadows.',
        features: [
            '<strong>Primitive Shapes</strong> - createCube(), createSphere(), createPlane()',
            '<strong>GLB Model Loading</strong> - Load and display 3D models',
            '<strong>Material System</strong> - PBR materials with color, metalness, roughness',
            '<strong>Lighting & Shadows</strong> - Dynamic lighting with shadow casting',
            '<strong>Mesh Management</strong> - ID-based mesh tracking and manipulation'
        ]
    },
    {
        filename: 'api-sprites.html',
        title: 'Sprite System',
        icon: '👾',
        subtitle: 'Retro sprite rendering with animations, sprite sheets, and tilemaps',
        overview: 'The Sprite System handles 8×8 pixel sprite rendering with sprite sheet support. Load sprite sheets, draw individual sprites with flipping and scaling, and render tilemaps for level design.',
        features: [
            '<strong>8×8 Sprites</strong> - Classic tile-based sprite system',
            '<strong>Sprite Sheets</strong> - Load and manage sprite sheet textures',
            '<strong>Transformations</strong> - Flip, scale, and parallax scrolling',
            '<strong>Tilemap Rendering</strong> - Draw levels from map data',
            '<strong>Camera Integration</strong> - Automatic camera offset application'
        ]
    },
    {
        filename: 'api-skybox.html',
        title: 'Skybox API',
        icon: '🌌',
        subtitle: 'Beautiful space backgrounds with procedural stars, nebulae, and fog',
        overview: 'The Skybox API creates immersive space backgrounds with procedural star fields, colored nebulae, and galaxy effects. Perfect for space games and sci-fi demos.',
        features: [
            '<strong>Procedural Stars</strong> - Thousands of randomized stars with colors',
            '<strong>Nebula Gradients</strong> - Beautiful background gradients',
            '<strong>Fog System</strong> - Distance fog for atmosphere',
            '<strong>Animation</strong> - Rotating star fields and effects',
            '<strong>Customizable</strong> - Control star count, colors, and density'
        ]
    },
    {
        filename: 'api-effects.html',
        title: 'Visual Effects',
        icon: '✨',
        subtitle: 'Post-processing effects: bloom, chromatic aberration, scanlines, FXAA',
        overview: 'The Visual Effects API adds post-processing shaders for cinematic visuals. Apply bloom glow, chromatic aberration, CRT scanlines, and anti-aliasing.',
        features: [
            '<strong>Bloom Effect</strong> - Glow around bright areas',
            '<strong>Chromatic Aberration</strong> - Color fringe effect',
            '<strong>CRT Scanlines</strong> - Retro monitor effect',
            '<strong>FXAA</strong> - Fast approximate anti-aliasing',
            '<strong>Compositing</strong> - Layer multiple effects'
        ]
    },
    {
        filename: 'api-voxel.html',
        title: 'Voxel Engine',
        icon: '🧱',
        subtitle: 'Minecraft-style voxel worlds with chunk management and block manipulation',
        overview: 'The Voxel Engine provides a Minecraft-style block world system. Create and manipulate voxel terrain with efficient chunk-based rendering and collision detection.',
        features: [
            '<strong>Chunk System</strong> - Efficient terrain management',
            '<strong>Block Types</strong> - Multiple block materials and textures',
            '<strong>World Generation</strong> - Procedural terrain creation',
            '<strong>Block Manipulation</strong> - Place and destroy blocks',
            '<strong>Optimized Meshing</strong> - Fast greedy meshing algorithm'
        ]
    },
    {
        filename: 'physics.html',
        title: 'Physics Engine',
        icon: '⚛️',
        subtitle: 'Simple physics simulation with gravity, velocity, and tile collision',
        overview: 'The Physics Engine provides arcade-style physics simulation. Create physics bodies with gravity, velocity, friction, and automatic tilemap collision resolution.',
        features: [
            '<strong>Gravity Simulation</strong> - Configurable gravity force',
            '<strong>Velocity & Acceleration</strong> - Smooth movement physics',
            '<strong>Tile Collision</strong> - Automatic AABB vs tilemap',
            '<strong>Ground Detection</strong> - onGround flag for jumping',
            '<strong>Friction & Restitution</strong> - Bounce and slide effects'
        ]
    },
    {
        filename: 'collision.html',
        title: 'Collision Detection',
        icon: '💥',
        subtitle: 'AABB box collision, circle collision, and tilemap raycasting',
        overview: 'The Collision Detection API provides utilities for detecting overlaps between game objects. Test AABB rectangles, circles, and perform tilemap raycasts.',
        features: [
            '<strong>AABB Collision</strong> - Axis-aligned bounding box tests',
            '<strong>Circle Collision</strong> - Circle-circle intersection',
            '<strong>Tilemap Raycast</strong> - Line-of-sight checks',
            '<strong>Collision Response</strong> - Helper functions for physics',
            '<strong>Optimized</strong> - Fast collision checks for many objects'
        ]
    },
    {
        filename: 'storage.html',
        title: 'Storage API',
        icon: '💾',
        subtitle: 'Save and load game data with localStorage wrapper',
        overview: 'The Storage API wraps browser localStorage for easy game state persistence. Save high scores, settings, and player progress.',
        features: [
            '<strong>Save/Load</strong> - Simple key-value storage',
            '<strong>JSON Serialization</strong> - Automatic object serialization',
            '<strong>Persistent</strong> - Data survives browser restarts',
            '<strong>Namespacing</strong> - Avoid conflicts with other games',
            '<strong>Error Handling</strong> - Graceful localStorage failures'
        ]
    },
    {
        filename: 'screens.html',
        title: 'Screen Manager',
        icon: '📺',
        subtitle: 'Multi-screen game state management with transitions',
        overview: 'The Screen Manager handles game states like title screen, gameplay, pause menu, and game over. Each screen has its own init, update, and draw functions.',
        features: [
            '<strong>Screen System</strong> - Title, gameplay, game over screens',
            '<strong>State Transitions</strong> - Smooth screen switching',
            '<strong>Lifecycle Hooks</strong> - init(), enter(), exit(), update(), draw()',
            '<strong>Screen Stack</strong> - Push/pop screens for menus',
            '<strong>Auto-Management</strong> - Framework handles screen logic'
        ]
    }
];

// Generate pages
const docsDir = path.join(__dirname, 'docs');
if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
}

pages.forEach(page => {
    const html = template(page.title, page.icon, page.subtitle, page.overview, page.features);
    const filepath = path.join(docsDir, page.filename);
    fs.writeFileSync(filepath, html, 'utf8');
    console.log(`✅ Created: ${page.filename}`);
});

console.log(`\n🎉 Generated ${pages.length} documentation pages!`);
