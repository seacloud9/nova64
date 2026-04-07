// hyperNova – Zustand store
import { create } from 'zustand';
import type { HyperNovaProject, Card, CardObject, ToolType, HNSymbol, TweenProps } from './schema';
import { createDefaultProject, createDefaultCard, genId } from './schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EditorSettings {
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;        // pixels per grid cell
  showGuides: boolean;     // smart alignment guides
}

/** Represents one level of MovieClip nesting (editing inside a symbol) */
interface SymbolEditLevel {
  symbolId: string;
  frameIndex: number; // 0-based index into symbol.frames
}

interface HyperNovaStore {
  // ---- State ---------------------------------------------------------------
  project: HyperNovaProject;
  selectedStackIndex: number;
  selectedCardId: string;
  selectedObjectId: string | null;
  mode: 'edit' | 'play';
  activeTool: ToolType;
  history: HyperNovaProject[];
  historyIndex: number;
  /** Runtime field values during play mode (keyed by object id) */
  fieldValues: Record<string, string>;
  isDirty: boolean;
  editorSettings: EditorSettings;
  /** Stack of symbol editing levels (empty = editing card stage) */
  symbolEditPath: SymbolEditLevel[];

  // ---- Mode / tool ---------------------------------------------------------
  setMode(mode: 'edit' | 'play'): void;
  setActiveTool(tool: ToolType): void;

  // ---- Editor settings -----------------------------------------------------
  toggleGrid(): void;
  toggleSnap(): void;
  toggleGuides(): void;
  setGridSize(size: number): void;

  // ---- Navigation ----------------------------------------------------------
  selectCard(cardId: string): void;
  selectObject(id: string | null): void;

  // ---- Symbol timeline navigation (Flash-style enter/exit) -----------------
  enterSymbol(symbolId: string): void;
  exitSymbol(): void;
  exitToRoot(): void;
  exitToDepth(depth: number): void;
  setEditingFrame(frameIndex: number): void;
  addKeyframe(): void;
  deleteKeyframe(frameIndex: number): void;
  setKeyframeTween(frameIndex: number, objectId: string, tween: TweenProps | null): void;

  // ---- Card operations -----------------------------------------------------
  addCard(): void;
  deleteCard(cardId: string): void;
  duplicateCard(cardId: string): void;
  updateCard(cardId: string, updates: Partial<Omit<Card, 'id' | 'objects'>>): void;

  // ---- Object operations ---------------------------------------------------
  addObject(obj: CardObject): void;
  updateObject(id: string, updates: Partial<CardObject>): void;
  moveObject(id: string, x: number, y: number): void;
  deleteObject(id: string): void;

  // ---- Library operations --------------------------------------------------
  addSymbol(symbol: HNSymbol): void;
  updateSymbol(id: string, updates: Partial<HNSymbol>): void;
  deleteSymbol(id: string): void;

  // ---- Undo / redo ---------------------------------------------------------
  undo(): void;
  redo(): void;
  _pushHistory(project: HyperNovaProject): void;

  // ---- Project operations --------------------------------------------------
  setProject(project: HyperNovaProject): void;
  setProjectName(name: string): void;

  // ---- Play-mode field values----------------------------------------------
  setFieldValue(id: string, value: string): void;
  resetFieldValues(): void;
}

// ---------------------------------------------------------------------------
// Helper: push project snapshot to history
// ---------------------------------------------------------------------------

type SetFn = (fn: (state: HyperNovaStore) => Partial<HyperNovaStore>) => void;

function _pushSnap(set: SetFn, newProject: HyperNovaProject): void {
  set((state) => {
    const trimmed = state.history.slice(0, state.historyIndex + 1);
    const next = [...trimmed, newProject].slice(-50);
    return { project: newProject, history: next, historyIndex: next.length - 1, isDirty: true };
  });
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const defaultProject = createDefaultProject();
const firstCardId = defaultProject.stacks[0].cards[0].id;

export const useHyperNovaStore = create<HyperNovaStore>((set, get) => ({
  // ---- Initial state -------------------------------------------------------
  project: defaultProject,
  selectedStackIndex: 0,
  selectedCardId: firstCardId,
  selectedObjectId: null,
  mode: 'edit',
  activeTool: 'select',
  history: [defaultProject],
  historyIndex: 0,
  fieldValues: {},
  isDirty: false,
  symbolEditPath: [],
  editorSettings: {
    showGrid: false,
    snapToGrid: true,
    gridSize: 20,
    showGuides: true,
  },

  // ---- Mode / tool ---------------------------------------------------------
  setMode: (mode) => set({ mode, selectedObjectId: null, symbolEditPath: [] }),
  setActiveTool: (tool) => set({ activeTool: tool }),

  // ---- Editor settings -----------------------------------------------------
  toggleGrid: () => set((s) => ({ editorSettings: { ...s.editorSettings, showGrid: !s.editorSettings.showGrid } })),
  toggleSnap: () => set((s) => ({ editorSettings: { ...s.editorSettings, snapToGrid: !s.editorSettings.snapToGrid } })),
  toggleGuides: () => set((s) => ({ editorSettings: { ...s.editorSettings, showGuides: !s.editorSettings.showGuides } })),
  setGridSize: (size) => set((s) => ({ editorSettings: { ...s.editorSettings, gridSize: size } })),

  // ---- Navigation ----------------------------------------------------------
  selectCard: (cardId) => set({ selectedCardId: cardId, selectedObjectId: null, symbolEditPath: [] }),
  selectObject: (id) => set({ selectedObjectId: id }),

  // ---- Symbol timeline navigation (Flash-style enter/exit) -----------------
  enterSymbol: (symbolId) => {
    set((state) => ({
      symbolEditPath: [...state.symbolEditPath, { symbolId, frameIndex: 0 }],
      selectedObjectId: null,
    }));
  },

  exitSymbol: () => {
    set((state) => ({
      symbolEditPath: state.symbolEditPath.slice(0, -1),
      selectedObjectId: null,
    }));
  },

  exitToRoot: () => set({ symbolEditPath: [], selectedObjectId: null }),

  /** Navigate to a specific depth in the symbol edit path (0 = inside first symbol) */
  exitToDepth: (depth: number) => {
    set((state) => ({
      symbolEditPath: state.symbolEditPath.slice(0, depth + 1),
      selectedObjectId: null,
    }));
  },

  setEditingFrame: (frameIndex) => {
    set((state) => {
      if (state.symbolEditPath.length === 0) return {};
      const path = [...state.symbolEditPath];
      path[path.length - 1] = { ...path[path.length - 1], frameIndex };
      return { symbolEditPath: path, selectedObjectId: null };
    });
  },

  addKeyframe: () => {
    const state = get();
    if (state.symbolEditPath.length === 0) return;
    const current = state.symbolEditPath[state.symbolEditPath.length - 1];
    const sym = (state.project.library || []).find((s) => s.id === current.symbolId);
    if (!sym) return;
    const nextFrame = sym.frames.length > 0
      ? Math.max(...sym.frames.map((k) => k.frame)) + 1
      : 1;
    const newFrames = [...sym.frames, { frame: nextFrame, objects: [] }];
    const library = (state.project.library || []).map((s) =>
      s.id === current.symbolId ? { ...s, frames: newFrames } : s
    );
    const newProject = { ...state.project, library };
    _pushSnap(set, newProject);
    // Select the newly added keyframe
    const path = [...state.symbolEditPath];
    path[path.length - 1] = { ...current, frameIndex: newFrames.length - 1 };
    set({ symbolEditPath: path, selectedObjectId: null });
  },

  deleteKeyframe: (frameIndex) => {
    const state = get();
    if (state.symbolEditPath.length === 0) return;
    const current = state.symbolEditPath[state.symbolEditPath.length - 1];
    const sym = (state.project.library || []).find((s) => s.id === current.symbolId);
    if (!sym || sym.frames.length <= 1) return; // keep at least 1 frame
    const newFrames = sym.frames.filter((_, i) => i !== frameIndex);
    const library = (state.project.library || []).map((s) =>
      s.id === current.symbolId ? { ...s, frames: newFrames } : s
    );
    const newProject = { ...state.project, library };
    _pushSnap(set, newProject);
    const newIdx = Math.min(current.frameIndex, newFrames.length - 1);
    const path = [...state.symbolEditPath];
    path[path.length - 1] = { ...current, frameIndex: newIdx };
    set({ symbolEditPath: path, selectedObjectId: null });
  },

  setKeyframeTween: (frameIndex, objectId, tween) => {
    const state = get();
    if (state.symbolEditPath.length === 0) return;
    const current = state.symbolEditPath[state.symbolEditPath.length - 1];
    const sym = (state.project.library || []).find((s) => s.id === current.symbolId);
    if (!sym) return;
    const newFrames = sym.frames.map((kf, i) => {
      if (i !== frameIndex) return kf;
      const existingTweens = { ...(kf.tweens ?? {}) };
      if (tween === null) {
        delete existingTweens[objectId];
      } else {
        existingTweens[objectId] = tween;
      }
      return { ...kf, tweens: existingTweens };
    });
    const library = (state.project.library || []).map((s) =>
      s.id === current.symbolId ? { ...s, frames: newFrames } : s
    );
    _pushSnap(set, { ...state.project, library });
  },

  // ---- Card operations -----------------------------------------------------
  addCard: () => {
    const state = get();
    const stack = state.project.stacks[state.selectedStackIndex];
    const newCard = createDefaultCard(stack.cards.length + 1);
    const newStack = { ...stack, cards: [...stack.cards, newCard] };
    const stacks = [...state.project.stacks];
    stacks[state.selectedStackIndex] = newStack;
    const newProject = { ...state.project, stacks };
    _pushSnap(set, newProject);
    set({ selectedCardId: newCard.id, selectedObjectId: null });
  },

  deleteCard: (cardId) => {
    const state = get();
    const stack = state.project.stacks[state.selectedStackIndex];
    if (stack.cards.length <= 1) return; // keep at least 1 card
    const cards = stack.cards.filter((c) => c.id !== cardId);
    const newStack = { ...stack, cards };
    const stacks = [...state.project.stacks];
    stacks[state.selectedStackIndex] = newStack;
    const newProject = { ...state.project, stacks };
    _pushSnap(set, newProject);
    const newCardId =
      state.selectedCardId === cardId ? cards[0].id : state.selectedCardId;
    set({ selectedCardId: newCardId, selectedObjectId: null });
  },

  duplicateCard: (cardId) => {
    const state = get();
    const stack = state.project.stacks[state.selectedStackIndex];
    const card = stack.cards.find((c) => c.id === cardId);
    if (!card) return;
    const dup: Card = {
      ...card,
      id: genId(),
      title: card.title + ' (copy)',
      objects: card.objects.map((o) => ({ ...o, id: genId() })),
    };
    const idx = stack.cards.findIndex((c) => c.id === cardId);
    const cards = [...stack.cards];
    cards.splice(idx + 1, 0, dup);
    const newStack = { ...stack, cards };
    const stacks = [...state.project.stacks];
    stacks[state.selectedStackIndex] = newStack;
    const newProject = { ...state.project, stacks };
    _pushSnap(set, newProject);
    set({ selectedCardId: dup.id, selectedObjectId: null });
  },

  updateCard: (cardId, updates) => {
    const state = get();
    const si = state.selectedStackIndex;
    const stack = state.project.stacks[si];
    const cards = stack.cards.map((c) =>
      c.id === cardId ? { ...c, ...updates } : c
    );
    const stacks = [...state.project.stacks];
    stacks[si] = { ...stack, cards };
    _pushSnap(set, { ...state.project, stacks });
  },

  // ---- Object operations ---------------------------------------------------
  addObject: (obj) => {
    const state = get();
    const si = state.selectedStackIndex;

    // If editing inside a symbol, add to the active keyframe
    if (state.symbolEditPath.length > 0) {
      const current = state.symbolEditPath[state.symbolEditPath.length - 1];
      const library = (state.project.library || []).map((s) => {
        if (s.id !== current.symbolId) return s;
        const frames = s.frames.map((kf, i) =>
          i === current.frameIndex ? { ...kf, objects: [...kf.objects, obj] } : kf
        );
        return { ...s, frames };
      });
      _pushSnap(set, { ...state.project, library });
      set({ selectedObjectId: obj.id });
      return;
    }

    const stack = state.project.stacks[si];
    const cards = stack.cards.map((c) =>
      c.id === state.selectedCardId
        ? { ...c, objects: [...c.objects, obj] }
        : c
    );
    const stacks = [...state.project.stacks];
    stacks[si] = { ...stack, cards };
    _pushSnap(set, { ...state.project, stacks });
    set({ selectedObjectId: obj.id });
  },

  updateObject: (id, updates) => {
    const state = get();
    const si = state.selectedStackIndex;

    if (state.symbolEditPath.length > 0) {
      const current = state.symbolEditPath[state.symbolEditPath.length - 1];
      const library = (state.project.library || []).map((s) => {
        if (s.id !== current.symbolId) return s;
        const frames = s.frames.map((kf, i) =>
          i === current.frameIndex
            ? { ...kf, objects: kf.objects.map((o) => o.id === id ? ({ ...o, ...updates } as CardObject) : o) }
            : kf
        );
        return { ...s, frames };
      });
      _pushSnap(set, { ...state.project, library });
      return;
    }

    const stack = state.project.stacks[si];
    const cards = stack.cards.map((c) =>
      c.id === state.selectedCardId
        ? {
            ...c,
            objects: c.objects.map((o) =>
              o.id === id ? ({ ...o, ...updates } as CardObject) : o
            ),
          }
        : c
    );
    const stacks = [...state.project.stacks];
    stacks[si] = { ...stack, cards };
    _pushSnap(set, { ...state.project, stacks });
  },

  moveObject: (id, x, y) => {
    set((state) => {
      if (state.symbolEditPath.length > 0) {
        const current = state.symbolEditPath[state.symbolEditPath.length - 1];
        const library = (state.project.library || []).map((s) => {
          if (s.id !== current.symbolId) return s;
          const frames = s.frames.map((kf, i) =>
            i === current.frameIndex
              ? { ...kf, objects: kf.objects.map((o) => o.id === id ? ({ ...o, x, y } as CardObject) : o) }
              : kf
          );
          return { ...s, frames };
        });
        const newProject = { ...state.project, library };
        const history = [...state.history];
        history[state.historyIndex] = newProject;
        return { project: newProject, history, isDirty: true };
      }

      const si = state.selectedStackIndex;
      const stack = state.project.stacks[si];
      const cards = stack.cards.map((c) =>
        c.id === state.selectedCardId
          ? {
              ...c,
              objects: c.objects.map((o) =>
                o.id === id ? ({ ...o, x, y } as CardObject) : o
              ),
            }
          : c
      );
      const stacks = [...state.project.stacks];
      stacks[si] = { ...stack, cards };
      const newProject = { ...state.project, stacks };
      const history = [...state.history];
      history[state.historyIndex] = newProject;
      return { project: newProject, history, isDirty: true };
    });
  },

  deleteObject: (id) => {
    const state = get();

    if (state.symbolEditPath.length > 0) {
      const current = state.symbolEditPath[state.symbolEditPath.length - 1];
      const library = (state.project.library || []).map((s) => {
        if (s.id !== current.symbolId) return s;
        const frames = s.frames.map((kf, i) =>
          i === current.frameIndex
            ? { ...kf, objects: kf.objects.filter((o) => o.id !== id) }
            : kf
        );
        return { ...s, frames };
      });
      _pushSnap(set, { ...state.project, library });
      set({ selectedObjectId: null });
      return;
    }

    const si = state.selectedStackIndex;
    const stack = state.project.stacks[si];
    const cards = stack.cards.map((c) =>
      c.id === state.selectedCardId
        ? { ...c, objects: c.objects.filter((o) => o.id !== id) }
        : c
    );
    const stacks = [...state.project.stacks];
    stacks[si] = { ...stack, cards };
    _pushSnap(set, { ...state.project, stacks });
    set({ selectedObjectId: null });
  },

  // ---- Library operations --------------------------------------------------
  addSymbol: (symbol) => {
    const state = get();
    const library = [...(state.project.library || []), symbol];
    _pushSnap(set, { ...state.project, library });
  },

  updateSymbol: (id, updates) => {
    const state = get();
    const library = (state.project.library || []).map((s) =>
      s.id === id ? { ...s, ...updates } : s
    );
    _pushSnap(set, { ...state.project, library });
  },

  deleteSymbol: (id) => {
    const state = get();
    const library = (state.project.library || []).filter((s) => s.id !== id);
    _pushSnap(set, { ...state.project, library });
  },

  // ---- Undo / redo ---------------------------------------------------------
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    set({ project: history[idx], historyIndex: idx });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const idx = historyIndex + 1;
    set({ project: history[idx], historyIndex: idx });
  },

  _pushHistory: (project) => _pushSnap(set, project),

  // ---- Project operations --------------------------------------------------
  setProject: (project) => {
    const firstCard = project.stacks[0]?.cards[0];
    set({
      project,
      selectedCardId: firstCard?.id ?? '',
      selectedObjectId: null,
      history: [project],
      historyIndex: 0,
      isDirty: false,
      mode: 'edit',
      symbolEditPath: [],
    });
  },

  setProjectName: (name) => {
    const state = get();
    _pushSnap(set, { ...state.project, name });
  },

  // ---- Field values --------------------------------------------------------
  setFieldValue: (id, value) =>
    set((state) => ({ fieldValues: { ...state.fieldValues, [id]: value } })),

  resetFieldValues: () => set({ fieldValues: {} }),
}));

// ---------------------------------------------------------------------------
// Convenience selectors
// ---------------------------------------------------------------------------

export function selectCurrentCard(store: HyperNovaStore): Card | undefined {
  const stack = store.project.stacks[store.selectedStackIndex];
  return stack?.cards.find((c) => c.id === store.selectedCardId);
}

export function selectCurrentObject(store: HyperNovaStore): CardObject | null {
  const card = selectCurrentCard(store);
  if (!card || !store.selectedObjectId) return null;
  return card.objects.find((o) => o.id === store.selectedObjectId) ?? null;
}

/** Get the objects currently being edited (card stage or symbol keyframe) */
export function selectEditingObjects(store: HyperNovaStore): CardObject[] {
  if (store.symbolEditPath.length > 0) {
    const current = store.symbolEditPath[store.symbolEditPath.length - 1];
    const sym = (store.project.library || []).find((s) => s.id === current.symbolId);
    if (!sym) return [];
    const kf = sym.frames[current.frameIndex];
    return kf?.objects ?? [];
  }
  const card = selectCurrentCard(store);
  return card?.objects ?? [];
}

/** Get the currently editing symbol (if inside one), or null */
export function selectEditingSymbol(store: HyperNovaStore): HNSymbol | null {
  if (store.symbolEditPath.length === 0) return null;
  const current = store.symbolEditPath[store.symbolEditPath.length - 1];
  return (store.project.library || []).find((s) => s.id === current.symbolId) ?? null;
}

/** Build the breadcrumb trail for symbol editing */
export function selectBreadcrumb(store: HyperNovaStore): { label: string; depth: number }[] {
  const card = selectCurrentCard(store);
  const crumbs: { label: string; depth: number }[] = [
    { label: card?.title ?? 'Card', depth: -1 },
  ];
  for (let i = 0; i < store.symbolEditPath.length; i++) {
    const level = store.symbolEditPath[i];
    const sym = (store.project.library || []).find((s) => s.id === level.symbolId);
    crumbs.push({ label: sym?.name ?? 'Symbol', depth: i });
  }
  return crumbs;
}
