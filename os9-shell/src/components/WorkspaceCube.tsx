// Workspace switcher with Z-depth transition effect
// Active workspace is shown full-screen; on switch, the old workspace
// recedes back in Z-space and the new one emerges forward.

import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useWorkspaceStore, WORKSPACE_COUNT } from '../os/workspaceStore';

interface WorkspaceCubeProps {
  renderWorkspace: (workspaceId: number) => ReactNode;
}

export function WorkspaceCube({ renderWorkspace }: WorkspaceCubeProps) {
  const { activeWorkspace, isExpoMode, switchWorkspace } =
    useWorkspaceStore();
  const [displayedWorkspace, setDisplayedWorkspace] = useState(activeWorkspace);
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const prevWorkspaceRef = useRef(activeWorkspace);

  useEffect(() => {
    if (activeWorkspace === prevWorkspaceRef.current) return;
    // Start "out" phase — old workspace recedes
    setPhase('out');
    const outTimer = setTimeout(() => {
      // Swap to new workspace and start "in" phase
      setDisplayedWorkspace(activeWorkspace);
      setPhase('in');
      const inTimer = setTimeout(() => {
        setPhase('idle');
      }, 300);
      return () => clearTimeout(inTimer);
    }, 300);
    prevWorkspaceRef.current = activeWorkspace;
    return () => clearTimeout(outTimer);
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

  let className = 'workspace-viewport';
  if (phase === 'out') className += ' workspace-transition-out';
  if (phase === 'in') className += ' workspace-transition-in';

  return (
    <div className={className}>
      {renderWorkspace(displayedWorkspace)}
    </div>
  );
}
