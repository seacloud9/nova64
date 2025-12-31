// runtime/console.js
export class Nova64 {
  constructor(gpu) {
    this.gpu = gpu;
    this.cart = null;
  }
  async loadCart(modulePath) {
    console.log('🧹 Clearing previous scene before loading new cart...');
    
    // CRITICAL: Null out cart FIRST to prevent old update() from running during transition
    this.cart = null;
    
    // Clear UI buttons and panels from previous cart
    if (typeof globalThis.clearButtons === 'function') {
      globalThis.clearButtons();
    }
    if (typeof globalThis.clearPanels === 'function') {
      globalThis.clearPanels();
    }
    
    // Reset screen manager to clear registered screens from previous cart
    if (globalThis.screens && typeof globalThis.screens.reset === 'function') {
      globalThis.screens.reset();
    }
    
    // Clear the 3D scene completely before loading new cart
    if (typeof globalThis.clearScene === 'function') {
      globalThis.clearScene();
    }
    
    // Also clear any skybox
    if (typeof globalThis.clearSkybox === 'function') {
      globalThis.clearSkybox();
    }
    
    // Reset camera to default position
    if (typeof globalThis.setCameraPosition === 'function') {
      globalThis.setCameraPosition(0, 5, 10);
    }
    if (typeof globalThis.setCameraTarget === 'function') {
      globalThis.setCameraTarget(0, 0, 0);
    }
    
    // Reset fog to default
    if (typeof globalThis.setFog === 'function') {
      globalThis.setFog(0x87ceeb, 50, 200);
    }
    
    console.log('✅ Scene cleared, loading new cart:', modulePath);
    
    const mod = await import(/* @vite-ignore */ (modulePath + '?t=' + Date.now()));
    this.cart = {
      init: mod.init || (()=>{}),
      update: mod.update || (()=>{}),
      draw: mod.draw || (()=>{})
    };
    this.cart.init();
  }
}
