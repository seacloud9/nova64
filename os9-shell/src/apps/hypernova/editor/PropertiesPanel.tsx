// hyperNova – PropertiesPanel
// Shows editable properties for the selected card object + the script editor
import { useHyperNovaStore, selectCurrentCard, selectCurrentObject } from '../shared/store';
import type {
  CardObject, TextObject, ButtonObject, FieldObject, RectObject, ImageObject,
} from '../shared/schema';

const S = {
  panel: {
    width: 220,
    minWidth: 220,
    background: '#111120',
    borderLeft: '1px solid #2a2a4a',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  header: {
    padding: '8px 10px 4px',
    fontSize: 11,
    fontWeight: 700,
    color: '#7070a0',
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    borderBottom: '1px solid #1e1e36',
  },
  body: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '8px',
  },
  empty: {
    padding: '12px 8px',
    color: '#4444aa',
    fontSize: 12,
    textAlign: 'center' as const,
    lineHeight: 1.6,
  },
  row: {
    marginBottom: 8,
  },
  label: {
    display: 'block' as const,
    fontSize: 10,
    color: '#7070a0',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box' as const,
    background: '#1a1a32',
    border: '1px solid #2a2a5a',
    borderRadius: 4,
    color: '#c0c0ff',
    fontSize: 12,
    padding: '3px 6px',
    outline: 'none',
  },
  inputNum: {
    width: '100%',
    boxSizing: 'border-box' as const,
    background: '#1a1a32',
    border: '1px solid #2a2a5a',
    borderRadius: 4,
    color: '#c0c0ff',
    fontSize: 12,
    padding: '3px 6px',
    outline: 'none',
  },
  colorRow: {
    display: 'flex' as const,
    gap: 6,
    alignItems: 'center' as const,
  },
  colorBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    border: '1px solid #3a3a6a',
    cursor: 'pointer',
    flexShrink: 0,
  },
  row2: {
    display: 'grid' as const,
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
    marginBottom: 8,
  },
  scriptLabel: {
    display: 'block' as const,
    fontSize: 10,
    color: '#7070a0',
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  scriptArea: {
    width: '100%',
    boxSizing: 'border-box' as const,
    background: '#0d0d20',
    border: '1px solid #2a2a5a',
    borderRadius: 4,
    color: '#80ff80',
    fontSize: 11,
    fontFamily: 'monospace',
    padding: '6px',
    resize: 'vertical' as const,
    minHeight: 80,
    outline: 'none',
  },
  divider: {
    borderTop: '1px solid #1e1e36',
    margin: '10px 0',
  },
  deleteBtn: {
    width: '100%',
    padding: '5px',
    background: '#2a1010',
    color: '#ff6666',
    border: '1px solid #4a2020',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 11,
    textAlign: 'center' as const,
    marginTop: 6,
  },
  cardBgSection: {
    padding: '8px',
  },
};

// ---------------------------------------------------------------------------
// Small controlled input helpers
// ---------------------------------------------------------------------------

function Field({
  label, value, onChange, type = 'text',
}: { label: string; value: string | number; onChange: (v: string) => void; type?: string }) {
  return (
    <div style={S.row}>
      <span style={S.label}>{label}</span>
      <input
        style={S.input}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function NumField({
  label, value, onChange,
}: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={S.row}>
      <span style={S.label}>{label}</span>
      <input
        style={S.inputNum}
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function ColorField({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={S.row}>
      <span style={S.label}>{label}</span>
      <div style={S.colorRow}>
        <input
          type="color"
          value={value}
          style={{ ...S.colorBox, padding: 0 }}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          style={{ ...S.input, flex: 1 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Position/size fields (shared for all objects)
// ---------------------------------------------------------------------------

function GeometryFields({ obj }: { obj: CardObject }) {
  const updateObject = useHyperNovaStore((s) => s.updateObject);
  return (
    <>
      <div style={S.row2}>
        <div>
          <span style={S.label}>X</span>
          <input style={S.inputNum} type="number" value={obj.x}
            onChange={(e) => updateObject(obj.id, { x: Number(e.target.value) })} />
        </div>
        <div>
          <span style={S.label}>Y</span>
          <input style={S.inputNum} type="number" value={obj.y}
            onChange={(e) => updateObject(obj.id, { y: Number(e.target.value) })} />
        </div>
        <div>
          <span style={S.label}>W</span>
          <input style={S.inputNum} type="number" value={obj.width}
            onChange={(e) => updateObject(obj.id, { width: Number(e.target.value) })} />
        </div>
        <div>
          <span style={S.label}>H</span>
          <input style={S.inputNum} type="number" value={obj.height}
            onChange={(e) => updateObject(obj.id, { height: Number(e.target.value) })} />
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Script textarea
// ---------------------------------------------------------------------------

function ScriptField({ obj }: { obj: CardObject }) {
  const updateObject = useHyperNovaStore((s) => s.updateObject);
  const script = (obj as { script?: string }).script ?? '';
  return (
    <>
      <div style={S.divider} />
      <span style={S.scriptLabel}>📜 SCRIPT (onClick / onEvent)</span>
      <textarea
        style={S.scriptArea}
        value={script}
        rows={6}
        spellCheck={false}
        placeholder="// goNext();\n// goToCard('card-id');\n// goFirst();"
        onChange={(e) =>
          updateObject(obj.id, { script: e.target.value } as Partial<CardObject>)
        }
      />
      <div style={{ fontSize: 10, color: '#3a3a7a', marginTop: 4 }}>
        API: goToCard(id) · goNext() · goPrev() · goFirst() · goLast()
        · setField(id,val) · getField(id) · alert(msg) · log(…)
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Per-type property panels
// ---------------------------------------------------------------------------

function TextProps({ obj }: { obj: TextObject }) {
  const updateObject = useHyperNovaStore((s) => s.updateObject);
  return (
    <>
      <div style={S.row}>
        <span style={S.label}>TEXT</span>
        <textarea
          style={{ ...S.scriptArea, color: '#e0e0ff', minHeight: 60 }}
          value={obj.text}
          rows={3}
          onChange={(e) => updateObject(obj.id, { text: e.target.value })}
        />
      </div>
      <NumField label="FONT SIZE" value={obj.fontSize}
        onChange={(v) => updateObject(obj.id, { fontSize: v })} />
      <ColorField label="COLOR" value={obj.color}
        onChange={(v) => updateObject(obj.id, { color: v })} />
      <div style={S.row2}>
        <label style={{ color: '#7070a0', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={obj.bold}
            onChange={(e) => updateObject(obj.id, { bold: e.target.checked })} />
          Bold
        </label>
        <label style={{ color: '#7070a0', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={obj.italic}
            onChange={(e) => updateObject(obj.id, { italic: e.target.checked })} />
          Italic
        </label>
      </div>
    </>
  );
}

function ButtonProps({ obj }: { obj: ButtonObject }) {
  const updateObject = useHyperNovaStore((s) => s.updateObject);
  return (
    <>
      <Field label="LABEL" value={obj.label}
        onChange={(v) => updateObject(obj.id, { label: v })} />
      <ColorField label="BG COLOR" value={obj.bgColor}
        onChange={(v) => updateObject(obj.id, { bgColor: v })} />
      <ColorField label="TEXT COLOR" value={obj.textColor}
        onChange={(v) => updateObject(obj.id, { textColor: v })} />
    </>
  );
}

function FieldProps({ obj }: { obj: FieldObject }) {
  const updateObject = useHyperNovaStore((s) => s.updateObject);
  return (
    <>
      <Field label="PLACEHOLDER" value={obj.placeholder}
        onChange={(v) => updateObject(obj.id, { placeholder: v })} />
      <Field label="DEFAULT VALUE" value={obj.value}
        onChange={(v) => updateObject(obj.id, { value: v })} />
      <NumField label="FONT SIZE" value={obj.fontSize}
        onChange={(v) => updateObject(obj.id, { fontSize: v })} />
    </>
  );
}

function RectProps({ obj }: { obj: RectObject }) {
  const updateObject = useHyperNovaStore((s) => s.updateObject);
  return (
    <>
      <ColorField label="FILL COLOR" value={obj.bgColor}
        onChange={(v) => updateObject(obj.id, { bgColor: v })} />
      <ColorField label="BORDER COLOR" value={obj.borderColor}
        onChange={(v) => updateObject(obj.id, { borderColor: v })} />
      <NumField label="BORDER WIDTH" value={obj.borderWidth}
        onChange={(v) => updateObject(obj.id, { borderWidth: v })} />
      <NumField label="BORDER RADIUS" value={obj.borderRadius}
        onChange={(v) => updateObject(obj.id, { borderRadius: v })} />
    </>
  );
}

function ImageProps({ obj }: { obj: ImageObject }) {
  const updateObject = useHyperNovaStore((s) => s.updateObject);
  return (
    <>
      <Field label="ASSET ID" value={obj.asset}
        onChange={(v) => updateObject(obj.id, { asset: v })} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Card background editor (shown when nothing selected)
// ---------------------------------------------------------------------------

function CardBgEditor() {
  const currentCard = useHyperNovaStore(selectCurrentCard);
  const updateCard = useHyperNovaStore((s) => s.updateCard);
  const selectedCardId = useHyperNovaStore((s) => s.selectedCardId);

  if (!currentCard) return null;

  return (
    <div style={S.cardBgSection}>
      <div style={S.header}>🃏 CARD</div>
      <div style={{ padding: '6px 0' }}>
        <Field
          label="CARD TITLE"
          value={currentCard.title}
          onChange={(v) => updateCard(selectedCardId, { title: v })}
        />
        <ColorField
          label="BACKGROUND"
          value={currentCard.background.color}
          onChange={(color) =>
            updateCard(selectedCardId, {
              background: { ...currentCard.background, color },
            })
          }
        />
      </div>
      <div style={{ color: '#3a3a7a', fontSize: 10 }}>
        Select an object on the canvas to edit its properties.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function PropertiesPanel() {
  const obj = useHyperNovaStore(selectCurrentObject);
  const deleteObject = useHyperNovaStore((s) => s.deleteObject);

  return (
    <div style={S.panel}>
      <div style={S.header}>⚙ PROPERTIES</div>

      {!obj ? (
        <CardBgEditor />
      ) : (
        <div style={S.body}>
          {/* Type badge */}
          <div style={{ marginBottom: 8, color: '#8888ff', fontSize: 11 }}>
            [{obj.type.toUpperCase()} – {obj.id.slice(-6)}]
          </div>

          {/* Geometry */}
          <GeometryFields obj={obj} />

          <div style={S.divider} />

          {/* Type-specific properties */}
          {obj.type === 'text'   && <TextProps   obj={obj} />}
          {obj.type === 'button' && <ButtonProps obj={obj} />}
          {obj.type === 'field'  && <FieldProps  obj={obj} />}
          {obj.type === 'rect'   && <RectProps   obj={obj} />}
          {obj.type === 'image'  && <ImageProps  obj={obj} />}

          {/* Script */}
          <ScriptField obj={obj} />

          {/* Delete */}
          <div
            style={S.deleteBtn}
            onClick={() => {
              if (confirm('Delete this object?')) deleteObject(obj.id);
            }}
          >
            ✕ Delete Object
          </div>
        </div>
      )}
    </div>
  );
}
