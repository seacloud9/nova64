// runtime/input.js
const KEYMAP = {
  // arrows + Z X C V
  0: 'ArrowLeft',  // left
  1: 'ArrowRight', // right
  2: 'ArrowUp',    // up
  3: 'ArrowDown',  // down
  4: 'KeyZ',
  5: 'KeyX',
  6: 'KeyC',
  7: 'KeyV'
};

class Input {
  constructor() {
    this.keys = new Map();
    this.prev = new Map();
    this.mouse = { x:0, y:0, down:false };
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', e => { this.keys.set(e.code, true); });
      window.addEventListener('keyup', e => { this.keys.set(e.code, false); });
      window.addEventListener('blur', () => { this.keys.clear(); });
    }
  }
  step() {
    this.prev = new Map(this.keys);
  }
  btn(i) { return !!this.keys.get(KEYMAP[i|0] || ''); }
  btnp(i) { const code = KEYMAP[i|0] || ''; return !!this.keys.get(code) && !this.prev.get(code); }
  key(code) { return !!this.keys.get(code); } // Direct key code checking
  
  // Helper functions for easier key checking
  isKeyDown(keyCode) { 
    // Handle single character keys by converting to KeyCode format
    if (keyCode.length === 1) {
      keyCode = 'Key' + keyCode.toUpperCase();
    }
    return !!this.keys.get(keyCode); 
  }
  
  isKeyPressed(keyCode) { 
    // Handle single character keys by converting to KeyCode format
    if (keyCode.length === 1) {
      keyCode = 'Key' + keyCode.toUpperCase();
    }
    // Handle space key specially
    if (keyCode === ' ') keyCode = 'Space';
    return !!this.keys.get(keyCode) && !this.prev.get(keyCode); 
  }
}

export const input = new Input();

export function inputApi() {
  return {
    exposeTo(target) {
      Object.assign(target, {
        btn: (i)=>input.btn(i),
        btnp: (i)=>input.btnp(i),
        key: (code)=>input.key(code),
        isKeyDown: (code)=>input.isKeyDown(code),
        isKeyPressed: (code)=>input.isKeyPressed(code)
      });
    },
    step() { input.step(); }
  };
}
