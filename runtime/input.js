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
    this.mouse = { x:0, y:0, down:false, prevDown: false };
    this.uiCallbacks = { setMousePosition: null, setMouseButton: null };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', e => { this.keys.set(e.code, true); });
      window.addEventListener('keyup', e => { this.keys.set(e.code, false); });
      window.addEventListener('blur', () => { this.keys.clear(); });
      
      // Mouse event listeners
      window.addEventListener('mousemove', e => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          // Scale mouse position to Nova64's 640x360 resolution
          this.mouse.x = Math.floor((e.clientX - rect.left) / rect.width * 640);
          this.mouse.y = Math.floor((e.clientY - rect.top) / rect.height * 360);
          
          console.log('🖱️ Input mousemove:', this.mouse.x, this.mouse.y);
          
          // Update UI system if connected
          if (this.uiCallbacks.setMousePosition) {
            this.uiCallbacks.setMousePosition(this.mouse.x, this.mouse.y);
          } else {
            console.warn('⚠️ UI callbacks not connected!');
          }
        } else {
          console.warn('⚠️ Canvas not found!');
        }
      });
      
      window.addEventListener('mousedown', e => {
        console.log('🖱️ Input mousedown');
        this.mouse.down = true;
        if (this.uiCallbacks.setMouseButton) {
          this.uiCallbacks.setMouseButton(true);
        } else {
          console.warn('⚠️ UI callbacks not connected!');
        }
      });
      
      window.addEventListener('mouseup', e => {
        console.log('🖱️ Input mouseup');
        this.mouse.down = false;
        if (this.uiCallbacks.setMouseButton) {
          this.uiCallbacks.setMouseButton(false);
        }
      });
    }
  }
  
  // Connect UI system callbacks
  connectUI(setMousePosition, setMouseButton) {
    this.uiCallbacks.setMousePosition = setMousePosition;
    this.uiCallbacks.setMouseButton = setMouseButton;
  }
  step() {
    this.prev = new Map(this.keys);
    this.mouse.prevDown = this.mouse.down;
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
        isKeyPressed: (code)=>input.isKeyPressed(code),
        // Mouse functions
        mouseX: () => input.mouse.x,
        mouseY: () => input.mouse.y,
        mouseDown: () => input.mouse.down,
        mousePressed: () => input.mouse.down && !input.mouse.prevDown
      });
    },
    step() { input.step(); },
    connectUI(setMousePosition, setMouseButton) {
      input.connectUI(setMousePosition, setMouseButton);
    }
  };
}
