// hyperNova – localStorage persistence
// Auto-save and named stack save/load for browser storage.

import type { HyperNovaProject } from './schema';

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

const AUTO_KEY = 'hypernova:autosave';
const SAVES_PREFIX = 'hypernova:save:';
const INDEX_KEY = 'hypernova:saves-index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SaveEntry {
  id: string;
  name: string;
  savedAt: number;
  cardCount: number;
}

// ---------------------------------------------------------------------------
// Auto-save (always tracks the current working project)
// ---------------------------------------------------------------------------

export function autoSave(project: HyperNovaProject): void {
  try {
    localStorage.setItem(AUTO_KEY, JSON.stringify(project));
  } catch {
    // quota exceeded or private browsing — silently ignore
  }
}

export function loadAutoSave(): HyperNovaProject | null {
  try {
    const raw = localStorage.getItem(AUTO_KEY);
    return raw ? (JSON.parse(raw) as HyperNovaProject) : null;
  } catch {
    return null;
  }
}

export function clearAutoSave(): void {
  try { localStorage.removeItem(AUTO_KEY); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Named saves (user-initiated)
// ---------------------------------------------------------------------------

/**
 * Save the project under its name.
 * If a save with the same name already exists it is overwritten in-place
 * (same id, updated timestamp), so the list doesn't grow unboundedly.
 */
export function saveToLocal(project: HyperNovaProject): SaveEntry {
  const index = _loadIndex();
  const cardCount = project.stacks.reduce((n, s) => n + s.cards.length, 0);

  const existing = index.find((e) => e.name === project.name);
  if (existing) {
    existing.savedAt = Date.now();
    existing.cardCount = cardCount;
    try {
      localStorage.setItem(`${SAVES_PREFIX}${existing.id}`, JSON.stringify(project));
      localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    } catch { /* ignore */ }
    return existing;
  }

  const entry: SaveEntry = {
    id: _uid(),
    name: project.name,
    savedAt: Date.now(),
    cardCount,
  };
  index.push(entry);
  try {
    localStorage.setItem(`${SAVES_PREFIX}${entry.id}`, JSON.stringify(project));
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch { /* ignore */ }
  return entry;
}

export function loadFromLocal(id: string): HyperNovaProject | null {
  try {
    const raw = localStorage.getItem(`${SAVES_PREFIX}${id}`);
    return raw ? (JSON.parse(raw) as HyperNovaProject) : null;
  } catch {
    return null;
  }
}

export function deleteSave(id: string): void {
  try {
    localStorage.removeItem(`${SAVES_PREFIX}${id}`);
    const index = _loadIndex().filter((e) => e.id !== id);
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch { /* ignore */ }
}

export function listSaves(): SaveEntry[] {
  return _loadIndex();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _loadIndex(): SaveEntry[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]') as SaveEntry[];
  } catch {
    return [];
  }
}

function _uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
