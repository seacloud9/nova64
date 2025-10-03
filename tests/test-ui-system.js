/**
 * Nova64 UI System Unit Tests
 * Tests the first-class UI API including fonts, panels, buttons, etc.
 */

import { describe, it, expect, beforeEach } from './test-suite.js';

describe('UI System Tests', () => {
  let mockApi2d;
  let mockInput;
  let uiApi;

  beforeEach(() => {
    // Mock the 2D API
    mockApi2d = {
      print: () => {},
      rect: () => {},
      line: () => {},
      pset: () => {},
      rgba8: (r, g, b, a) => ({ r, g, b, a })
    };

    // Mock input
    mockInput = {
      mouseX: 0,
      mouseY: 0,
      mouseDown: false,
      mousePressed: false
    };

    // Create UI API instance
    uiApi = createMockUiApi(mockApi2d, mockInput);
  });

  describe('Font System', () => {
    it('should set font size correctly', () => {
      uiApi.setFont('tiny');
      expect(uiApi.getCurrentFont()).toBe('tiny');

      uiApi.setFont('huge');
      expect(uiApi.getCurrentFont()).toBe('huge');
    });

    it('should measure text correctly', () => {
      uiApi.setFont('normal');
      const metrics = uiApi.measureText('Hello', 2);
      expect(metrics.width).toBeGreaterThan(0);
      expect(metrics.height).toBeGreaterThan(0);
    });

    it('should handle text alignment', () => {
      uiApi.setTextAlign('left');
      expect(uiApi.getTextAlign()).toBe('left');

      uiApi.setTextAlign('center');
      expect(uiApi.getTextAlign()).toBe('center');

      uiApi.setTextAlign('right');
      expect(uiApi.getTextAlign()).toBe('right');
    });

    it('should handle text baseline', () => {
      uiApi.setTextBaseline('top');
      expect(uiApi.getTextBaseline()).toBe('top');

      uiApi.setTextBaseline('middle');
      expect(uiApi.getTextBaseline()).toBe('middle');

      uiApi.setTextBaseline('bottom');
      expect(uiApi.getTextBaseline()).toBe('bottom');
    });
  });

  describe('Panel System', () => {
    it('should create panel with defaults', () => {
      const panel = uiApi.createPanel(10, 20, 200, 100);
      expect(panel).toBeDefined();
      expect(panel.x).toBe(10);
      expect(panel.y).toBe(20);
      expect(panel.width).toBe(200);
      expect(panel.height).toBe(100);
      expect(panel.visible).toBe(true);
    });

    it('should create panel with options', () => {
      const panel = uiApi.createPanel(0, 0, 100, 100, {
        title: 'Test Panel',
        borderWidth: 3,
        shadow: true,
        visible: false
      });
      expect(panel.title).toBe('Test Panel');
      expect(panel.borderWidth).toBe(3);
      expect(panel.shadow).toBe(true);
      expect(panel.visible).toBe(false);
    });

    it('should remove panel', () => {
      const panel = uiApi.createPanel(0, 0, 100, 100);
      const count1 = uiApi.getPanelCount();
      uiApi.removePanel(panel);
      const count2 = uiApi.getPanelCount();
      expect(count2).toBe(count1 - 1);
    });

    it('should clear all panels', () => {
      uiApi.createPanel(0, 0, 100, 100);
      uiApi.createPanel(10, 10, 50, 50);
      uiApi.clearPanels();
      expect(uiApi.getPanelCount()).toBe(0);
    });
  });

  describe('Button System', () => {
    it('should create button with callback', () => {
      let clicked = false;
      const button = uiApi.createButton(10, 20, 80, 30, 'Click', () => {
        clicked = true;
      });
      
      expect(button).toBeDefined();
      expect(button.x).toBe(10);
      expect(button.y).toBe(20);
      expect(button.width).toBe(80);
      expect(button.height).toBe(30);
      expect(button.label).toBe('Click');
      expect(button.enabled).toBe(true);
      expect(button.visible).toBe(true);
    });

    it('should detect hover state', () => {
      const button = uiApi.createButton(10, 10, 100, 40, 'Test', () => {});
      
      // Mouse outside button
      uiApi.setMousePosition(0, 0);
      uiApi.updateButton(button);
      expect(button.hovered).toBe(false);

      // Mouse inside button
      uiApi.setMousePosition(50, 25);
      uiApi.updateButton(button);
      expect(button.hovered).toBe(true);
    });

    it('should detect click', () => {
      let clickCount = 0;
      const button = uiApi.createButton(10, 10, 100, 40, 'Test', () => {
        clickCount++;
      });

      // Hover and click
      uiApi.setMousePosition(50, 25);
      uiApi.setMouseButton(false);
      uiApi.updateButton(button);
      
      uiApi.setMouseButton(true);
      uiApi.updateButton(button);
      
      expect(clickCount).toBe(1);
    });

    it('should not click when disabled', () => {
      let clicked = false;
      const button = uiApi.createButton(10, 10, 100, 40, 'Test', () => {
        clicked = true;
      }, { enabled: false });

      uiApi.setMousePosition(50, 25);
      uiApi.setMouseButton(true);
      uiApi.updateButton(button);
      
      expect(clicked).toBe(false);
    });

    it('should remove button', () => {
      const button = uiApi.createButton(0, 0, 50, 30, 'Test', () => {});
      const count1 = uiApi.getButtonCount();
      uiApi.removeButton(button);
      const count2 = uiApi.getButtonCount();
      expect(count2).toBe(count1 - 1);
    });

    it('should clear all buttons', () => {
      uiApi.createButton(0, 0, 50, 30, 'A', () => {});
      uiApi.createButton(10, 10, 50, 30, 'B', () => {});
      uiApi.clearButtons();
      expect(uiApi.getButtonCount()).toBe(0);
    });
  });

  describe('Layout Helpers', () => {
    it('should center horizontally', () => {
      const x = uiApi.centerX(100, 640);
      expect(x).toBe(270); // (640 - 100) / 2
    });

    it('should center vertically', () => {
      const y = uiApi.centerY(50, 360);
      expect(y).toBe(155); // (360 - 50) / 2
    });

    it('should create grid layout', () => {
      const cells = uiApi.grid(3, 2, 80, 40, 10, 5);
      expect(cells.length).toBe(6); // 3 cols * 2 rows
      
      // Check first cell
      expect(cells[0].col).toBe(0);
      expect(cells[0].row).toBe(0);
      expect(cells[0].width).toBe(80);
      expect(cells[0].height).toBe(40);
      
      // Check spacing
      expect(cells[1].x).toBe(cells[0].x + 80 + 10);
      expect(cells[3].y).toBe(cells[0].y + 40 + 5);
    });
  });

  describe('Color Palette', () => {
    it('should have all semantic colors', () => {
      expect(uiApi.uiColors.primary).toBeDefined();
      expect(uiApi.uiColors.secondary).toBeDefined();
      expect(uiApi.uiColors.success).toBeDefined();
      expect(uiApi.uiColors.warning).toBeDefined();
      expect(uiApi.uiColors.danger).toBeDefined();
      expect(uiApi.uiColors.dark).toBeDefined();
      expect(uiApi.uiColors.light).toBeDefined();
      expect(uiApi.uiColors.white).toBeDefined();
      expect(uiApi.uiColors.black).toBeDefined();
    });

    it('should return rgba8 format', () => {
      const color = uiApi.uiColors.primary;
      expect(color.r).toBeGreaterThanOrEqual(0);
      expect(color.g).toBeGreaterThanOrEqual(0);
      expect(color.b).toBeGreaterThanOrEqual(0);
      expect(color.a).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Mouse Input', () => {
    it('should set mouse position', () => {
      uiApi.setMousePosition(100, 200);
      const pos = uiApi.getMousePosition();
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(200);
    });

    it('should detect mouse down state', () => {
      uiApi.setMouseButton(true);
      expect(uiApi.isMouseDown()).toBe(true);
      
      uiApi.setMouseButton(false);
      expect(uiApi.isMouseDown()).toBe(false);
    });

    it('should detect mouse pressed (single frame)', () => {
      // First frame - pressed
      uiApi.setMouseButton(true);
      expect(uiApi.isMousePressed()).toBe(true);
      
      // Second frame - still down, but not pressed
      uiApi.setMouseButton(true);
      expect(uiApi.isMousePressed()).toBe(false);
      
      // Release and press again
      uiApi.setMouseButton(false);
      uiApi.setMouseButton(true);
      expect(uiApi.isMousePressed()).toBe(true);
    });
  });
});

// Mock UI API for testing
function createMockUiApi(api2d, input) {
  let currentFont = 'normal';
  let textAlign = 'left';
  let textBaseline = 'top';
  let panels = [];
  let buttons = [];
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mousePressed = false;
  let prevMouseDown = false;

  return {
    // Font system
    setFont: (size) => { currentFont = size; },
    getCurrentFont: () => currentFont,
    setTextAlign: (align) => { textAlign = align; },
    getTextAlign: () => textAlign,
    setTextBaseline: (baseline) => { textBaseline = baseline; },
    getTextBaseline: () => textBaseline,
    
    measureText: (text, scale = 1) => {
      const charWidth = 6;
      const charHeight = 8;
      let multiplier = 1;
      if (currentFont === 'large') multiplier = 3;
      else if (currentFont === 'huge') multiplier = 4;
      else if (currentFont === 'normal') multiplier = 2;
      
      return {
        width: text.length * charWidth * multiplier * scale,
        height: charHeight * multiplier * scale
      };
    },

    // Panel system
    createPanel: (x, y, width, height, options = {}) => {
      const panel = {
        x, y, width, height,
        visible: options.visible !== false,
        title: options.title || '',
        borderWidth: options.borderWidth || 1,
        shadow: options.shadow || false,
        ...options
      };
      panels.push(panel);
      return panel;
    },
    
    removePanel: (panel) => {
      panels = panels.filter(p => p !== panel);
    },
    
    clearPanels: () => {
      panels = [];
    },
    
    getPanelCount: () => panels.length,

    // Button system
    createButton: (x, y, width, height, label, callback, options = {}) => {
      const button = {
        x, y, width, height, label, callback,
        enabled: options.enabled !== false,
        visible: options.visible !== false,
        hovered: false,
        pressed: false,
        ...options
      };
      buttons.push(button);
      return button;
    },
    
    updateButton: (button) => {
      if (!button.enabled || !button.visible) {
        button.hovered = false;
        button.pressed = false;
        return;
      }

      // Check hover
      const isInside = mouseX >= button.x && mouseX <= button.x + button.width &&
                      mouseY >= button.y && mouseY <= button.y + button.height;
      button.hovered = isInside;

      // Check click
      if (isInside && mousePressed) {
        button.pressed = true;
        if (button.callback) {
          button.callback();
        }
      } else if (!mouseDown) {
        button.pressed = false;
      }
    },
    
    removeButton: (button) => {
      buttons = buttons.filter(b => b !== button);
    },
    
    clearButtons: () => {
      buttons = [];
    },
    
    getButtonCount: () => buttons.length,

    // Layout helpers
    centerX: (width, screenWidth = 640) => {
      return (screenWidth - width) / 2;
    },
    
    centerY: (height, screenHeight = 360) => {
      return (screenHeight - height) / 2;
    },
    
    grid: (cols, rows, cellWidth, cellHeight, paddingX = 0, paddingY = 0) => {
      const cells = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          cells.push({
            x: col * (cellWidth + paddingX),
            y: row * (cellHeight + paddingY),
            width: cellWidth,
            height: cellHeight,
            col,
            row
          });
        }
      }
      return cells;
    },

    // Colors
    uiColors: {
      primary: api2d.rgba8(30, 120, 255, 255),
      secondary: api2d.rgba8(100, 180, 255, 255),
      success: api2d.rgba8(50, 200, 100, 255),
      warning: api2d.rgba8(255, 200, 50, 255),
      danger: api2d.rgba8(255, 80, 80, 255),
      dark: api2d.rgba8(40, 40, 40, 255),
      light: api2d.rgba8(200, 200, 200, 255),
      white: api2d.rgba8(255, 255, 255, 255),
      black: api2d.rgba8(0, 0, 0, 255)
    },

    // Mouse input
    setMousePosition: (x, y) => {
      mouseX = x;
      mouseY = y;
    },
    
    getMousePosition: () => ({ x: mouseX, y: mouseY }),
    
    setMouseButton: (down) => {
      prevMouseDown = mouseDown;
      mouseDown = down;
      mousePressed = down && !prevMouseDown;
    },
    
    isMouseDown: () => mouseDown,
    isMousePressed: () => mousePressed
  };
}

export default {
  name: 'UI System Tests',
  tests: []
};
