// hyperNova – EditorCanvas
// WYSIWYG card editing canvas with drag-to-move and click-to-add
import React, { useRef, useState, useCallback, useEffect } from 'react'; // React needed for .CSSProperties
import { useHyperNovaStore, selectCurrentCard } from '../shared/store';
import type { CardObject } from '../shared/schema';
import {
  createDefaultButton, createDefaultText, createDefaultField,
  createDefaultRect, createDefaultImageObj,
} from '../shared/schema';

// nova64 resolution
export const CARD_W = 640;
export const CARD_H = 360;

// ---------------------------------------------------------------------------
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
// EditorCanvas
// ---------------------------------------------------------------------------

export function EditorCanvas() {
  const store = useHyperNovaStore();
  const currentCard = useHyperNovaStore(selectCurrentCard);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  // Track drag without re-render
  const [isDragging, setIsDragging] = useState(false);

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
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);

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
    [store]
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

  // ---- Global mouse move & up during drag ----------------------------------
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startMouseX;
      const dy = e.clientY - d.startMouseY;
      const newX = Math.max(0, Math.min(CARD_W - 10, d.startObjX + dx));
      const newY = Math.max(0, Math.min(CARD_H - 10, d.startObjY + dy));
      store.moveObject(d.objId, Math.round(newX), Math.round(newY));
    };

    const onUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setIsDragging(false);
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

  const bgStyle = renderCardBackground(currentCard.background);
  const cursorStyle =
    store.activeTool === 'select' ? (isDragging ? 'grabbing' : 'default') : 'crosshair';

  return (
    <div
      style={{
        position: 'relative',
        width: CARD_W,
        height: CARD_H,
        ...bgStyle,
        cursor: cursorStyle,
        flexShrink: 0,
        overflow: 'hidden',
        boxShadow: '0 4px 32px rgba(0,0,0,0.6)',
      }}
      ref={canvasRef}
      onClick={handleCanvasClick}
    >
      {currentCard.objects.map((obj) => {
        const selected = obj.id === store.selectedObjectId;
        const style = renderObjectStyle(obj, selected);

        return (
          <div
            key={obj.id}
            style={style}
            onMouseDown={(e) => handleObjMouseDown(e, obj)}
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
          }}
        >
          Click to place {store.activeTool}
        </div>
      )}
    </div>
  );
}
