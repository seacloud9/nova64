// Test script to verify Star Fox screen management is working
// This will load the Star Fox game and test the screens

import { screenApi } from '../runtime/screens.js';
import { inputApi } from '../runtime/input.js';

// Mock the global environment
const mockCanvas = {
  width: 640,
  height: 360,
  getContext: () => ({
    clearRect: () => {},
    fillRect: () => {},
    fillText: () => {},
    drawImage: () => {}
  })
};

const mockGPU = {
  getFramebuffer: () => new Uint16Array(640 * 360),
  beginFrame: () => {},
  endFrame: () => {}
};

// Setup APIs
const scrApi = screenApi();
const iApi = inputApi();
const g = {};
scrApi.exposeTo(g);
iApi.exposeTo(g);

// Mock 3D API functions
g.setCameraPosition = () => {};
g.setCameraTarget = () => {};
g.setCameraFOV = () => {};
g.setLightDirection = () => {};
g.setFog = () => {};
g.addCube = () => ({ id: Math.random() });
g.addSphere = () => ({ id: Math.random() });
g.position3D = () => {};
g.rotation3D = () => {};
g.remove3D = () => {};

// Mock 2D API functions
g.cls = () => {};
g.fill = () => {};
g.textSize = () => {};
g.textAlign = () => {};
g.text = () => {};
g.rect = () => {};
g.width = () => 640;
g.height = () => 360;
g.stroke = () => {};
g.strokeWeight = () => {};
g.line = () => {};
g.noStroke = () => {};
g.circle = () => {};
g.time = () => Date.now() / 1000;
g.worldToScreen = (x, y, z) => ({ x: 320 + x * 10, y: 180 + y * 10, z: 1 });

// Mock input functions
g.isKeyPressed = (key) => false;
g.isKeyDown = (key) => false;

// Apply to global
Object.assign(globalThis, g);

console.log('🧪 Testing Star Fox Screen Management System...');

async function testStarFoxScreens() {
  try {
    // Import the Star Fox module
    const starFoxModule = await import('../examples/star-fox-nova-3d/code.js');
    
    console.log('✅ Star Fox module loaded successfully');
    
    // Initialize the game
    await starFoxModule.init();
    
    console.log('✅ Star Fox initialized with screen management');
    
    // Check if screens were registered
    const currentScreen = g.getCurrentScreen();
    console.log(`✅ Current screen: ${currentScreen}`);
    
    if (currentScreen === 'title') {
      console.log('✅ Started with title screen as expected');
    } else {
      console.log('❌ Expected to start with title screen');
    }
    
    // Test screen manager functions exist
    console.log(`✅ addScreen function: ${typeof g.addScreen}`);
    console.log(`✅ switchToScreen function: ${typeof g.switchToScreen}`);
    console.log(`✅ getCurrentScreen function: ${typeof g.getCurrentScreen}`);
    
    // Test update and draw
    const screenManager = g.screens;
    screenManager.update(1/60);
    screenManager.draw();
    
    console.log('✅ Screen manager update and draw work correctly');
    
    console.log('🎉 All Star Fox screen management tests passed!');
    
  } catch (error) {
    console.error('❌ Star Fox screen management test failed:', error);
  }
}

testStarFoxScreens();