// hyperNova – EditorCanvas
// WYSIWYG card editing canvas with drag-to-move, snap-to-grid, and alignment guides
import React, { useRef, useState, useCallback, useEffect } from 'react'; // React needed for .CSSProperties
import { useHyperNovaStore, selectCurrentCard, selectEditingObjects, selectEditingSymbol } from '../shared/store';
import type { CardObject } from '../shared/schema';
import {
  createDefaultButton, createDefaultText, createDefaultField,
  createDefaultRect, createDefaultImageObj,
} from '../shared/schema';

// nova64 resolution
export const CARD_W = 640;
export const CARD_H = 360;

// Snap threshold for smart alignment guides (px)
const GUIDE_SNAP_THRESHOLD = 6;
// Object renderer (shared by editor and player)
// ---------------------------------------------------------------------------

export function renderCardBackground(bg: { type: string; color: string; gradientTo?: string }): React.CSSProperties {
  // shared with CardPlayer
  if (bg.type === '2d-gradient' && bg.gradientTo) {
    return { background: `linear-gradient(135deg, ${bg.color} 0%, ${bg.gradientTo} 100%)` };
  }
  return { background: bg.color };
}

export function renderObjectStyle(obj: CardObject, selected: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    left: obj.x,
    top: obj.y,
    width: obj.width,
    height: obj.height,
    boxSizing: 'border-box',
    outline: selected ? '2px dashed #6688ff' : 'none',
    outlineOffset: selected ? 1 : 0,
  };

  if (obj.type === 'rect') {
    return {
      ...base,
      background: obj.bgColor,
      border: `${obj.borderWidth}px solid ${obj.borderColor}`,
      borderRadius: obj.borderRadius,
    };
  }
  if (obj.type === 'button') {
    return {
      ...base,
      background: obj.bgColor,
      color: obj.textColor,
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 600,
      fontSize: 14,
      cursor: 'pointer',
      userSelect: 'none',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    };
  }
  if (obj.type === 'text') {
    return {
      ...base,
      color: obj.color,
      fontSize: obj.fontSize,
      fontWeight: obj.bold ? 700 : 400,
      fontStyle: obj.italic ? 'italic' : 'normal',
      whiteSpace: 'pre-wrap',
      lineHeight: 1.4,
      display: 'flex',
      alignItems: 'flex-start',
      padding: 2,
    };
  }
  if (obj.type === 'field') {
    return {
      ...base,
      background: 'rgba(255,255,255,0.9)',
      border: '1px solid #aaa',
      borderRadius: 4,
      padding: '4px 6px',
      fontSize: obj.fontSize,
      color: '#1a1a1a',
    };
  }
  if (obj.type === 'image') {
    return {
      ...base,
      background: selected ? 'none' : 'rgba(80,80,200,0.1)',
      border: '1px dashed #8888ff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#8888ff',
      fontSize: 11,
    };
  }
  return base;
}

// ---------------------------------------------------------------------------
// Drag state
// ---------------------------------------------------------------------------

interface DragState {
  objId: string;
  startMouseX: number;
  startMouseY: number;
  startObjX: number;
  startObjY: number;
}

// ---------------------------------------------------------------------------
// Smart alignment guides helper
// ---------------------------------------------------------------------------

interface GuideResult {
  x: number;
  y: number;
  guides: { type: 'h' | 'v'; pos: number }[];
}

function computeAlignmentGuides(
  dragged: CardObject,
  rawX: number,
  rawY: number,
  objects: CardObject[],
  threshold: number
): GuideResult {
  const guides: { type: 'h' | 'v'; pos: number }[] = [];
  let snapX = rawX;
  let snapY = rawY;

  const dCX = rawX + dragged.width / 2;
  const dCY = rawY + dragged.height / 2;
  const dR = rawX + dragged.width;
  const dB = rawY + dragged.height;

  // Canvas center guides
  const canvasCX = CARD_W / 2;
  const canvasCY = CARD_H / 2;
  if (Math.abs(dCX - canvasCX) < threshold) { snapX = canvasCX - dragged.width / 2; guides.push({ type: 'v', pos: canvasCX }); }
  if (Math.abs(dCY - canvasCY) < threshold) { snapY = canvasCY - dragged.height / 2; guides.push({ type: 'h', pos: canvasCY }); }

  for (const other of objects) {
    if (other.id === dragged.id) continue;
    const oCX = other.x + other.width / 2;
    const oCY = other.y + other.height / 2;
    const oR = other.x + other.width;
    const oB = other.y + other.height;

    // Vertical guides: left-left, right-right, left-right, right-left, center-center
    if (Math.abs(rawX - other.x) < threshold) { snapX = other.x; guides.push({ type: 'v', pos: other.x }); }
    else if (Math.abs(dR - oR) < threshold) { snapX = oR - dragged.width; guides.push({ type: 'v', pos: oR }); }
    else if (Math.abs(rawX - oR) < threshold) { snapX = oR; guides.push({ type: 'v', pos: oR }); }
    else if (Math.abs(dR - other.x) < threshold) { snapX = other.x - dragged.width; guides.push({ type: 'v', pos: other.x }); }
    else if (Math.abs(dCX - oCX) < threshold) { snapX = oCX - dragged.width / 2; guides.push({ type: 'v', pos: oCX }); }

    // Horizontal guides: top-top, bottom-bottom, top-bottom, bottom-top, center-center
    if (Math.abs(rawY - other.y) < threshold) { snapY = other.y; guides.push({ type: 'h', pos: other.y }); }
    else if (Math.abs(dB - oB) < threshold) { snapY = oB - dragged.height; guides.push({ type: 'h', pos: oB }); }
    else if (Math.abs(rawY - oB) < threshold) { snapY = oB; guides.push({ type: 'h', pos: oB }); }
    else if (Math.abs(dB - other.y) < threshold) { snapY = other.y - dragged.height; guides.push({ type: 'h', pos: other.y }); }
    else if (Math.abs(dCY - oCY) < threshold) { snapY = oCY - dragged.height / 2; guides.push({ type: 'h', pos: oCY }); }
  }

  return { x: snapX, y: snapY, guides };
}

// ---------------------------------------------------------------------------
// Grid overlay component
// ---------------------------------------------------------------------------

function GridOverlay({ gridSize }: { gridSize: number }) {
  return (
    <svg
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
      width={CARD_W}
      height={CARD_H}
    >
      <defs>
        <pattern id="hn-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
          <path
            d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
            fill="none"
            stroke="rgba(100,100,255,0.15)"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hn-grid)" />
      {/* Center crosshair */}
      <line x1={CARD_W / 2} y1={0} x2={CARD_W / 2} y2={CARD_H} stroke="rgba(100,100,255,0.25)" strokeWidth="0.5" strokeDasharray="4 4" />
      <line x1={0} y1={CARD_H / 2} x2={CARD_W} y2={CARD_H / 2} stroke="rgba(100,100,255,0.25)" strokeWidth="0.5" strokeDasharray="4 4" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Alignment guide lines component
// ---------------------------------------------------------------------------

function AlignmentGuides({ guides }: { guides: { type: 'h' | 'v'; pos: number }[] }) {
  if (guides.length === 0) return null;
  // Deduplicate
  const seen = new Set<string>();
  const unique = guides.filter((g) => {
    const key = `${g.type}:${g.pos}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return (
    <svg
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9999 }}
      width={CARD_W}
      height={CARD_H}
    >
      {unique.map((g, i) =>
        g.type === 'v' ? (
          <line key={i} x1={g.pos} y1={0} x2={g.pos} y2={CARD_H} stroke="#ff4488" strokeWidth="1" strokeDasharray="3 3" />
        ) : (
          <line key={i} x1={0} y1={g.pos} x2={CARD_W} y2={g.pos} stroke="#ff4488" strokeWidth="1" strokeDasharray="3 3" />
        )
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// EditorCanvas
// ---------------------------------------------------------------------------

export function EditorCanvas() {
  const store = useHyperNovaStore();
  const currentCard = useHyperNovaStore(selectCurrentCard);
  const editingObjects = useHyperNovaStore(selectEditingObjects);
  const editingSymbol = useHyperNovaStore(selectEditingSymbol);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const isInsideSymbol = store.symbolEditPath.length > 0;

  const { showGrid, snapToGrid, gridSize, showGuides } = store.editorSettings;

  // Track drag without re-render
  const [isDragging, setIsDragging] = useState(false);
  // Active alignment guides during drag
  const [activeGuides, setActiveGuides] = useState<{ type: 'h' | 'v'; pos: number }[]>([]);

  // Snap value to grid
  const snapToGridFn = useCallback(
    (v: number) => (snapToGrid ? Math.round(v / gridSize) * gridSize : v),
    [snapToGrid, gridSize]
  );

  // ---- Canvas click: add object -------------------------------------------
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (store.activeTool === 'select') {
        // clicked the canvas itself (not an object) → deselect
        if (e.target === canvasRef.current) {
          store.selectObject(null);
        }
        return;
      }

      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      let x = Math.round(e.clientX - rect.left);
      let y = Math.round(e.clientY - rect.top);
      if (snapToGrid) {
        x = snapToGridFn(x);
        y = snapToGridFn(y);
      }

      let obj: CardObject;
      switch (store.activeTool) {
        case 'button': obj = createDefaultButton(x - 60, y - 18); break;
        case 'text':   obj = createDefaultText(x, y - 20); break;
        case 'field':  obj = createDefaultField(x - 100, y - 18); break;
        case 'rect':   obj = createDefaultRect(x - 80, y - 40); break;
        case 'image':  obj = createDefaultImageObj(x - 60, y - 45); break;
        default: return;
      }

      store.addObject(obj);
      store.setActiveTool('select');
    },
    [store, snapToGrid, snapToGridFn]
  );

  // ---- Object mousedown: begin drag ----------------------------------------
  const handleObjMouseDown = useCallback(
    (e: React.MouseEvent, obj: CardObject) => {
      e.stopPropagation();
      store.selectObject(obj.id);
      if (store.activeTool !== 'select') return;

      dragRef.current = {
        objId: obj.id,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startObjX: obj.x,
        startObjY: obj.y,
      };
      setIsDragging(true);
    },
    [store]
  );

  // ---- Double-click: enter MovieClip symbol --------------------------------
  const handleObjDoubleClick = useCallback(
    (e: React.MouseEvent, obj: CardObject) => {
      e.stopPropagation();
      if (obj.type !== 'symbol-instance') return;
      const sym = store.project.library?.find((s) => s.id === obj.symbolId);
      if (!sym) return;
      store.enterSymbol(sym.id);
    },
    [store]
  );

  // ---- Global mouse move & up during drag ----------------------------------
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startMouseX;
      const dy = e.clientY - d.startMouseY;
      let newX = d.startObjX + dx;
      let newY = d.startObjY + dy;

      // Snap to grid
      const settings = useHyperNovaStore.getState().editorSettings;
      if (settings.snapToGrid) {
        newX = Math.round(newX / settings.gridSize) * settings.gridSize;
        newY = Math.round(newY / settings.gridSize) * settings.gridSize;
      }

      // Smart alignment guides
      if (settings.showGuides) {
        const st = useHyperNovaStore.getState();
        const objs = selectEditingObjects(st);
        const dragged = objs.find((o) => o.id === d.objId);
        if (dragged) {
          const result = computeAlignmentGuides(dragged, newX, newY, objs, GUIDE_SNAP_THRESHOLD);
          newX = result.x;
          newY = result.y;
          setActiveGuides(result.guides);
        }
      }

      // Clamp to canvas bounds
      newX = Math.max(0, Math.min(CARD_W - 10, newX));
      newY = Math.max(0, Math.min(CARD_H - 10, newY));

      store.moveObject(d.objId, Math.round(newX), Math.round(newY));
    };

    const onUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setIsDragging(false);
        setActiveGuides([]);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [store]);

  if (!currentCard) {
    return (
      <div style={{ color: '#4444aa', padding: 40, textAlign: 'center' }}>
        No card selected
      </div>
    );
  }

  const bgStyle = isInsideSymbol
    ? { background: '#18182e' } // neutral bg when editing inside a symbol
    : renderCardBackground(currentCard.background);
  const cursorStyle =
    store.activeTool === 'select' ? (isDragging ? 'grabbing' : 'default') : 'crosshair';

  // Always use full card dimensions for the canvas — symbol editing uses the same stage size
  const canvasW = CARD_W;
  const canvasH = CARD_H;

  return (
    <div
      style={{
        position: 'relative',
        width: canvasW,
        height: canvasH,
        ...bgStyle,
        cursor: cursorStyle,
        flexShrink: 0,
        overflow: 'hidden',
        boxShadow: isInsideSymbol
          ? '0 4px 32px rgba(100,100,255,0.3), inset 0 0 0 2px #4444aa'
          : '0 4px 32px rgba(0,0,0,0.6)',
      }}
      ref={canvasRef}
      onClick={handleCanvasClick}
    >
      {/* Grid overlay */}
      {showGrid && <GridOverlay gridSize={gridSize} />}

      {/* Smart alignment guides */}
      {showGuides && isDragging && <AlignmentGuides guides={activeGuides} />}

      {/* Symbol editing indicator */}
      {isInsideSymbol && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            right: 4,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: 9, color: '#6666aa', background: '#0e0e2080', padding: '1px 6px', borderRadius: 3 }}>
            ⬡ Editing: {editingSymbol?.name}
          </span>
          <span
            style={{ fontSize: 9, color: '#8888cc', background: '#0e0e2080', padding: '1px 6px', borderRadius: 3, cursor: 'pointer', pointerEvents: 'all' }}
            onClick={() => store.exitSymbol()}
          >
            ↩ Back
          </span>
        </div>
      )}

      {editingObjects.map((obj) => {
        const selected = obj.id === store.selectedObjectId;
        const style = renderObjectStyle(obj, selected);

        return (
          <div
            key={obj.id}
            style={{ ...style, zIndex: 1 }}
            onMouseDown={(e) => handleObjMouseDown(e, obj)}
            onDoubleClick={(e) => handleObjDoubleClick(e, obj)}
          >
            {obj.type === 'text' && obj.text}
            {obj.type === 'button' && obj.label}
            {obj.type === 'field' && (
              <span style={{ color: '#888', fontStyle: 'italic', fontSize: obj.fontSize }}>
                {obj.placeholder}
              </span>
            )}
            {obj.type === 'image' && (
              obj.asset ? (
                <img
                  src={obj.asset}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  alt=""
                />
              ) : (
                <span>🖼 No asset</span>
              )
            )}
            {obj.type === 'symbol-instance' && (
              <span style={{ color: '#aa88ff', fontSize: 11, cursor: 'pointer' }} title="Double-click to enter timeline">⬡ Symbol</span>
            )}

            {/* Resize handle hint (bottom-right) */}
            {selected && (
              <div
                style={{
                  position: 'absolute',
                  right: 1,
                  bottom: 1,
                  width: 10,
                  height: 10,
                  background: '#6688ff',
                  borderRadius: 2,
                  cursor: 'se-resize',
                  opacity: 0.8,
                }}
              />
            )}
          </div>
        );
      })}

      {/* Crosshair hint when in add mode */}
      {store.activeTool !== 'select' && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            background: 'rgba(0,0,0,0.6)',
            color: '#aaaaff',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 11,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          Click to place {store.activeTool}
        </div>
      )}
    </div>
  );
}
