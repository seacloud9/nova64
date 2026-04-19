// Workspace indicator squares — shows which of 4 desktops is active
import { useWorkspaceStore, WORKSPACE_COUNT } from '../os/workspaceStore';

export function WorkspaceSwitcher() {
  const { activeWorkspace, switchWorkspace } = useWorkspaceStore();

  return (
    <div className="workspace-switcher">
      {Array.from({ length: WORKSPACE_COUNT }, (_, i) => (
        <button
          key={i}
          className={`workspace-indicator ${i === activeWorkspace ? 'workspace-indicator--active' : ''}`}
          onClick={() => switchWorkspace(i)}
          title={`Desktop ${i + 1}`}
        />
      ))}
    </div>
  );
}
