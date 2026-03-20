// hyperNova – root application component
import { useCallback } from 'react';
import { useHyperNovaStore } from './shared/store';
import { CardList } from './editor/CardList';
import { Toolbar } from './editor/Toolbar';
import { EditorCanvas } from './editor/EditorCanvas';
import { PropertiesPanel } from './editor/PropertiesPanel';
import { CardPlayer } from './player/CardPlayer';
import { downloadJson, downloadCart } from './shared/exporter';
import { loadFromFile } from './shared/importer';
import { createExampleProject } from './shared/schema';

// ---------------------------------------------------------------------------
// Styles (all inline to avoid collisions with os9-shell CSS)
// ---------------------------------------------------------------------------

const S = {
  root: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    height: '100%',
    background: '#0d0d1e',
    color: '#e0e0ff',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    overflow: 'hidden',
    userSelect: 'none' as const,
  },
  topBar: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    padding: '5px 10px',
    background: '#0a0a18',
    borderBottom: '1px solid #1e1e3a',
    gap: 8,
    flexShrink: 0,
    flexWrap: 'wrap' as const,
  },
  logo: {
    fontSize: 18,
    fontWeight: 700,
    color: '#8888ff',
    marginRight: 4,
    letterSpacing: -0.5,
    userSelect: 'none' as const,
  },
  projectName: {
    background: '#1a1a32',
    border: '1px solid #2a2a5a',
    borderRadius: 4,
    color: '#c0c0ff',
    padding: '3px 8px',
    fontSize: 13,
    outline: 'none',
    width: 160,
  },
  modeBtn: (active: boolean) => ({
    padding: '4px 14px',
    borderRadius: 6,
    border: `1px solid ${active ? '#5555ff' : '#2a2a5a'}`,
    background: active ? '#2a2a7a' : 'transparent',
    color: active ? '#ffffff' : '#6666aa',
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
  }),
  actionBtn: {
    padding: '4px 10px',
    borderRadius: 5,
    border: '1px solid #2a2a5a',
    background: '#1a1a30',
    color: '#9090cc',
    fontSize: 11,
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  spacer: { flex: 1 },
  body: {
    display: 'flex' as const,
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
  },
  center: {
    flex: 1,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    overflow: 'auto',
    minWidth: 0,
    background: '#0d0d1e',
  },
  toolbarRow: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    padding: '4px 8px',
    background: '#0e0e22',
    borderBottom: '1px solid #1a1a36',
    flexShrink: 0,
    gap: 4,
  },
  canvasWrapper: {
    flex: 1,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 24,
    overflow: 'auto',
  },
  undoBtn: (enabled: boolean) => ({
    padding: '3px 8px',
    borderRadius: 4,
    border: '1px solid #2a2a4a',
    background: enabled ? '#1e1e38' : 'transparent',
    color: enabled ? '#8888cc' : '#333360',
    fontSize: 11,
    cursor: enabled ? 'pointer' : 'default',
  }),
  hint: {
    color: '#3a3a7a',
    fontSize: 10,
    padding: '0 8px',
  },
  playBanner: {
    background: '#0a1a0a',
    borderBottom: '1px solid #1a4a1a',
    color: '#60cc60',
    fontSize: 11,
    padding: '4px 14px',
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 8,
    flexShrink: 0,
  },
};

// ---------------------------------------------------------------------------
// HyperNovaApp
// ---------------------------------------------------------------------------

export function HyperNovaApp() {
  const store = useHyperNovaStore();
  const isPlay = store.mode === 'play';
  const canUndo = store.historyIndex > 0;
  const canRedo = store.historyIndex < store.history.length - 1;

  const handleSave = useCallback(() => {
    downloadJson(store.project);
  }, [store.project]);

  const handleLoad = useCallback(async () => {
    try {
      const project = await loadFromFile();
      store.setProject(project);
    } catch (err) {
      window.alert(`Failed to load project: ${(err as Error).message}`);
    }
  }, [store]);

  const handleExportCart = useCallback(() => {
    downloadCart(store.project);
  }, [store.project]);

  const handleExample = useCallback(() => {
    if (
      !store.isDirty ||
      confirm('Load example? Unsaved changes will be lost.')
    ) {
      store.setProject(createExampleProject());
    }
  }, [store]);

  return (
    <div style={S.root}>
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={S.topBar}>
        <span style={S.logo}>🃏</span>
        <span style={{ color: '#5555aa', fontSize: 13, fontWeight: 600 }}>hyperNova</span>

        <input
          style={S.projectName}
          value={store.project.name}
          onChange={(e) => store.setProjectName(e.target.value)}
          title="Project name"
        />

        <div style={{ width: 1, height: 20, background: '#2a2a4a' }} />

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 2 }}>
          <div
            style={S.modeBtn(!isPlay)}
            onClick={() => store.setMode('edit')}
            title="Switch to edit mode (Escape)"
          >
            ✏️ Edit
          </div>
          <div
            style={S.modeBtn(isPlay)}
            onClick={() => store.setMode('play')}
            title="Switch to play mode"
          >
            ▶ Play
          </div>
        </div>

        <div style={{ width: 1, height: 20, background: '#2a2a4a' }} />

        {/* File actions */}
        <div style={S.actionBtn} onClick={handleLoad} title="Open .hcard.json file">📂 Open</div>
        <div style={S.actionBtn} onClick={handleSave} title="Save as .hcard.json">
          💾 Save{store.isDirty ? ' *' : ''}
        </div>
        <div style={S.actionBtn} onClick={handleExportCart} title="Export as nova64 code.js cart">
          ⬇️ Export Cart
        </div>
        <div style={S.actionBtn} onClick={handleExample} title="Load built-in example stack">
          ✨ Example
        </div>

        <div style={S.spacer} />

        {/* Info */}
        <span style={{ color: '#3a3a7a', fontSize: 10 }}>
          {store.project.stacks[store.selectedStackIndex]?.cards.length ?? 0} cards •{' '}
          640 × 360
        </span>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={S.body}>
        {/* Left sidebar: card list */}
        <CardList />

        {/* Center: toolbar + canvas */}
        <div style={S.center}>
          {isPlay ? (
            /* Play mode banner */
            <div style={S.playBanner}>
              <span>▶ PLAY MODE</span>
              <span style={{ color: '#3a6a3a' }}>
                Click buttons to navigate. Fields are editable.
              </span>
              <button
                style={{
                  marginLeft: 'auto',
                  padding: '2px 10px',
                  background: '#1a3a1a',
                  border: '1px solid #2a6a2a',
                  color: '#60cc60',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 11,
                }}
                onClick={() => store.setMode('edit')}
              >
                ✏️ Back to Edit
              </button>
            </div>
          ) : (
            /* Edit mode toolbar row */
            <div style={S.toolbarRow}>
              <Toolbar />
              {/* Undo / Redo */}
              <div style={S.undoBtn(canUndo)} onClick={() => canUndo && store.undo()} title="Undo (Ctrl+Z)">↩ Undo</div>
              <div style={S.undoBtn(canRedo)} onClick={() => canRedo && store.redo()} title="Redo (Ctrl+Y)">↪ Redo</div>
              <span style={S.hint}>
                {store.activeTool === 'select'
                  ? 'Click object to select · Drag to move · Delete object in Properties panel'
                  : `Click canvas to place ${store.activeTool}`}
              </span>
            </div>
          )}

          {/* Canvas area */}
          <div style={S.canvasWrapper}>
            {isPlay ? <CardPlayer /> : <EditorCanvas />}
          </div>
        </div>

        {/* Right sidebar: properties (edit mode only) */}
        {!isPlay && <PropertiesPanel />}
      </div>
    </div>
  );
}
