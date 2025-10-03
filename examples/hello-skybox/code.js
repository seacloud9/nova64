// 🌌 EXAMPLE: Using the Nova64 Skybox API
// This example shows how easy it is to create beautiful space backgrounds

export async function init() {
  console.log('🎮 Space Game Starting...');
  
  // Setup camera
  setCameraPosition(0, 5, 15);
  setCameraTarget(0, 0, 0);
  
  // ⭐ CREATE BEAUTIFUL SKYBOX - ONE LINE! ⭐
  createSpaceSkybox({
    starCount: 2000,        // Number of stars
    starSize: 2.5,          // Size of star particles
    nebulae: true,          // Enable nebula gradient
    nebulaColor: 0x1a0033   // Purple nebula color
  });
  
  // Add atmospheric fog
  setFog(0x000511, 50, 300);
  
  // Setup lighting
  setLightDirection(-0.3, -1, -0.5);
  setLightColor(0xffffff);
  setAmbientLight(0x404060);
  
  // Create your game objects
  const ship = createCube(2, 0x0099ff, [0, 0, 0]);
  setScale(ship, 3, 1.5, 4);
  
  console.log('✅ Ready to play!');
}

export function update(dt) {
  // ⭐ ANIMATE SKYBOX - ONE LINE! ⭐
  animateSkybox(dt);
  
  // Your game logic here...
}

export function draw() {
  // Your 2D HUD here...
  print('SCORE: 0', 20, 20, rgba8(255, 255, 0, 255));
}

// That's it! Beautiful space background in 3 lines:
// 1. createSpaceSkybox({ ... });
// 2. setFog(...);
// 3. animateSkybox(dt);
