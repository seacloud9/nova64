// hyperNova – LibraryPanel
// Flash-inspired symbol library: manage reusable Graphics and MovieClips
import { useState, useCallback } from 'react';
import { useHyperNovaStore, selectCurrentCard } from '../shared/store';
import type { HNSymbol, SymbolType } from '../shared/schema';
import { createDefaultSymbol, createDefaultMovieClip, createSymbolInstance, genId } from '../shared/schema';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const S = {
  panel: {
    width: 200,
    background: '#0e0e20',
    borderLeft: '1px solid #1e1e3a',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    overflow: 'hidden',
    flexShrink: 0,
  },
  header: {
    padding: '8px 10px',
    borderBottom: '1px solid #1e1e3a',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    flexShrink: 0,
  },
  title: {
    fontSize: 11,
    fontWeight: 600,
    color: '#8888cc',
    letterSpacing: 0.5,
  },
  addBtn: {
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid #2a2a5a',
    background: '#1a1a30',
    color: '#8888cc',
    fontSize: 11,
    cursor: 'pointer',
  },
  list: {
    flex: 1,
    overflow: 'auto' as const,
    padding: '4px 0',
  },
  item: (selected: boolean) => ({
    padding: '6px 10px',
    cursor: 'pointer',
    background: selected ? '#1a1a5a' : 'transparent',
    borderLeft: selected ? '3px solid #6666ff' : '3px solid transparent',
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 6,
    transition: 'background 0.1s',
  }),
  itemIcon: {
    fontSize: 14,
    width: 18,
    textAlign: 'center' as const,
  },
  itemName: {
    fontSize: 12,
    color: '#c0c0ff',
    flex: 1,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  },
  itemType: {
    fontSize: 9,
    color: '#555588',
    textTransform: 'uppercase' as const,
  },
  actions: {
    padding: '6px 10px',
    borderTop: '1px solid #1e1e3a',
    display: 'flex' as const,
    gap: 4,
    flexShrink: 0,
  },
  actionBtn: (enabled: boolean) => ({
    flex: 1,
    padding: '4px 2px',
    borderRadius: 4,
    border: `1px solid ${enabled ? '#2a2a5a' : '#1a1a30'}`,
    background: enabled ? '#1a1a30' : 'transparent',
    color: enabled ? '#8888cc' : '#333355',
    fontSize: 10,
    cursor: enabled ? 'pointer' : 'default',
    textAlign: 'center' as const,
  }),
  detail: {
    padding: '8px 10px',
    borderTop: '1px solid #1e1e3a',
    flexShrink: 0,
  },
  detailRow: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 10,
    color: '#5555aa',
    width: 50,
  },
  detailInput: {
    flex: 1,
    background: '#1a1a32',
    border: '1px solid #2a2a5a',
    borderRadius: 3,
    color: '#c0c0ff',
    padding: '2px 6px',
    fontSize: 11,
    outline: 'none',
  },
  empty: {
    padding: 20,
    textAlign: 'center' as const,
    color: '#3a3a6a',
    fontSize: 11,
    lineHeight: 1.6,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LibraryPanel() {
  const store = useHyperNovaStore();
  const currentCard = useHyperNovaStore(selectCurrentCard);
  const [selectedSymbolId, setSelectedSymbolId] = useState<string | null>(null);
  const [showNewMenu, setShowNewMenu] = useState(false);

  const library = store.project.library || [];
  const selected = library.find((s) => s.id === selectedSymbolId) ?? null;

  const handleNewSymbol = useCallback((type: SymbolType) => {
    const name = type === 'graphic' ? `Symbol ${library.length + 1}` : `MovieClip ${library.length + 1}`;
    const sym = type === 'graphic' ? createDefaultSymbol(name) : createDefaultMovieClip(name);
    store.addSymbol(sym);
    setSelectedSymbolId(sym.id);
    setShowNewMenu(false);
  }, [store, library.length]);

  const handleDelete = useCallback(() => {
    if (!selectedSymbolId) return;
    store.deleteSymbol(selectedSymbolId);
    setSelectedSymbolId(null);
  }, [store, selectedSymbolId]);

  const handlePlaceInstance = useCallback(() => {
    if (!selected || !currentCard) return;
    const inst = createSymbolInstance(selected.id, 100, 100, selected.width, selected.height);
    store.addObject(inst);
  }, [store, selected, currentCard]);

  const handleConvertSelection = useCallback(() => {
    // Convert the selected object(s) on the card into a new symbol
    const card = selectCurrentCard(useHyperNovaStore.getState());
    const objId = store.selectedObjectId;
    if (!card || !objId) return;

    const obj = card.objects.find((o) => o.id === objId);
    if (!obj || obj.type === 'symbol-instance') return;

    const sym: HNSymbol = {
      id: genId(),
      name: `Symbol from ${obj.type}`,
      type: 'graphic',
      width: obj.width,
      height: obj.height,
      frames: [{ frame: 1, objects: [{ ...obj, x: 0, y: 0, id: genId() }] }],
      fps: 12,
      loop: false,
    };
    store.addSymbol(sym);

    // Replace the object with a symbol instance
    const inst = createSymbolInstance(sym.id, obj.x, obj.y, obj.width, obj.height);
    store.deleteObject(objId);
    store.addObject(inst);
    setSelectedSymbolId(sym.id);
  }, [store]);

  const handleRename = useCallback((name: string) => {
    if (!selectedSymbolId) return;
    store.updateSymbol(selectedSymbolId, { name });
  }, [store, selectedSymbolId]);

  return (
    <div style={S.panel}>
      {/* Header */}
      <div style={S.header}>
        <span style={S.title}>LIBRARY</span>
        <div style={{ position: 'relative' }}>
          <div style={S.addBtn} onClick={() => setShowNewMenu(!showNewMenu)}>+ New</div>
          {showNewMenu && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 2,
              background: '#1a1a38', border: '1px solid #3a3a6a', borderRadius: 4,
              zIndex: 100, minWidth: 120, padding: '4px 0',
            }}>
              <div
                style={{ padding: '4px 12px', fontSize: 11, color: '#c0c0ff', cursor: 'pointer' }}
                onClick={() => handleNewSymbol('graphic')}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.background = '#2a2a5a'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
              >
                ◆ Graphic Symbol
              </div>
              <div
                style={{ padding: '4px 12px', fontSize: 11, color: '#c0c0ff', cursor: 'pointer' }}
                onClick={() => handleNewSymbol('movie-clip')}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.background = '#2a2a5a'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
              >
                ▶ Movie Clip
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Symbol list */}
      <div style={S.list}>
        {library.length === 0 ? (
          <div style={S.empty}>
            No symbols yet.<br />
            Create reusable Graphics<br />
            and Movie Clips here.
          </div>
        ) : (
          library.map((sym) => (
            <div
              key={sym.id}
              style={S.item(sym.id === selectedSymbolId)}
              onClick={() => setSelectedSymbolId(sym.id === selectedSymbolId ? null : sym.id)}
            >
              <span style={S.itemIcon}>{sym.type === 'movie-clip' ? '▶' : '◆'}</span>
              <span style={S.itemName}>{sym.name}</span>
              <span style={S.itemType}>{sym.type === 'movie-clip' ? 'MC' : 'GFX'}</span>
            </div>
          ))
        )}
      </div>

      {/* Selected symbol details */}
      {selected && (
        <div style={S.detail}>
          <div style={S.detailRow}>
            <span style={S.detailLabel}>Name</span>
            <input
              style={S.detailInput}
              value={selected.name}
              onChange={(e) => handleRename(e.target.value)}
            />
          </div>
          <div style={S.detailRow}>
            <span style={S.detailLabel}>Size</span>
            <span style={{ fontSize: 10, color: '#8888aa' }}>
              {selected.width} × {selected.height}
            </span>
          </div>
          <div style={S.detailRow}>
            <span style={S.detailLabel}>Frames</span>
            <span style={{ fontSize: 10, color: '#8888aa' }}>
              {selected.frames.length} • {selected.fps} fps{selected.loop ? ' • loop' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={S.actions}>
        <div
          style={S.actionBtn(!!selected)}
          onClick={selected ? handlePlaceInstance : undefined}
          title="Place an instance of this symbol on the current card"
        >
          ⊕ Place
        </div>
        <div
          style={S.actionBtn(!!store.selectedObjectId)}
          onClick={store.selectedObjectId ? handleConvertSelection : undefined}
          title="Convert selected card object into a symbol"
        >
          ⬡ Convert
        </div>
        <div
          style={S.actionBtn(!!selected)}
          onClick={selected ? handleDelete : undefined}
          title="Delete selected symbol from library"
        >
          🗑
        </div>
      </div>
    </div>
  );
}
