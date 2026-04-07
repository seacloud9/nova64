// hyperNova – KeyframeStrip (v2)
// Flash-inspired multi-row timeline with per-object tween indicators and
// a Play/Stop preview button for MovieClip symbols.
import { useState, useRef, useCallback, useEffect } from 'react';
import { useHyperNovaStore, selectEditingSymbol } from '../shared/store';
import type { TweenProps } from '../shared/schema';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FRAME_W = 34;      // px — width of each keyframe column
const ROW_H = 22;        // px — height of each object/layer row
const LABEL_W = 96;      // px — width of the left object-name label column

const EASE_PRESETS = [
  'power1.inOut', 'power1.out', 'power1.in',
  'power2.inOut', 'power2.out', 'power2.in',
  'power3.inOut', 'power3.out',
  'elastic.out(1, 0.3)', 'bounce.out', 'back.out(1.7)',
  'none',
];

// ---------------------------------------------------------------------------
// Tween popover
// ---------------------------------------------------------------------------

interface PopoverInfo {
  frameIdx: number;
  objectId: string;
  tween: TweenProps;
  x: number;
  y: number;
}

function TweenPopover({
  info,
  onUpdate,
  onRemove,
  onClose,
}: {
  info: PopoverInfo;
  onUpdate: (t: TweenProps) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [ease, setEase] = useState(info.tween.ease ?? 'power2.inOut');
  const [duration, setDuration] = useState<string>(
    info.tween.duration !== undefined ? String(info.tween.duration) : ''
  );

  const handleSave = useCallback(() => {
    const t: TweenProps = { ...info.tween, ease };
    const dur = parseFloat(duration);
    if (!isNaN(dur) && dur > 0) t.duration = dur;
    else delete t.duration;
    onUpdate(t);
    onClose();
  }, [ease, duration, info.tween, onUpdate, onClose]);

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 999 }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          left: info.x,
          top: info.y,
          zIndex: 1000,
          background: '#1a1a30',
          border: '1px solid #3a3a6a',
          borderRadius: 6,
          padding: 10,
          minWidth: 200,
          boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
          fontSize: 11,
          color: '#ccccee',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 700, marginBottom: 8, color: '#8888ff', fontSize: 11 }}>
          ✨ Tween Properties
        </div>

        <label style={{ display: 'block', marginBottom: 6 }}>
          <span style={{ color: '#888', display: 'block', marginBottom: 2 }}>Ease</span>
          <select
            value={ease}
            onChange={(e) => setEase(e.target.value)}
            style={{
              width: '100%',
              background: '#0c0c20',
              border: '1px solid #3a3a6a',
              borderRadius: 3,
              color: '#ccccee',
              padding: '2px 4px',
              fontSize: 11,
            }}
          >
            {EASE_PRESETS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'block', marginBottom: 10 }}>
          <span style={{ color: '#888', display: 'block', marginBottom: 2 }}>
            Duration (s) — blank = auto
          </span>
          <input
            type="number"
            min="0.05"
            max="10"
            step="0.05"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="auto"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#0c0c20',
              border: '1px solid #3a3a6a',
              borderRadius: 3,
              color: '#ccccee',
              padding: '2px 4px',
              fontSize: 11,
            }}
          />
        </label>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '3px 0',
              background: '#2a2a7a',
              border: '1px solid #4444aa',
              borderRadius: 3,
              color: '#aaaaff',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            Save
          </button>
          <button
            onClick={() => { onRemove(); onClose(); }}
            style={{
              padding: '3px 8px',
              background: '#2a1010',
              border: '1px solid #6a3333',
              borderRadius: 3,
              color: '#ff8888',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function KeyframeStrip() {
  const store = useHyperNovaStore();
  const symbol = useHyperNovaStore(selectEditingSymbol);
  const [isPlaying, setIsPlaying] = useState(false);
  const [popover, setPopover] = useState<PopoverInfo | null>(null);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playFrameRef = useRef(0);

  useEffect(() => {
    return () => {
      if (playIntervalRef.current !== null) clearInterval(playIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    setIsPlaying(false);
    if (playIntervalRef.current !== null) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    setPopover(null);
  }, [symbol?.id]);

  if (!symbol || store.symbolEditPath.length === 0) return null;

  const current = store.symbolEditPath[store.symbolEditPath.length - 1];
  const activeIdx = current.frameIndex;
  const isMovieClip = symbol.type === 'movie-clip';

  // Collect all unique object IDs across all keyframes
  const allObjectIds: string[] = [];
  const objectLabels: Record<string, string> = {};
  for (const kf of symbol.frames) {
    for (const obj of kf.objects) {
      if (!allObjectIds.includes(obj.id)) {
        allObjectIds.push(obj.id);
        const lbl =
          (obj as { text?: string }).text ||
          (obj as { label?: string }).label ||
          obj.type;
        objectLabels[obj.id] = String(lbl).slice(0, 12);
      }
    }
  }

  const handlePlayToggle = () => {
    if (isPlaying) {
      if (playIntervalRef.current !== null) clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
      setIsPlaying(false);
    } else {
      playFrameRef.current = 0;
      const ms = 1000 / (symbol.fps || 12);
      const total = symbol.frames.length;
      playIntervalRef.current = setInterval(() => {
        playFrameRef.current = (playFrameRef.current + 1) % total;
        store.setEditingFrame(playFrameRef.current);
        if (!symbol.loop && playFrameRef.current === total - 1) {
          clearInterval(playIntervalRef.current!);
          playIntervalRef.current = null;
          setIsPlaying(false);
        }
      }, ms);
      setIsPlaying(true);
    }
  };

  const handleTweenClick = (
    e: React.MouseEvent,
    frameIdx: number,
    objectId: string,
  ) => {
    e.stopPropagation();
    const kf = symbol.frames[frameIdx];
    const existing: TweenProps = kf?.tweens?.[objectId] ?? { ease: 'power2.inOut' };
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPopover({ frameIdx, objectId, tween: existing, x: rect.left, y: rect.bottom + 4 });
  };

  // ---- Layout ----------------------------------------------------------------

  const frameHeaderRow = (
    <div style={{ display: 'flex', alignItems: 'stretch', height: ROW_H, borderBottom: '1px solid #14142a' }}>
      <div style={{
        width: LABEL_W, minWidth: LABEL_W, display: 'flex', alignItems: 'center',
        paddingLeft: 8, fontSize: 9, color: '#3a3a6a', borderRight: '1px solid #1e1e3a',
        flexShrink: 0, userSelect: 'none',
      }}>
        {isMovieClip ? '▶ MOVIE CLIP' : '◆ GRAPHIC'}
      </div>
      {symbol.frames.map((kf, i) => (
        <div
          key={i}
          onClick={() => store.setEditingFrame(i)}
          title={kf.label ? `Frame ${kf.frame}: "${kf.label}"` : `Frame ${kf.frame}`}
          style={{
            width: FRAME_W, minWidth: FRAME_W, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 9, borderRight: '1px solid #14142a',
            flexShrink: 0, cursor: 'pointer', userSelect: 'none',
            background: i === activeIdx ? '#1e1e50' : 'transparent',
            color: i === activeIdx ? '#aaaaff' : '#3a3a6a',
            fontWeight: i === activeIdx ? 600 : 400,
            borderBottom: i === activeIdx ? '2px solid #6666ff' : '2px solid transparent',
          }}
        >
          {kf.frame}
        </div>
      ))}
      <div style={{ width: 24, flexShrink: 0 }} />
    </div>
  );

  const layerRows = allObjectIds.map((objId) => (
    <div key={objId} style={{ display: 'flex', alignItems: 'stretch', height: ROW_H, borderBottom: '1px solid #14142a' }}>
      <div style={{
        width: LABEL_W, minWidth: LABEL_W, display: 'flex', alignItems: 'center',
        paddingLeft: 8, fontSize: 10, color: '#555588', borderRight: '1px solid #1e1e3a',
        overflow: 'hidden', whiteSpace: 'nowrap', userSelect: 'none', flexShrink: 0,
      }} title={objectLabels[objId]}>
        {objectLabels[objId]}
      </div>
      {symbol.frames.map((kf, i) => {
        const hasObj = kf.objects.some((o) => o.id === objId);
        const hasTween = !!kf.tweens?.[objId];
        const prevHasTween = i > 0 && !!symbol.frames[i - 1].tweens?.[objId];
        const isNotLast = i < symbol.frames.length - 1;

        return (
          <div
            key={i}
            onClick={() => store.setEditingFrame(i)}
            style={{
              width: FRAME_W, minWidth: FRAME_W, borderRight: '1px solid #14142a',
              background: i === activeIdx ? '#14143a' : 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', position: 'relative', flexShrink: 0,
            }}
          >
            {/* tween line coming in from left */}
            {prevHasTween && (
              <div style={{
                position: 'absolute', left: 0, right: '50%', height: 2,
                background: 'linear-gradient(90deg, #4444aa, #6666ff)',
                top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
              }} />
            )}
            {/* diamond */}
            {hasObj && (
              <div style={{
                width: 8, height: 8,
                background: hasTween ? '#6666ff' : '#8888ff',
                transform: 'rotate(45deg)', zIndex: 1, flexShrink: 0, borderRadius: 1,
              }} />
            )}
            {/* tween line going right (clickable) */}
            {hasTween && isNotLast && (
              <div
                onClick={(e) => handleTweenClick(e, i, objId)}
                title="Edit tween →"
                style={{
                  position: 'absolute', left: '50%', right: 0, height: 4,
                  background: 'linear-gradient(90deg, #6666ff, #4444aa)',
                  top: '50%', transform: 'translateY(-50%)',
                  cursor: 'pointer', borderRadius: '0 2px 2px 0', zIndex: 2,
                }}
              />
            )}
            {/* ghost tween area — click to add tween */}
            {hasObj && !hasTween && isNotLast && (
              <div
                onClick={(e) => handleTweenClick(e, i, objId)}
                title="Add tween →"
                style={{
                  position: 'absolute', left: '60%', right: 0, height: 3,
                  background: '#2a2a50', top: '50%', transform: 'translateY(-50%)',
                  cursor: 'pointer', borderRadius: '0 2px 2px 0', opacity: 0.5, zIndex: 2,
                }}
              />
            )}
          </div>
        );
      })}
      <div style={{ width: 24, flexShrink: 0 }} />
    </div>
  ));

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', background: '#0c0c1e',
      borderTop: '1px solid #1e1e3a', borderBottom: '1px solid #1e1e3a', flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '3px 10px', borderBottom: '1px solid #1a1a32', flexShrink: 0,
      }}>
        {isMovieClip && (
          <div
            onClick={handlePlayToggle}
            title={isPlaying ? 'Stop preview' : 'Play preview'}
            style={{
              width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, borderRadius: 3, cursor: 'pointer', flexShrink: 0,
              border: isPlaying ? '1px solid #6666ff' : '1px solid #2a2a5a',
              background: isPlaying ? '#2a2a7a' : '#12122a',
              color: isPlaying ? '#ffffff' : '#8888cc',
            }}
          >
            {isPlaying ? '⏹' : '▶'}
          </div>
        )}
        <span style={{ fontSize: 10, color: '#5555aa', fontWeight: 600, whiteSpace: 'nowrap', userSelect: 'none' }}>
          TIMELINE
        </span>
        <span style={{ fontSize: 9, color: '#3a3a6a', marginLeft: 4 }}>
          {symbol.fps} fps • {symbol.loop ? 'loop' : 'once'} • {symbol.frames.length}{' '}
          {symbol.frames.length === 1 ? 'frame' : 'frames'}
        </span>
        <div
          onClick={() => store.addKeyframe()}
          title="Add keyframe"
          style={{
            width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, borderRadius: 3, border: '1px solid #2a2a5a',
            background: '#1a1a30', color: '#5555aa', cursor: 'pointer', flexShrink: 0, marginLeft: 6,
          }}
        >
          +
        </div>
        {symbol.frames.length > 1 && (
          <div
            onClick={() => {
              if (window.confirm(`Delete frame ${symbol.frames[activeIdx]?.frame}?`)) {
                store.deleteKeyframe(activeIdx);
              }
            }}
            title="Delete current keyframe"
            style={{
              marginLeft: 'auto', padding: '2px 8px', fontSize: 10, borderRadius: 3,
              border: '1px solid #3a2a2a', background: '#1e1018', color: '#aa5555', cursor: 'pointer', flexShrink: 0,
            }}
          >
            ✕ Frame
          </div>
        )}
      </div>

      {/* Timeline grid */}
      <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 'max-content' }}>
          {frameHeaderRow}
          {layerRows}
        </div>
      </div>

      {/* Tween popover */}
      {popover && (
        <TweenPopover
          info={popover}
          onUpdate={(t) => { store.setKeyframeTween(popover.frameIdx, popover.objectId, t); }}
          onRemove={() => { store.setKeyframeTween(popover.frameIdx, popover.objectId, null); }}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
}

