// Compiz-style workspace transition — 3D rotate only during switch.
// In idle state: flat single workspace (no 3D context, no pointer issues).
// During transition: brief 3D cube rotate between old and new face.

import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useWorkspaceStore, WORKSPACE_COUNT } from '../os/workspaceStore';

interface WorkspaceCubeProps {
  renderWorkspace: (workspaceId: number) => ReactNode;
}

export function WorkspaceCube({ renderWorkspace }: WorkspaceCubeProps) {
  const { activeWorkspace, isExpoMode, switchWorkspace } =
    useWorkspaceStore();

  const [transitioning, setTransitioning] = useState(false);
  const [fromWs, setFromWs] = useState(activeWorkspace);
  const [toWs, setToWs] = useState(activeWorkspace);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const prevRef = useRef(activeWorkspace);

  useEffect(() => {
    if (activeWorkspace === prevRef.current) return;
    const prev = prevRef.current;
    // Determine rotation direction
    const diff = activeWorkspace - prev;
    const dir = diff > 0 || diff < -2 ? 'right' : 'left';
    setFromWs(prev);
    setToWs(activeWorkspace);
    setDirection(dir);
    setTransitioning(true);
    prevRef.current = activeWorkspace;

    const timer = setTimeout(() => {
      setTransitioning(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [activeWorkspace]);

  if (isExpoMode) {
    return (
      <div className="workspace-expo">
        {Array.from({ length: WORKSPACE_COUNT }, (_, i) => (
          <div
            key={i}
            className={`workspace-expo-cell ${i === activeWorkspace ? 'workspace-expo-cell--active' : ''}`}
            onClick={() => switchWorkspace(i)}
          >
            <div className="workspace-expo-label">Desktop {i + 1}</div>
            <div className="workspace-expo-content">
              {renderWorkspace(i)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Idle — flat, no 3D
  if (!transitioning) {
    return (
      <div className="workspace-viewport">
        {renderWorkspace(activeWorkspace)}
      </div>
    );
  }

  // Transitioning — 3D cube rotate between two faces
  const animClass = direction === 'right'
    ? 'workspace-cube--rotate-right'
    : 'workspace-cube--rotate-left';

  return (
    <div className="workspace-cube-viewport">
      <div className={`workspace-cube ${animClass}`}>
        {/* Outgoing face — front */}
        <div className="workspace-cube-face workspace-cube-face--front">
          {renderWorkspace(fromWs)}
        </div>
        {/* Incoming face — positioned to the right or left */}
        <div className={`workspace-cube-face workspace-cube-face--${direction}`}>
          {renderWorkspace(toWs)}
        </div>
      </div>
    </div>
  );
}
