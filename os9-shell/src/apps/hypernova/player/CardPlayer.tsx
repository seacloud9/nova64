// hyperNova – CardPlayer
// Renders a card stack in play mode with full interactivity
import { useState, useCallback, useEffect } from 'react';
import { useHyperNovaStore } from '../shared/store';
import type { CardObject, Stack } from '../shared/schema';
import { renderObjectStyle, renderCardBackground, CARD_W, CARD_H } from '../editor/EditorCanvas';
import { runScript, type ScriptAPI } from './ScriptRunner';

// ---------------------------------------------------------------------------
// CardPlayer
// ---------------------------------------------------------------------------

export function CardPlayer() {
  const store = useHyperNovaStore();
  const stack: Stack = store.project.stacks[store.selectedStackIndex];
  const [currentCardId, setCurrentCardId] = useState(
    () => stack?.cards[0]?.id ?? ''
  );
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  // Reset to first card when switching to play mode
  useEffect(() => {
    setCurrentCardId(stack?.cards[0]?.id ?? '');
    setFieldValues({});
  }, [store.mode, stack]);

  const currentCard = stack?.cards.find((c) => c.id === currentCardId);

  // ---- Build the script execution API ------------------------------------
  const buildAPI = useCallback(
    (cardId: string): ScriptAPI => {
      const cards = stack?.cards ?? [];
      const idx = cards.findIndex((c) => c.id === cardId);
      return {
        currentCardId: cardId,
        goToCard: (id: string) => setCurrentCardId(id),
        goNext: () => {
          if (idx < cards.length - 1) setCurrentCardId(cards[idx + 1].id);
        },
        goPrev: () => {
          if (idx > 0) setCurrentCardId(cards[idx - 1].id);
        },
        goFirst: () => {
          if (cards.length > 0) setCurrentCardId(cards[0].id);
        },
        goLast: () => {
          if (cards.length > 0) setCurrentCardId(cards[cards.length - 1].id);
        },
        setField: (id: string, value: string) =>
          setFieldValues((prev) => ({ ...prev, [id]: value })),
        getField: (id: string) => fieldValues[id] ?? '',
        alert: (msg: string) => window.alert(msg),
        log: (...args: unknown[]) => console.log('[hyperNova]', ...args),
      };
    },
    [stack, fieldValues]
  );

  const handleButtonClick = useCallback(
    (obj: CardObject) => {
      if (obj.type !== 'button') return;
      const api = buildAPI(currentCardId);
      runScript(obj.script, api);
    },
    [buildAPI, currentCardId]
  );

  if (!currentCard) {
    return (
      <div style={{ color: '#ff6666', padding: 40, textAlign: 'center' }}>
        No card to display. Switch to Edit mode and add some cards!
      </div>
    );
  }

  const bgStyle = renderCardBackground(currentCard.background);

  // ---- Navigation breadcrumb ---------------------------------------------
  const cardIndex = stack.cards.findIndex((c) => c.id === currentCardId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* Nav breadcrumb */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          color: '#7070a0',
        }}
      >
        <span
          style={{ cursor: 'pointer', color: cardIndex > 0 ? '#8888ff' : '#333366' }}
          onClick={() => {
            if (cardIndex > 0) setCurrentCardId(stack.cards[cardIndex - 1].id);
          }}
        >
          ◀
        </span>
        <span>
          {currentCard.title} ({cardIndex + 1} / {stack.cards.length})
        </span>
        <span
          style={{
            cursor: 'pointer',
            color: cardIndex < stack.cards.length - 1 ? '#8888ff' : '#333366',
          }}
          onClick={() => {
            if (cardIndex < stack.cards.length - 1)
              setCurrentCardId(stack.cards[cardIndex + 1].id);
          }}
        >
          ▶
        </span>
      </div>

      {/* Card */}
      <div
        style={{
          position: 'relative',
          width: CARD_W,
          height: CARD_H,
          ...bgStyle,
          flexShrink: 0,
          overflow: 'hidden',
          boxShadow: '0 4px 32px rgba(0,0,0,0.6)',
        }}
      >
        {currentCard.objects.map((obj) => {
          const style = renderObjectStyle(obj, false);

          if (obj.type === 'field') {
            const val = fieldValues[obj.id] ?? obj.value ?? '';
            return (
              <input
                key={obj.id}
                style={{
                  ...style,
                  pointerEvents: 'all',
                  cursor: 'text',
                }}
                value={val}
                placeholder={obj.placeholder}
                onChange={(e) =>
                  setFieldValues((prev) => ({ ...prev, [obj.id]: e.target.value }))
                }
              />
            );
          }

          if (obj.type === 'button') {
            return (
              <div
                key={obj.id}
                style={{
                  ...style,
                  cursor: 'pointer',
                  transition: 'opacity 0.1s, transform 0.1s',
                }}
                onClick={() => handleButtonClick(obj)}
                onMouseDown={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = '0.8';
                  (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)';
                }}
                onMouseUp={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = '1';
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                }}
              >
                {obj.label}
              </div>
            );
          }

          if (obj.type === 'text') {
            return (
              <div key={obj.id} style={style}>
                {obj.text}
              </div>
            );
          }

          if (obj.type === 'image') {
            if (!obj.asset) return null;
            return (
              <img
                key={obj.id}
                src={obj.asset}
                alt=""
                style={{
                  position: 'absolute',
                  left: obj.x,
                  top: obj.y,
                  width: obj.width,
                  height: obj.height,
                  objectFit: 'contain',
                }}
              />
            );
          }

          // rect
          return <div key={obj.id} style={style} />;
        })}
      </div>
    </div>
  );
}
