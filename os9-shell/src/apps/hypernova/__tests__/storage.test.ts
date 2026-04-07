// Tests for HyperNova localStorage persistence (storage.ts)
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  autoSave,
  loadAutoSave,
  clearAutoSave,
  saveToLocal,
  loadFromLocal,
  deleteSave,
  listSaves,
} from '../shared/storage';
import type { HyperNovaProject } from '../shared/schema';

// ---------------------------------------------------------------------------
// localStorage mock (Node environment doesn't have it)
// ---------------------------------------------------------------------------

function makeLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem:    (k: string) => store[k] ?? null,
    setItem:    (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear:      () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key:        (i: number) => Object.keys(store)[i] ?? null,
  };
}

const lsMock = makeLocalStorageMock();
vi.stubGlobal('localStorage', lsMock);

// ---------------------------------------------------------------------------
// Minimal project fixtures
// ---------------------------------------------------------------------------

function makeProject(name = 'Test Project', cardCount = 2): HyperNovaProject {
  return {
    name,
    stacks: [
      {
        id: 'stack-1',
        name: 'Main',
        cards: Array.from({ length: cardCount }, (_, i) => ({
          id: `card-${i}`,
          name: `Card ${i}`,
          background: '#ffffff',
          objects: [],
        })),
      },
    ],
    library: { symbols: [] },
  } as unknown as HyperNovaProject;
}

// ---------------------------------------------------------------------------
// autoSave / loadAutoSave / clearAutoSave
// ---------------------------------------------------------------------------

describe('autoSave & loadAutoSave', () => {
  beforeEach(() => { lsMock.clear(); });

  it('round-trips a project through localStorage', () => {
    const p = makeProject('My Cart', 3);
    autoSave(p);
    const loaded = loadAutoSave();
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe('My Cart');
    expect(loaded!.stacks[0].cards).toHaveLength(3);
  });

  it('returns null when nothing has been saved', () => {
    expect(loadAutoSave()).toBeNull();
  });

  it('returns null when auto-save key holds malformed JSON', () => {
    lsMock.setItem('hypernova:autosave', '{broken json{{');
    expect(loadAutoSave()).toBeNull();
  });

  it('clearAutoSave removes the stored value', () => {
    autoSave(makeProject());
    expect(loadAutoSave()).not.toBeNull();
    clearAutoSave();
    expect(loadAutoSave()).toBeNull();
  });

  it('overwriting with a new project replaces the old one', () => {
    autoSave(makeProject('First'));
    autoSave(makeProject('Second'));
    expect(loadAutoSave()!.name).toBe('Second');
  });
});

// ---------------------------------------------------------------------------
// saveToLocal / loadFromLocal
// ---------------------------------------------------------------------------

describe('saveToLocal & loadFromLocal', () => {
  beforeEach(() => { lsMock.clear(); });

  it('creates a save entry with the project name and card count', () => {
    const p = makeProject('Adventure', 5);
    const entry = saveToLocal(p);
    expect(entry.name).toBe('Adventure');
    expect(entry.cardCount).toBe(5);
    expect(entry.id).toBeTruthy();
    expect(entry.savedAt).toBeGreaterThan(0);
  });

  it('saved project can be retrieved by id', () => {
    const p = makeProject('My Game');
    const entry = saveToLocal(p);
    const loaded = loadFromLocal(entry.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe('My Game');
  });

  it('saving again with the same name overwrites (same id, updated timestamp)', () => {
    const p = makeProject('Same Name');
    const first = saveToLocal(p);
    const ts1 = first.savedAt;

    // Small artificial delay to guarantee timestamp differs
    vi.setSystemTime(Date.now() + 100);
    const second = saveToLocal({ ...p, name: 'Same Name' });
    vi.useRealTimers();

    expect(second.id).toBe(first.id);
    expect(second.savedAt).toBeGreaterThanOrEqual(ts1);
  });

  it('saving with a different name creates a new entry', () => {
    const e1 = saveToLocal(makeProject('Alpha'));
    const e2 = saveToLocal(makeProject('Beta'));
    expect(e1.id).not.toBe(e2.id);
    expect(listSaves()).toHaveLength(2);
  });

  it('loadFromLocal returns null for unknown id', () => {
    expect(loadFromLocal('nonexistent-id')).toBeNull();
  });

  it('loadFromLocal returns null when stored JSON is malformed', () => {
    lsMock.setItem('hypernova:save:bad-id', '{{invalid');
    expect(loadFromLocal('bad-id')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteSave
// ---------------------------------------------------------------------------

describe('deleteSave', () => {
  beforeEach(() => { lsMock.clear(); });

  it('removes the save from localStorage and the index', () => {
    const entry = saveToLocal(makeProject('ToDelete'));
    expect(listSaves()).toHaveLength(1);
    deleteSave(entry.id);
    expect(listSaves()).toHaveLength(0);
    expect(loadFromLocal(entry.id)).toBeNull();
  });

  it('is a no-op for an id that does not exist', () => {
    saveToLocal(makeProject('Keep'));
    deleteSave('not-real-id');
    expect(listSaves()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// listSaves
// ---------------------------------------------------------------------------

describe('listSaves', () => {
  beforeEach(() => { lsMock.clear(); });

  it('returns an empty array when no saves exist', () => {
    expect(listSaves()).toEqual([]);
  });

  it('returns all saved entries in insertion order', () => {
    saveToLocal(makeProject('First'));
    saveToLocal(makeProject('Second'));
    saveToLocal(makeProject('Third'));
    const list = listSaves();
    expect(list).toHaveLength(3);
    expect(list.map((e) => e.name)).toEqual(['First', 'Second', 'Third']);
  });

  it('reflects deletions', () => {
    const a = saveToLocal(makeProject('A'));
    saveToLocal(makeProject('B'));
    deleteSave(a.id);
    const list = listSaves();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('B');
  });

  it('returns empty array when index JSON is malformed', () => {
    lsMock.setItem('hypernova:saves-index', '{{corrupt');
    expect(listSaves()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Isolation — HyperNova keys must not clash with GameStudio keys
// ---------------------------------------------------------------------------

describe('localStorage key isolation', () => {
  beforeEach(() => { lsMock.clear(); });

  it('uses hypernova: prefix for auto-save (does not collide with nova64_cart_)', () => {
    const p = makeProject();
    autoSave(p);
    // Simulate GameStudio's own localStorage key
    lsMock.setItem('nova64_cart_my-game.js', '// some cart code');
    lsMock.setItem('nova64_cart_list', JSON.stringify(['my-game.js']));

    // HyperNova load should still work
    expect(loadAutoSave()!.name).toBe(p.name);
    // GameStudio key should still be untouched
    expect(lsMock.getItem('nova64_cart_my-game.js')).toBe('// some cart code');
    expect(lsMock.getItem('nova64_cart_list')).toBe(JSON.stringify(['my-game.js']));
  });

  it('saveToLocal uses hypernova:save: prefix (no clash with nova64_cart_)', () => {
    const e = saveToLocal(makeProject('Nova Game'));
    // The key in localStorage for the save uses SAVES_PREFIX = 'hypernova:save:'
    const raw = lsMock.getItem(`hypernova:save:${e.id}`);
    expect(raw).not.toBeNull();
    // GameStudio keys are untouched
    expect(lsMock.getItem(`nova64_cart_${e.id}`)).toBeNull();
  });
});
