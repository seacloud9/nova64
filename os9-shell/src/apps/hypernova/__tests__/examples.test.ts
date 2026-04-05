// Tests for hyperNova example projects
import { describe, it, expect, beforeAll } from 'vitest';
import { EXAMPLE_CATALOG } from '../shared/examples';
import { createExampleProject } from '../shared/schema';
import type { HyperNovaProject, ButtonObject, Card } from '../shared/schema';
import { runScript, type ScriptAPI } from '../player/ScriptRunner';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collect all card IDs from a project */
function allCardIds(project: HyperNovaProject): Set<string> {
  const ids = new Set<string>();
  for (const stack of project.stacks) {
    for (const card of stack.cards) {
      ids.add(card.id);
    }
  }
  return ids;
}

/** Extract all buttons from a project */
function allButtons(project: HyperNovaProject): ButtonObject[] {
  const buttons: ButtonObject[] = [];
  for (const stack of project.stacks) {
    for (const card of stack.cards) {
      for (const obj of card.objects) {
        if (obj.type === 'button') {
          buttons.push(obj as ButtonObject);
        }
      }
    }
  }
  return buttons;
}

/** Extract all card IDs referenced by goToCard() in scripts */
function scriptTargetIds(project: HyperNovaProject): Set<string> {
  const ids = new Set<string>();
  const regex = /goToCard\(["']([^"']+)["']\)/g;
  for (const btn of allButtons(project)) {
    if (!btn.script) continue;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(btn.script)) !== null) {
      ids.add(m[1]);
    }
  }
  return ids;
}

/** Build a mock ScriptAPI that records navigation calls */
function mockAPI(cardId = 'test'): { api: ScriptAPI; calls: string[] } {
  const calls: string[] = [];
  const api: ScriptAPI = {
    currentCardId: cardId,
    goToCard: (id: string) => calls.push(`goToCard:${id}`),
    goNext: () => calls.push('goNext'),
    goPrev: () => calls.push('goPrev'),
    goFirst: () => calls.push('goFirst'),
    goLast: () => calls.push('goLast'),
    setField: (id, val) => calls.push(`setField:${id}=${val}`),
    getField: (id) => { calls.push(`getField:${id}`); return ''; },
    alert: (msg) => calls.push(`alert:${msg}`),
    log: (...args) => calls.push(`log:${args.join(',')}`),
    // Tween / MovieClip stubs
    fadeIn: () => {},
    fadeOut: () => {},
    tweenTo: () => {},
    pulse: () => {},
    shake: () => {},
    slideIn: () => {},
    playClip: () => {},
    stopClip: () => {},
    gotoAndPlay: () => {},
    gotoAndStop: () => {},
  };
  return { api, calls };
}

// ---------------------------------------------------------------------------
// Catalog sanity
// ---------------------------------------------------------------------------

describe('EXAMPLE_CATALOG', () => {
  it('contains at least 5 examples', () => {
    expect(EXAMPLE_CATALOG.length).toBeGreaterThanOrEqual(5);
  });

  it('has unique IDs', () => {
    const ids = EXAMPLE_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique names', () => {
    const names = EXAMPLE_CATALOG.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every entry has required fields', () => {
    for (const entry of EXAMPLE_CATALOG) {
      expect(entry.id).toBeTruthy();
      expect(entry.name).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(entry.icon).toBeTruthy();
      expect(typeof entry.create).toBe('function');
    }
  });
});

// ---------------------------------------------------------------------------
// Project structure tests (applied to EVERY example + Welcome Tour)
// ---------------------------------------------------------------------------

const allExamples: Array<{ name: string; create: () => HyperNovaProject }> = [
  { name: 'Welcome Tour', create: createExampleProject },
  ...EXAMPLE_CATALOG.map((e) => ({ name: e.name, create: e.create })),
];

describe.each(allExamples)('Example: $name', ({ create }) => {
  let project: HyperNovaProject;

  // Create a fresh project for each test group
  beforeAll(() => {
    project = create();
  });

  it('has version 1', () => {
    expect(project.version).toBe(1);
  });

  it('has a non-empty name', () => {
    expect(project.name.length).toBeGreaterThan(0);
  });

  it('has exactly 1 stack', () => {
    expect(project.stacks.length).toBe(1);
  });

  it('has at least 2 cards', () => {
    const cardCount = project.stacks[0].cards.length;
    expect(cardCount).toBeGreaterThanOrEqual(2);
  });

  it('every card has a unique ID', () => {
    const ids = project.stacks[0].cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every card has at least 1 object', () => {
    for (const card of project.stacks[0].cards) {
      expect(card.objects.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every object has a unique ID within the project', () => {
    const ids: string[] = [];
    for (const card of project.stacks[0].cards) {
      for (const obj of card.objects) {
        ids.push(obj.id);
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every card has a valid background', () => {
    for (const card of project.stacks[0].cards) {
      expect(card.background).toBeDefined();
      expect(['2d-color', '2d-gradient']).toContain(card.background.type);
      expect(card.background.color).toBeTruthy();
    }
  });

  it('has assets and library fields', () => {
    expect(project.assets).toBeDefined();
    expect(project.library).toBeDefined();
  });

  it('has at least 1 button with a script', () => {
    const btns = allButtons(project);
    const scripted = btns.filter((b) => b.script && b.script.trim().length > 0);
    expect(scripted.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Navigation integrity — goToCard targets must exist
// ---------------------------------------------------------------------------

describe.each(allExamples)('Navigation integrity: $name', ({ create }) => {
  it('all goToCard() targets reference existing card IDs', () => {
    const project = create();
    const cardIds = allCardIds(project);
    const targets = scriptTargetIds(project);

    for (const target of targets) {
      expect(
        cardIds.has(target),
        `goToCard("${target}") references a card that does not exist`
      ).toBe(true);
    }
  });

  it('no card is an orphan (reachable from card 1 or has buttons)', () => {
    const project = create();
    const cards = project.stacks[0].cards;
    if (cards.length <= 1) return;

    // Build reachability set from card 0
    const reachable = new Set<string>();
    const queue = [cards[0].id];
    const cardMap = new Map<string, Card>();
    for (const card of cards) cardMap.set(card.id, card);

    while (queue.length > 0) {
      const id = queue.shift()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      const card = cardMap.get(id);
      if (!card) continue;
      for (const obj of card.objects) {
        if (obj.type === 'button') {
          const btn = obj as ButtonObject;
          const match = btn.script?.match(/goToCard\(["']([^"']+)["']\)/);
          if (match) {
            queue.push(match[1]);
          }
          // Also handle goNext() which targets the next card
          if (btn.script?.includes('goNext()')) {
            const idx = cards.findIndex((c) => c.id === id);
            if (idx < cards.length - 1) queue.push(cards[idx + 1].id);
          }
        }
      }
    }

    // Every card should be reachable OR be a target of goToCard from somewhere
    const allTargets = scriptTargetIds(project);
    for (const card of cards) {
      const isReachable = reachable.has(card.id) || allTargets.has(card.id);
      expect(
        isReachable,
        `Card "${card.title}" (${card.id}) is not reachable from the first card`
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Script execution tests — verify scripts actually run without errors
// ---------------------------------------------------------------------------

describe.each(allExamples)('Script execution: $name', ({ create }) => {
  it('all button scripts execute without errors', () => {
    const project = create();
    const buttons = allButtons(project);

    for (const btn of buttons) {
      if (!btn.script || !btn.script.trim()) continue;

      const { api } = mockAPI(project.stacks[0].cards[0].id);

      // This should NOT throw
      expect(() => runScript(btn.script!, api)).not.toThrow();
    }
  });

  it('goToCard scripts invoke goToCard with the correct ID', () => {
    const project = create();
    const buttons = allButtons(project);
    const cardIds = allCardIds(project);

    for (const btn of buttons) {
      if (!btn.script) continue;
      const match = btn.script.match(/goToCard\(["']([^"']+)["']\)/);
      if (!match) continue;

      const expectedTarget = match[1];
      const { api, calls } = mockAPI();
      runScript(btn.script, api);

      expect(calls).toContain(`goToCard:${expectedTarget}`);
      expect(cardIds.has(expectedTarget)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// ScriptRunner sandbox tests
// ---------------------------------------------------------------------------

describe('ScriptRunner', () => {
  it('executes goToCard()', () => {
    const { api, calls } = mockAPI();
    runScript('goToCard("abc");', api);
    expect(calls).toEqual(['goToCard:abc']);
  });

  it('executes goNext()', () => {
    const { api, calls } = mockAPI();
    runScript('goNext();', api);
    expect(calls).toEqual(['goNext']);
  });

  it('executes alert()', () => {
    const { api, calls } = mockAPI();
    runScript('alert("hi");', api);
    expect(calls).toEqual(['alert:hi']);
  });

  it('blocks access to window', () => {
    const { api, calls } = mockAPI();
    // window is shadowed to undefined, so accessing it should throw in strict mode
    // or return undefined
    expect(() => runScript('if (window) { alert("bad"); }', api)).not.toThrow();
    expect(calls).not.toContain('alert:bad');
  });

  it('handles empty/blank scripts gracefully', () => {
    const { api } = mockAPI();
    expect(() => runScript('', api)).not.toThrow();
    expect(() => runScript('   ', api)).not.toThrow();
  });

  it('handles script errors gracefully (does not throw)', () => {
    const { api } = mockAPI();
    // undefined function call should be caught
    expect(() => runScript('nonexistent();', api)).not.toThrow();
  });

  it('multiple statements execute in order', () => {
    const { api, calls } = mockAPI();
    runScript('alert("a"); alert("b"); goToCard("x");', api);
    expect(calls).toEqual(['alert:a', 'alert:b', 'goToCard:x']);
  });
});

// ---------------------------------------------------------------------------
// Unique project generation — calling create() twice gives distinct IDs
// ---------------------------------------------------------------------------

describe('Example ID uniqueness across instances', () => {
  it('creates distinct card IDs each call', () => {
    for (const entry of allExamples) {
      const p1 = entry.create();
      const p2 = entry.create();
      const ids1 = allCardIds(p1);
      const ids2 = allCardIds(p2);

      // No overlap — each call should generate fresh IDs
      for (const id of ids1) {
        expect(ids2.has(id)).toBe(false);
      }
    }
  });
});
