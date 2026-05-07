import { useState, useRef, useEffect, ReactNode } from 'react';
import { useWindowStore } from '../os/stores';
import { UISounds } from '../os/sounds';

type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const EDGE_SIZE = 6;

const EDGE_CURSORS: Record<ResizeEdge, string> = {
  n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize',
  ne: 'ne-resize', nw: 'nw-resize', se: 'nwse-resize', sw: 'sw-resize',
};

/**
 * Stable container for imperatively-mounted app content.
 * When no React children are provided (the common case for imperatively-mounted apps),
 * this renders a self-closing div. React sees no children to reconcile, so it will
 * never clear content injected by app.mount() / createRoot().
 * This prevents the minimize/restore bug where content disappeared.
 */
function ImperativeContent({ children }: { children?: ReactNode }) {
  if (children) {
    return (
      <div className="window-content" style={{ overflow: 'auto', flex: 1 }}>
        {children}
      </div>
    );
  }
  return <div className="window-content" style={{ overflow: 'auto', flex: 1 }} />;
}

interface WindowProps {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  isShaded: boolean;
  isMaximized: boolean;
  isMinimized?: boolean;
  zIndex: number;
  isActive: boolean;
  closable?: boolean;
  resizable?: boolean;
  children?: ReactNode;
  onClose?: () => void;
  onFocus?: () => void;
}

export function Window({
  id,
  title,
  x,
  y,
  width,
  height,
  minWidth = 150,
  minHeight = 50,
  isShaded,
  isMaximized,
  isMinimized = false,
  zIndex,
  isActive,
  closable = true,
  resizable = true,
  children,
  onClose,
  onFocus,
}: WindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeEdge, setResizeEdge] = useState<ResizeEdge | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, wx: 0, wy: 0, width: 0, height: 0 });
  
  const { updateWindow, toggleMaximize, minimizeWindow } = useWindowStore();

  // Calculate actual position and size
  const actualX = isMaximized ? 0 : x;
  const actualY = isMaximized ? 20 : y; // Below menu bar
  const actualWidth = isMaximized ? window.innerWidth : width;
  const actualHeight = isMaximized ? window.innerHeight - 50 : height; // Account for menu + control strip

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        updateWindow(id, {
          x: x + dx,
          y: y + dy,
        });
        setDragStart({ x: e.clientX, y: e.clientY });
      } else if (resizeEdge) {
        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;
        const updates: Partial<{ x: number; y: number; width: number; height: number }> = {};

        // Horizontal
        if (resizeEdge.includes('e')) {
          updates.width = Math.max(minWidth, resizeStart.width + dx);
        }
        if (resizeEdge.includes('w')) {
          const newWidth = Math.max(minWidth, resizeStart.width - dx);
          updates.width = newWidth;
          updates.x = resizeStart.wx + (resizeStart.width - newWidth);
        }

        // Vertical
        if (resizeEdge.includes('s')) {
          updates.height = Math.max(minHeight, resizeStart.height + dy);
        }
        if (resizeEdge === 'n' || resizeEdge === 'ne' || resizeEdge === 'nw') {
          const newHeight = Math.max(minHeight, resizeStart.height - dy);
          updates.height = newHeight;
          updates.y = resizeStart.wy + (resizeStart.height - newHeight);
        }

        updateWindow(id, updates);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setResizeEdge(null);
    };

    if (isDragging || resizeEdge) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, resizeEdge, dragStart, resizeStart, x, y, id, updateWindow, minWidth, minHeight]);

  const handleTitleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !isMaximized) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      onFocus?.();
    }
  };

  const handleTitleDoubleClick = () => {
    toggleMaximize(id);
  };

  const handleEdgeMouseDown = (edge: ResizeEdge) => (e: React.MouseEvent) => {
    if (e.button === 0 && !isMaximized) {
      e.stopPropagation();
      setResizeEdge(edge);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        wx: x,
        wy: y,
        width,
        height,
      });
      onFocus?.();
    }
  };

  const handleClose = () => {
    UISounds.windowClose();
    onClose?.();
  };

  const handleZoom = () => {
    toggleMaximize(id);
  };

  const handleMinimize = () => {
    UISounds.windowShade();
    minimizeWindow(id);
  };

  const handleContentClick = () => {
    onFocus?.();
  };

  return (
    <div
      ref={windowRef}
      data-window-id={id}
      className={`window ${isActive ? 'active' : ''} ${isShaded ? 'shaded' : ''}`}
      style={{
        left: actualX,
        top: actualY,
        width: actualWidth,
        height: isShaded ? 'auto' : actualHeight,
        zIndex,
        ...(isMinimized ? {
          visibility: 'hidden' as const,
          position: 'fixed' as const,
          left: -9999,
          top: -9999,
          pointerEvents: 'none' as const,
        } : {}),
      }}
      onClick={handleContentClick}
    >
      <div
        className="window-title"
        onMouseDown={handleTitleMouseDown}
        onDoubleClick={handleTitleDoubleClick}
      >
        <div className="window-controls">
          <div className="window-button window-minimize" onClick={handleMinimize}>
            —
          </div>
          <div className="window-button window-zoom" onClick={handleZoom}>
            □
          </div>
          {closable && (
            <div className="window-button window-close" onClick={handleClose}>
              ✕
            </div>
          )}
        </div>
        <div className="window-title-text">{title}</div>
      </div>
      
      {!isShaded && (
        <>
          <ImperativeContent>{children}</ImperativeContent>
          {/* 8-edge resize zones */}
          {resizable && !isMaximized && (
            <>
              {/* Edges */}
              <div style={{ position: 'absolute', top: 0, left: EDGE_SIZE, right: EDGE_SIZE, height: EDGE_SIZE, cursor: EDGE_CURSORS.n }}
                onMouseDown={handleEdgeMouseDown('n')} />
              <div style={{ position: 'absolute', bottom: 0, left: EDGE_SIZE, right: EDGE_SIZE, height: EDGE_SIZE, cursor: EDGE_CURSORS.s }}
                onMouseDown={handleEdgeMouseDown('s')} />
              <div style={{ position: 'absolute', top: EDGE_SIZE, bottom: EDGE_SIZE, left: 0, width: EDGE_SIZE, cursor: EDGE_CURSORS.w }}
                onMouseDown={handleEdgeMouseDown('w')} />
              <div style={{ position: 'absolute', top: EDGE_SIZE, bottom: EDGE_SIZE, right: 0, width: EDGE_SIZE, cursor: EDGE_CURSORS.e }}
                onMouseDown={handleEdgeMouseDown('e')} />
              {/* Corners */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: EDGE_SIZE, height: EDGE_SIZE, cursor: EDGE_CURSORS.nw }}
                onMouseDown={handleEdgeMouseDown('nw')} />
              <div style={{ position: 'absolute', top: 0, right: 0, width: EDGE_SIZE, height: EDGE_SIZE, cursor: EDGE_CURSORS.ne }}
                onMouseDown={handleEdgeMouseDown('ne')} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: EDGE_SIZE, height: EDGE_SIZE, cursor: EDGE_CURSORS.sw }}
                onMouseDown={handleEdgeMouseDown('sw')} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: EDGE_SIZE, height: EDGE_SIZE, cursor: EDGE_CURSORS.se }}
                onMouseDown={handleEdgeMouseDown('se')} />
            </>
          )}
        </>
      )}
    </div>
  );
}
