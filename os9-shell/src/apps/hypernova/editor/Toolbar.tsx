// hyperNova – Toolbar (tool palette)
import { useHyperNovaStore } from '../shared/store';
import type { ToolType } from '../shared/schema';

interface Tool {
  id: ToolType;
  label: string;
  icon: string;
  hint: string;
}

const TOOLS: Tool[] = [
  { id: 'select', label: 'Select', icon: '↖', hint: 'Select & drag objects' },
  { id: 'button', label: 'Button', icon: '⬜', hint: 'Click canvas to add a button' },
  { id: 'text', label: 'Text', icon: 'T', hint: 'Click canvas to add a text label' },
  { id: 'field', label: 'Field', icon: '≡', hint: 'Click canvas to add a text input field' },
  { id: 'rect', label: 'Rect', icon: '▭', hint: 'Click canvas to add a rectangle' },
];

const S = {
  bar: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 4,
    padding: '4px 8px',
  },
  btn: (active: boolean) => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: '4px 10px',
    minWidth: 52,
    cursor: 'pointer',
    background: active ? '#3a3aaa' : '#1e1e38',
    color: active ? '#ffffff' : '#8888cc',
    border: `1px solid ${active ? '#6666ff' : '#2a2a4a'}`,
    borderRadius: 6,
    fontSize: 11,
    gap: 2,
    userSelect: 'none' as const,
    transition: 'all 0.1s',
  }),
  icon: {
    fontSize: 16,
    lineHeight: 1,
  },
  label: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 28,
    background: '#2a2a4a',
    margin: '0 4px',
  },
};

export function Toolbar() {
  const { activeTool, setActiveTool, mode } = useHyperNovaStore();
  if (mode === 'play') return null;

  return (
    <div style={S.bar}>
      <span style={{ color: '#5555aa', fontSize: 10, marginRight: 4 }}>TOOL</span>
      {TOOLS.map((t) => (
        <div
          key={t.id}
          style={S.btn(activeTool === t.id)}
          title={t.hint}
          onClick={() => setActiveTool(t.id)}
        >
          <span style={S.icon}>{t.icon}</span>
          <span style={S.label}>{t.label}</span>
        </div>
      ))}
      <div style={S.divider} />
    </div>
  );
}
