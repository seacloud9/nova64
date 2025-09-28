// runtime/console.js
export class Nova64 {
  constructor(gpu) {
    this.gpu = gpu;
    this.cart = null;
  }
  async loadCart(modulePath) {
    const mod = await import(/* @vite-ignore */ (modulePath + '?t=' + Date.now()));
    this.cart = {
      init: mod.init || (()=>{}),
      update: mod.update || (()=>{}),
      draw: mod.draw || (()=>{})
    };
    this.cart.init();
  }
}
