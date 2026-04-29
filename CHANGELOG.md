# Changelog

All notable changes to Nova64 are documented here.

## v0.4.9 (Current)

- **OS9 Shell cart launching**: Fixed Game Studio demo loading, Game Launcher cart routing, and Nova HD demoscene startup to use the standard cart runner path.
- **Game Studio executor**: Removed API parameter injection that collided with modern `nova64.*` destructuring patterns.
- **Regression coverage**: Added tests for OS shell cart URL helpers, Game Launcher catalog paths, and Game Studio cart execution.

## v0.4.8

- **hyperNova**: HyperCard/Flash-inspired authoring tool with card stacks, NovaTalk scripting, symbol library, keyframe timelines, and GSAP tweens
- **Internationalization (i18n)**: Full EN/ES/JA support across main site, console, and OS9 shell with runtime `t()` API for carts
- **Debug Panel**: F9 overlay with scene graph, camera inspector, lights editor, and Three.js DevTools bridge
- **TSL Shader Pack**: Custom Three.js Shading Language effects
- **60+ Demo Carts**: Expanded gallery including shader showcase, blend modes, camera platformer, VR/AR demos
- **OS9 Shell Enhancements**: Screensaver system, theme toggle, locale-aware menus, eMU emulator

## v0.4.0

- **OS9 Desktop Shell**: Full Mac OS 9-style GUI with window management, taskbar, app launcher
- **Game Studio**: In-browser IDE with code editor, live preview, reliable cart switching
- **Model Viewer**: GLB/GLTF with Draco support, DOOM WAD maps with textures/sprites
- **Voxel Engine**: Minecraft-style worlds with chunks, biomes, entities, fluid simulation
- **47 Demo Carts**: Massive expansion of example games and demos
- **Effects API**: N64/PSX/LowPoly retro modes, bloom, vignette, glitch effects
- **Game Utilities**: Shake, cooldowns, spawners, pools, floating text, minimaps, state machines
- **Skybox System**: Space, gradient, and solid skyboxes with auto-animation

## v0.3.x

- **Game Studio Fixes**: Cart switching race conditions, iframe lifecycle management
- **WAD Rendering**: Full DOOM WAD texture/flat/sprite rendering in Model Viewer
- **GLB Draco**: DRACOLoader support for compressed 3D models
- **API Bug Fixes**: Identifier conflicts, scene cleanup, API injection robustness

## v0.2.0

- **Three.js Integration**: Complete transition to Three.js rendering pipeline
- **Advanced Materials**: Holographic, metallic, emissive materials
- **Cinematic Lighting**: Multi-layered lighting with 4K shadow mapping
- **UI System**: Buttons, panels, fonts, progress bars, start screens
- **8 Demo Carts**: Initial demo gallery

## v0.1.0

- **Core 2D API**: Pixel-perfect graphics with RGBA64 precision
- **WebGL2 Backend**: Hardware-accelerated rendering
- **Sprite System**: Batched rendering with animation
- **Physics & Audio**: 2D physics, WebAudio synthesis
