// HELLO 3D WORLD - Simple Nintendo 64/PlayStation style 3D demo
// Demonstrates basic 3D rendering with GPU acceleration

let cubes = [];
let spheres = [];
let time = 0;
let cameraAngle = 0;

export async function init() {
  cls();
  
  // Setup 3D scene
  setCameraPosition(0, 5, 15);
  setCameraTarget(0, 0, 0);
  setCameraFOV(60);
  
  // Nintendo 64 style lighting
  setLightDirection(-0.5, -1, -0.3);
  setFog(0x202040, 20, 100);
  
  // Enable retro effects
  enablePixelation(1);
  enableDithering(true);
  
  // Create some basic 3D objects
  createScene();
  
  console.log('🎮 Hello 3D World - Nintendo 64/PlayStation style demo loaded!');
}

function createScene() {
  // Create stunning holographic spinning cubes with advanced materials
  const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
  const emissiveColors = [0x330000, 0x003300, 0x000033, 0x333300, 0x330033, 0x003333];
  
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const x = Math.cos(angle) * 8;
    const z = Math.sin(angle) * 8;
    
    // Create cube with enhanced visual effects
    const cube = createCube(2, colors[i], [x, 0, z]);
    
    cubes.push({
      mesh: cube,
      x: x, y: 0, z: z,
      rotationSpeed: 1 + Math.random() * 2,
      bobPhase: Math.random() * Math.PI * 2,
      glowPhase: Math.random() * Math.PI * 2
    });
  }
  
  // Create magical glowing spheres
  for (let i = 0; i < 4; i++) {
    const sphere = createSphere(1, 0x88ddff, [
      (Math.random() - 0.5) * 12,
      2 + Math.random() * 4,
      (Math.random() - 0.5) * 12
    ]);
    
    spheres.push({
      mesh: sphere,
      x: (Math.random() - 0.5) * 12,
      y: 2 + Math.random() * 4,
      z: (Math.random() - 0.5) * 12,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 2,
      vz: (Math.random() - 0.5) * 4,
      trail: []
    });
  }
  
  // Create stunning ground plane
  const ground = createPlane(40, 40, 0x444466, [0, -2, 0]);
  setRotation(ground, -Math.PI/2, 0, 0);
}

export function update(dt) {
  time += dt;
  
  // Rotate cubes
  cubes.forEach(cube => {
    cube.bobPhase += dt * 2;
    const bobY = Math.sin(cube.bobPhase) * 2;
    
    setPosition(cube.mesh, cube.x, bobY, cube.z);
    rotateMesh(cube.mesh, dt * cube.rotationSpeed, dt * cube.rotationSpeed * 0.7, 0);
  });
  
  // Bounce spheres
  spheres.forEach(sphere => {
    sphere.x += sphere.vx * dt;
    sphere.y += sphere.vy * dt;
    sphere.z += sphere.vz * dt;
    
    // Simple physics
    sphere.vy -= 9.8 * dt; // gravity
    
    // Ground bounce
    if (sphere.y < 1) {
      sphere.y = 1;
      sphere.vy *= -0.8;
    }
    
    // Wall bounds
    if (Math.abs(sphere.x) > 10) {
      sphere.vx *= -1;
      sphere.x = Math.sign(sphere.x) * 10;
    }
    if (Math.abs(sphere.z) > 10) {
      sphere.vz *= -1;
      sphere.z = Math.sign(sphere.z) * 10;
    }
    
    setPosition(sphere.mesh, sphere.x, sphere.y, sphere.z);
  });
  
  // Rotate camera
  cameraAngle += dt * 0.3;
  const camX = Math.cos(cameraAngle) * 15;
  const camZ = Math.sin(cameraAngle) * 15;
  
  setCameraPosition(camX, 8, camZ);
  setCameraTarget(0, 0, 0);
}

export function draw() {
  // Simple HUD
  print('🎮 HELLO 3D WORLD', 8, 8, rgba8(0, 255, 255, 255));
  print('Nintendo 64 / PlayStation Style', 8, 24, rgba8(255, 200, 0, 255));
  print(`Time: ${time.toFixed(1)}s`, 8, 40, rgba8(255, 255, 255, 255));
  print(`Objects: ${cubes.length + spheres.length + 1}`, 8, 56, rgba8(100, 255, 100, 255));
  
  // 3D Stats
  const stats = get3DStats();
  if (stats && stats.render) {
    print(`3D Meshes: ${stats.meshes || 0}`, 8, 72, rgba8(150, 150, 255, 255));
    print(`GPU: ${stats.renderer || 'Three.js'}`, 8, 88, rgba8(150, 150, 255, 255));
  }
  
  print('WASD: Move camera manually', 8, 320, rgba8(200, 200, 200, 200));
  print('Full GPU 3D acceleration with Three.js!', 8, 340, rgba8(100, 255, 100, 180));
}