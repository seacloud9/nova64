import { useState, useRef, useEffect, ReactNode } from 'react';
import { useWindowStore } from '../os/stores';
import { UISounds } from '../os/sounds';

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
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const { updateWindow, toggleShade, toggleMaximize } = useWindowStore();

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
      } else if (isResizing) {
        const newWidth = Math.max(minWidth, resizeStart.width + (e.clientX - resizeStart.x));
        const newHeight = Math.max(minHeight, resizeStart.height + (e.clientY - resizeStart.y));
        updateWindow(id, { width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, x, y, id, updateWindow, minWidth, minHeight]);

  const handleTitleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !isMaximized) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      onFocus?.();
    }
  };

  const handleTitleDoubleClick = () => {
    UISounds.windowShade();
    toggleShade(id);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !isMaximized) {
      e.stopPropagation();
      setIsResizing(true);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
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
      }}
      onClick={handleContentClick}
    >
      <div
        className="window-title"
        onMouseDown={handleTitleMouseDown}
        onDoubleClick={handleTitleDoubleClick}
      >
        <div className="window-controls">
          {closable && (
            <div className="window-button window-close" onClick={handleClose}>
              ▪
            </div>
          )}
        </div>
        <div className="window-title-text">{title}</div>
        <div className="window-button window-zoom" onClick={handleZoom}>
          ▪
        </div>
      </div>
      
      {!isShaded && (
        <>
          <div className="window-content">{children}</div>
          {resizable && !isMaximized && (
            <div
              className="window-resize-handle"
              onMouseDown={handleResizeMouseDown}
            />
          )}
        </>
      )}
    </div>
  );
}
