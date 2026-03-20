// tests/test-screen-system.js
// Test suite for Nova64 Screen Management System
import { TestRunner, Assert, Performance } from './test-runner.js';
import { ScreenManager, Screen, screenApi } from '../runtime/screens.js';

// Mock global functions for testing
const mockGlobals = {
  isKeyPressed: jest.fn(),
  isKeyDown: jest.fn(),
  switchToScreen: jest.fn(),
  addScreen: jest.fn(),
  startScreens: jest.fn(),
  print: jest.fn(),
  rect: jest.fn(),
  line: jest.fn(),
  rgba8: jest.fn((r, g, b, a) => ({ r, g, b, a })),
  createCube: jest.fn(() => ({ type: 'cube', id: Math.random() })),
  createSphere: jest.fn(() => ({ type: 'sphere', id: Math.random() })),
  destroyMesh: jest.fn(),
  setPosition: jest.fn(),
  setRotation: jest.fn(),
  setScale: jest.fn(),
  setCameraPosition: jest.fn(),
  setCameraTarget: jest.fn(),
  setCameraFOV: jest.fn(),
  setLightDirection: jest.fn(),
  setFog: jest.fn(),
  cls: jest.fn(),
};

// Setup global mocks
beforeEach(() => {
  Object.assign(global, mockGlobals);
  jest.clearAllMocks();
});

describe('ScreenManager', () => {
  let screenManager;

  beforeEach(() => {
    screenManager = new ScreenManager();
  });

  describe('Screen Registration', () => {
    test('should register a screen with object definition', () => {
      const screenDef = {
        enter: jest.fn(),
        update: jest.fn(),
        draw: jest.fn(),
        exit: jest.fn(),
      };

      screenManager.addScreen('test', screenDef);

      expect(screenManager.screens.has('test')).toBe(true);
      expect(screenManager.defaultScreen).toBe('test');
    });

    test('should register a screen with class definition', () => {
      class TestScreen extends Screen {}

      screenManager.addScreen('test', TestScreen);

      expect(screenManager.screens.has('test')).toBe(true);
      expect(screenManager.screens.get('test')).toBeInstanceOf(TestScreen);
    });

    test('should set first screen as default', () => {
      screenManager.addScreen('first', {});
      screenManager.addScreen('second', {});

      expect(screenManager.defaultScreen).toBe('first');
    });
  });

  describe('Screen Navigation', () => {
    test('should switch to a registered screen', () => {
      const screen1 = { enter: jest.fn(), exit: jest.fn() };
      const screen2 = { enter: jest.fn(), exit: jest.fn() };

      screenManager.addScreen('screen1', screen1);
      screenManager.addScreen('screen2', screen2);

      screenManager.switchTo('screen1');
      expect(screen1.enter).toHaveBeenCalled();
      expect(screenManager.currentScreen).toBe('screen1');

      screenManager.switchTo('screen2');
      expect(screen1.exit).toHaveBeenCalled();
      expect(screen2.enter).toHaveBeenCalled();
      expect(screenManager.currentScreen).toBe('screen2');
    });

    test('should pass data when switching screens', () => {
      const screen = { enter: jest.fn() };
      const testData = { score: 100, level: 5 };

      screenManager.addScreen('test', screen);
      screenManager.switchTo('test', testData);

      expect(screen.enter).toHaveBeenCalledWith(testData);
    });

    test('should return false for non-existent screen', () => {
      const result = screenManager.switchTo('nonexistent');
      expect(result).toBe(false);
    });

    test('should handle screen without enter/exit methods', () => {
      const screen = { update: jest.fn() };

      screenManager.addScreen('test', screen);
      const result = screenManager.switchTo('test');

      expect(result).toBe(true);
      expect(screenManager.currentScreen).toBe('test');
    });
  });

  describe('Screen Lifecycle', () => {
    test('should call update on current screen', () => {
      const screen = { update: jest.fn() };

      screenManager.addScreen('test', screen);
      screenManager.switchTo('test');
      screenManager.update(0.016);

      expect(screen.update).toHaveBeenCalledWith(0.016);
    });

    test('should call draw on current screen', () => {
      const screen = { draw: jest.fn() };

      screenManager.addScreen('test', screen);
      screenManager.switchTo('test');
      screenManager.draw();

      expect(screen.draw).toHaveBeenCalled();
    });

    test('should handle screens without update/draw methods', () => {
      const screen = {};

      screenManager.addScreen('test', screen);
      screenManager.switchTo('test');

      expect(() => screenManager.update(0.016)).not.toThrow();
      expect(() => screenManager.draw()).not.toThrow();
    });

    test('should not call methods when no current screen', () => {
      expect(() => screenManager.update(0.016)).not.toThrow();
      expect(() => screenManager.draw()).not.toThrow();
    });
  });

  describe('Screen Information', () => {
    test('should return current screen name', () => {
      screenManager.addScreen('test', {});
      screenManager.switchTo('test');

      expect(screenManager.getCurrentScreen()).toBe('test');
    });

    test('should return current screen object', () => {
      const screen = { name: 'test' };
      screenManager.addScreen('test', screen);
      screenManager.switchTo('test');

      expect(screenManager.getCurrentScreenObject()).toBe(screen);
    });

    test('should return null when no current screen', () => {
      expect(screenManager.getCurrentScreen()).toBeNull();
      expect(screenManager.getCurrentScreenObject()).toBeNull();
    });
  });

  describe('Screen Start', () => {
    test('should start with default screen', () => {
      const screen = { enter: jest.fn() };
      screenManager.addScreen('default', screen);

      screenManager.start();

      expect(screen.enter).toHaveBeenCalled();
      expect(screenManager.currentScreen).toBe('default');
    });

    test('should start with specified screen', () => {
      const screen1 = { enter: jest.fn() };
      const screen2 = { enter: jest.fn() };

      screenManager.addScreen('screen1', screen1);
      screenManager.addScreen('screen2', screen2);

      screenManager.start('screen2');

      expect(screen2.enter).toHaveBeenCalled();
      expect(screen1.enter).not.toHaveBeenCalled();
      expect(screenManager.currentScreen).toBe('screen2');
    });
  });
});

describe('Screen Base Class', () => {
  let screen;

  beforeEach(() => {
    screen = new Screen();
  });

  test('should initialize with empty data object', () => {
    expect(screen.data).toEqual({});
  });

  test('should merge data in enter method', () => {
    const newData = { score: 100, level: 5 };
    screen.data = { level: 1, lives: 3 };

    screen.enter(newData);

    expect(screen.data).toEqual({ level: 5, lives: 3, score: 100 });
  });

  test('should have default lifecycle methods', () => {
    expect(() => screen.enter()).not.toThrow();
    expect(() => screen.exit()).not.toThrow();
    expect(() => screen.update(0.016)).not.toThrow();
    expect(() => screen.draw()).not.toThrow();
  });
});

describe('Screen API Integration', () => {
  test('should expose screen functions to global scope', () => {
    const { screenApi } = require('../runtime/screens.js');
    const api = screenApi();
    const target = {};

    api.exposeTo(target);

    expect(target.ScreenManager).toBeDefined();
    expect(target.Screen).toBeDefined();
    expect(target.screens).toBeInstanceOf(ScreenManager);
    expect(typeof target.addScreen).toBe('function');
    expect(typeof target.switchToScreen).toBe('function');
    expect(typeof target.getCurrentScreen).toBe('function');
    expect(typeof target.startScreens).toBe('function');
  });

  test('should wire global functions to screen manager', () => {
    const { screenApi } = require('../runtime/screens.js');
    const api = screenApi();
    const target = {};

    api.exposeTo(target);

    const screenDef = { enter: jest.fn() };
    target.addScreen('test', screenDef);

    expect(api.manager.screens.has('test')).toBe(true);
  });
});

describe('Real-world Screen Scenarios', () => {
  let screenManager;

  beforeEach(() => {
    screenManager = new ScreenManager();
  });

  test('should handle game menu flow', () => {
    const titleScreen = { enter: jest.fn(), update: jest.fn(), draw: jest.fn(), exit: jest.fn() };
    const gameScreen = { enter: jest.fn(), update: jest.fn(), draw: jest.fn(), exit: jest.fn() };
    const gameOverScreen = {
      enter: jest.fn(),
      update: jest.fn(),
      draw: jest.fn(),
      exit: jest.fn(),
    };

    screenManager.addScreen('title', titleScreen);
    screenManager.addScreen('game', gameScreen);
    screenManager.addScreen('gameOver', gameOverScreen);

    // Start game flow
    screenManager.start('title');
    expect(titleScreen.enter).toHaveBeenCalled();

    // Game loop
    screenManager.update(0.016);
    screenManager.draw();
    expect(titleScreen.update).toHaveBeenCalledWith(0.016);
    expect(titleScreen.draw).toHaveBeenCalled();

    // Transition to game
    screenManager.switchTo('game', { difficulty: 'hard' });
    expect(titleScreen.exit).toHaveBeenCalled();
    expect(gameScreen.enter).toHaveBeenCalledWith({ difficulty: 'hard' });

    // Game over
    screenManager.switchTo('gameOver', { score: 1500, time: 120 });
    expect(gameScreen.exit).toHaveBeenCalled();
    expect(gameOverScreen.enter).toHaveBeenCalledWith({ score: 1500, time: 120 });
  });

  test('should handle cleanup on screen exit', () => {
    let mockMesh = { id: 'test-mesh' };

    const gameScreen = {
      enter() {
        this.mesh = mockMesh;
      },
      exit() {
        if (this.mesh) {
          global.destroyMesh(this.mesh);
          this.mesh = null;
        }
      },
    };

    screenManager.addScreen('game', gameScreen);
    screenManager.addScreen('menu', {});

    screenManager.switchTo('game');
    screenManager.switchTo('menu');

    expect(global.destroyMesh).toHaveBeenCalledWith(mockMesh);
  });

  test('should handle screen state persistence', () => {
    class SettingsScreen extends Screen {
      enter(data) {
        super.enter(data);
        this.volume = this.data.volume || 50;
        this.difficulty = this.data.difficulty || 'normal';
      }

      adjustVolume(delta) {
        this.volume = Math.max(0, Math.min(100, this.volume + delta));
      }

      getSettings() {
        return { volume: this.volume, difficulty: this.difficulty };
      }
    }

    screenManager.addScreen('settings', SettingsScreen);
    screenManager.switchTo('settings', { volume: 75, difficulty: 'hard' });

    const settingsScreen = screenManager.getCurrentScreenObject();
    expect(settingsScreen.volume).toBe(75);
    expect(settingsScreen.difficulty).toBe('hard');

    settingsScreen.adjustVolume(-25);
    expect(settingsScreen.volume).toBe(50);

    const settings = settingsScreen.getSettings();
    expect(settings).toEqual({ volume: 50, difficulty: 'hard' });
  });
});

describe('Error Handling', () => {
  let screenManager;

  beforeEach(() => {
    screenManager = new ScreenManager();
  });

  test('should handle screen with throwing enter method', () => {
    const faultyScreen = {
      enter() {
        throw new Error('Enter failed');
      },
    };

    screenManager.addScreen('faulty', faultyScreen);

    expect(() => screenManager.switchTo('faulty')).toThrow('Enter failed');
  });

  test('should handle screen with throwing update method', () => {
    const faultyScreen = {
      update() {
        throw new Error('Update failed');
      },
    };

    screenManager.addScreen('faulty', faultyScreen);
    screenManager.switchTo('faulty');

    expect(() => screenManager.update(0.016)).toThrow('Update failed');
  });

  test('should handle screen with throwing draw method', () => {
    const faultyScreen = {
      draw() {
        throw new Error('Draw failed');
      },
    };

    screenManager.addScreen('faulty', faultyScreen);
    screenManager.switchTo('faulty');

    expect(() => screenManager.draw()).toThrow('Draw failed');
  });
});

describe('Performance Tests', () => {
  let screenManager;

  beforeEach(() => {
    screenManager = new ScreenManager();
  });

  test('should handle rapid screen switching', () => {
    const screens = {};
    for (let i = 0; i < 10; i++) {
      screens[`screen${i}`] = {
        enter: jest.fn(),
        update: jest.fn(),
        draw: jest.fn(),
        exit: jest.fn(),
      };
      screenManager.addScreen(`screen${i}`, screens[`screen${i}`]);
    }

    // Rapid switching
    for (let i = 0; i < 100; i++) {
      const screenName = `screen${i % 10}`;
      screenManager.switchTo(screenName);
      expect(screenManager.currentScreen).toBe(screenName);
    }

    // Verify all screens were properly entered/exited
    Object.keys(screens).forEach(screenName => {
      expect(screens[screenName].enter).toHaveBeenCalled();
    });
  });

  test('should handle high-frequency updates', () => {
    const screen = { update: jest.fn() };
    screenManager.addScreen('test', screen);
    screenManager.switchTo('test');

    // Simulate 60 FPS for 1 second
    for (let i = 0; i < 60; i++) {
      screenManager.update(1 / 60);
    }

    expect(screen.update).toHaveBeenCalledTimes(60);
  });
});

export async function runScreenSystemTests() {
  const runner = new TestRunner();

  // Test ScreenManager basic functionality
  runner.test('ScreenManager - basic screen registration', () => {
    const manager = new ScreenManager();
    const screen = { enter: () => {}, update: () => {}, draw: () => {}, exit: () => {} };

    manager.addScreen('test', screen);
    Assert.isTrue(manager.screens.has('test'), 'Screen should be registered');
    Assert.equals(manager.defaultScreen, 'test', 'First screen should be default');
  });

  runner.test('ScreenManager - screen switching', () => {
    const manager = new ScreenManager();
    let enterCalled = false;
    let exitCalled = false;

    const screen1 = {
      enter: () => {
        enterCalled = true;
      },
      exit: () => {
        exitCalled = true;
      },
    };
    const screen2 = { enter: () => {} };

    manager.addScreen('screen1', screen1);
    manager.addScreen('screen2', screen2);

    manager.switchTo('screen1');
    Assert.isTrue(enterCalled, 'Enter should be called');
    Assert.equals(manager.currentScreen, 'screen1', 'Current screen should be set');

    manager.switchTo('screen2');
    Assert.isTrue(exitCalled, 'Exit should be called when switching');
  });

  runner.test('Screen base class - data handling', () => {
    const screen = new Screen();
    Assert.isObject(screen.data, 'Screen should have data object');

    screen.enter({ score: 100, level: 5 });
    Assert.equals(screen.data.score, 100, 'Data should be merged');
    Assert.equals(screen.data.level, 5, 'Data should be merged');
  });

  runner.test('screenApi - global exposure', () => {
    const api = screenApi();
    const target = {};

    api.exposeTo(target);

    Assert.isFunction(target.addScreen, 'addScreen should be exposed');
    Assert.isFunction(target.switchToScreen, 'switchToScreen should be exposed');
    Assert.isFunction(target.getCurrentScreen, 'getCurrentScreen should be exposed');
    Assert.isFunction(target.startScreens, 'startScreens should be exposed');
    Assert.isObject(target.screens, 'screens manager should be exposed');
  });

  return await runner.runAll();
}
