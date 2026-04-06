// hyperNova – KeyframeStrip
// Flash-inspired timeline strip shown when editing inside a MovieClip symbol
import { useHyperNovaStore, selectEditingSymbol } from '../shared/store';

const S = {
  strip: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 2,
    padding: '4px 10px',
    background: '#0c0c1e',
    borderTop: '1px solid #1e1e3a',
    borderBottom: '1px solid #1e1e3a',
    flexShrink: 0,
    overflow: 'auto' as const,
  },
  label: {
    fontSize: 10,
    color: '#5555aa',
    fontWeight: 600,
    marginRight: 6,
    whiteSpace: 'nowrap' as const,
    userSelect: 'none' as const,
  },
  frame: (active: boolean) => ({
    width: 28,
    height: 22,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    fontSize: 10,
    borderRadius: 3,
    border: active ? '1px solid #6666ff' : '1px solid #2a2a4a',
    background: active ? '#2a2a7a' : '#12122a',
    color: active ? '#ffffff' : '#6666aa',
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    userSelect: 'none' as const,
    transition: 'all 0.1s',
    flexShrink: 0,
  }),
  addBtn: {
    width: 22,
    height: 22,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    fontSize: 14,
    borderRadius: 3,
    border: '1px solid #2a2a5a',
    background: '#1a1a30',
    color: '#5555aa',
    cursor: 'pointer',
    flexShrink: 0,
  },
  deleteBtn: {
    marginLeft: 'auto' as const,
    padding: '2px 8px',
    fontSize: 10,
    borderRadius: 3,
    border: '1px solid #3a2a2a',
    background: '#1e1018',
    color: '#aa5555',
    cursor: 'pointer',
    flexShrink: 0,
  },
  info: {
    fontSize: 9,
    color: '#3a3a6a',
    marginLeft: 8,
    whiteSpace: 'nowrap' as const,
  },
};

export function KeyframeStrip() {
  const store = useHyperNovaStore();
  const symbol = useHyperNovaStore(selectEditingSymbol);

  if (!symbol || store.symbolEditPath.length === 0) return null;

  const current = store.symbolEditPath[store.symbolEditPath.length - 1];
  const activeIdx = current.frameIndex;

  return (
    <div style={S.strip}>
      <span style={S.label}>
        {symbol.type === 'movie-clip' ? '▶' : '◆'} TIMELINE
      </span>

      {symbol.frames.map((kf, i) => (
        <div
          key={i}
          style={S.frame(i === activeIdx)}
          onClick={() => store.setEditingFrame(i)}
          title={kf.label ? `Frame ${kf.frame}: "${kf.label}"` : `Frame ${kf.frame}`}
        >
          {kf.frame}
        </div>
      ))}

      <div
        style={S.addBtn}
        onClick={() => store.addKeyframe()}
        title="Add keyframe"
      >
        +
      </div>

      <span style={S.info}>
        {symbol.frames[activeIdx]?.objects.length ?? 0} objects •{' '}
        {symbol.fps} fps •{' '}
        {symbol.loop ? 'loop' : 'once'}
      </span>

      {symbol.frames.length > 1 && (
        <div
          style={S.deleteBtn}
          onClick={() => {
            if (confirm(`Delete frame ${symbol.frames[activeIdx]?.frame}?`)) {
              store.deleteKeyframe(activeIdx);
            }
          }}
          title="Delete current keyframe"
        >
          ✕ Delete Frame
        </div>
      )}
    </div>
  );
}
