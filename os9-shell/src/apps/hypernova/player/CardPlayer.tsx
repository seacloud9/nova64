// hyperNova – CardPlayer
// Renders a card stack in play mode with full interactivity
import { useState, useCallback, useEffect, useRef } from 'react';
import { useHyperNovaStore } from '../shared/store';
import type { CardObject, Stack, SymbolInstanceObject, HNSymbol, Keyframe } from '../shared/schema';
import { renderObjectStyle, renderCardBackground, CARD_W, CARD_H } from '../editor/EditorCanvas';
import { runScript, buildTweenAPI, type ScriptAPI } from './ScriptRunner';
import { MessageDispatcher, isNovaTalkScript, buildNovaTalkAPI } from './novatalk';
import { killAllTweens, createClipTimeline, playClip, tweenFromTo } from './TweenEngine';

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
  const prevCardIdRef = useRef<string>('');
  const dispatcherRef = useRef<MessageDispatcher | null>(null);

  // Reset to first card when switching to play mode
  useEffect(() => {
    setCurrentCardId(stack?.cards[0]?.id ?? '');
    setFieldValues({});
    dispatcherRef.current = null;
    killAllTweens();
  }, [store.mode, stack]);

  const currentCard = stack?.cards.find((c) => c.id === currentCardId);

  // ---- Build the script execution API (legacy JS) ------------------------
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
        ...buildTweenAPI(),
      };
    },
    [stack, fieldValues]
  );

  // ---- NovaTalk message dispatch -----------------------------------------
  const sendNovaTalkMessage = useCallback(
    (message: string, targetObj: CardObject | null) => {
      if (!currentCard || !stack) return;
      const api = buildNovaTalkAPI(
        currentCardId,
        stack.cards,
        (id: string) => setCurrentCardId(id),
        fieldValues,
        (id: string, value: string) =>
          setFieldValues((prev) => ({ ...prev, [id]: value })),
        targetObj?.id ?? null,
      );
      if (!dispatcherRef.current) {
        dispatcherRef.current = new MessageDispatcher(api);
      } else {
        dispatcherRef.current.updateAPI(api);
      }
      dispatcherRef.current.sendMessage(message, targetObj, currentCard, stack);
    },
    [currentCard, stack, currentCardId, fieldValues]
  );

  // ---- Fire openCard / closeCard events ----------------------------------
  useEffect(() => {
    if (currentCardId && currentCardId !== prevCardIdRef.current) {
      // closeCard on previous
      if (prevCardIdRef.current && stack) {
        const prevCard = stack.cards.find((c) => c.id === prevCardIdRef.current);
        if (prevCard?.script && isNovaTalkScript(prevCard.script)) {
          const api = buildNovaTalkAPI(
            prevCardIdRef.current, stack.cards,
            (id) => setCurrentCardId(id), fieldValues,
            (id, value) => setFieldValues((prev) => ({ ...prev, [id]: value })),
            null,
          );
          if (!dispatcherRef.current) {
            dispatcherRef.current = new MessageDispatcher(api);
          } else {
            dispatcherRef.current.updateAPI(api);
          }
          dispatcherRef.current.sendMessage('closeCard', null, prevCard, stack);
        }
      }
      // openCard on new card
      if (currentCard?.script && isNovaTalkScript(currentCard.script)) {
        sendNovaTalkMessage('openCard', null);
      }
      // Clear interpreter cache on card change
      dispatcherRef.current?.clearCache();
      killAllTweens();
      prevCardIdRef.current = currentCardId;
    }
  }, [currentCardId]);

  // ---- Handle object clicks (NovaTalk + JS fallback) ---------------------
  const handleObjectClick = useCallback(
    (obj: CardObject) => {
      const script = (obj as { script?: string }).script;
      if (!script) return;

      if (isNovaTalkScript(script)) {
        sendNovaTalkMessage('mouseUp', obj);
      } else {
        // Legacy JS execution
        const api = buildAPI(currentCardId);
        runScript(script, api);
      }
    },
    [sendNovaTalkMessage, buildAPI, currentCardId]
  );

  if (!currentCard) {
    return (
      <div style={{ color: '#ff6666', padding: 40, textAlign: 'center' }}>
        No card to display. Switch to Edit mode and add some cards!
      </div>
    );
  }

  const bgStyle = renderCardBackground(currentCard.background);
  const library = store.project.library;

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
        {currentCard.objects.map((obj) =>
          renderObject(obj, fieldValues, setFieldValues, handleObjectClick, sendNovaTalkMessage, library)
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MovieClip renderer — plays through keyframes on a GSAP timeline
// ---------------------------------------------------------------------------

function MovieClipPlayer({
  instance,
  symbol,
  library,
  onClick,
}: {
  instance: SymbolInstanceObject;
  symbol: HNSymbol;
  library: HNSymbol[];
  onClick?: () => void;
}) {
  const [currentFrame, setCurrentFrame] = useState(1);
  const prevKeyframeRef = useRef<Keyframe | undefined>(undefined);

  useEffect(() => {
    if (symbol.type !== 'movie-clip' || symbol.frames.length <= 1) return;

    const frameDuration = 1 / symbol.fps;
    const clip = createClipTimeline(
      instance.id,
      frameDuration,
      symbol.frames.length,
      symbol.loop,
      (frame) => setCurrentFrame(frame),
    );
    playClip(instance.id);

    return () => {
      clip.timeline.kill();
    };
  }, [instance.id, symbol]);

  // Find the active keyframe: last keyframe whose .frame <= currentFrame
  const activeKeyframe: Keyframe | undefined = [...symbol.frames]
    .reverse()
    .find((kf) => kf.frame <= currentFrame) ?? symbol.frames[0];

  // Fire GSAP fromTo tweens when the active keyframe changes
  useEffect(() => {
    const prev = prevKeyframeRef.current;
    prevKeyframeRef.current = activeKeyframe;

    if (!prev || !prev.tweens || !activeKeyframe) return;

    for (const [objId, tweenProps] of Object.entries(prev.tweens)) {
      const fromObj = prev.objects.find((o) => o.id === objId);
      const toObj = activeKeyframe.objects.find((o) => o.id === objId);
      if (!fromObj || !toObj) continue;

      tweenFromTo(
        objId,
        { x: fromObj.x, y: fromObj.y, width: fromObj.width, height: fromObj.height },
        { x: toObj.x, y: toObj.y, width: toObj.width, height: toObj.height },
        { duration: tweenProps.duration, ease: tweenProps.ease },
      );
    }
  }, [activeKeyframe]);

  if (!activeKeyframe) return null;

  return (
    <div
      data-hn-obj={instance.id}
      style={{
        position: 'absolute',
        left: instance.x,
        top: instance.y,
        width: instance.width,
        height: instance.height,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      {/* Scale symbol content to fit instance bounds */}
      <div
        style={{
          position: 'relative',
          width: symbol.width,
          height: symbol.height,
          transform: `scale(${instance.width / symbol.width}, ${instance.height / symbol.height})`,
          transformOrigin: 'top left',
        }}
      >
        {activeKeyframe.objects.map((childObj) =>
          renderObject(childObj, {}, undefined, undefined, undefined, library)
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Render a single CardObject (shared between card and MovieClip frames)
// ---------------------------------------------------------------------------

function renderObject(
  obj: CardObject,
  fieldValues: Record<string, string>,
  setFieldValues?: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  handleObjectClick?: (obj: CardObject) => void,
  sendNovaTalkMessage?: (message: string, targetObj: CardObject | null) => void,
  library?: HNSymbol[],
) {
  // Symbol instance → delegate to MovieClipPlayer
  if (obj.type === 'symbol-instance') {
    const symbol = library?.find((s) => s.id === obj.symbolId);
    if (!symbol) return null;
    const hasScript = !!obj.script;
    return (
      <MovieClipPlayer
        key={obj.id}
        instance={obj}
        symbol={symbol}
        library={library ?? []}
        onClick={hasScript && handleObjectClick ? () => handleObjectClick(obj) : undefined}
      />
    );
  }

  const style = renderObjectStyle(obj, false);

  if (obj.type === 'field') {
    const val = fieldValues[obj.id] ?? obj.value ?? '';
    return (
      <input
        key={obj.id}
        data-hn-obj={obj.id}
        style={{
          ...style,
          pointerEvents: 'all',
          cursor: 'text',
        }}
        value={val}
        placeholder={obj.placeholder}
        onChange={setFieldValues ? (e) =>
          setFieldValues((prev) => ({ ...prev, [obj.id]: e.target.value }))
        : undefined}
      />
    );
  }

  if (obj.type === 'button') {
    return (
      <div
        key={obj.id}
        data-hn-obj={obj.id}
        style={{
          ...style,
          cursor: 'pointer',
          transition: 'opacity 0.1s, transform 0.1s',
        }}
        onClick={handleObjectClick ? () => handleObjectClick(obj) : undefined}
        onMouseDown={sendNovaTalkMessage ? (e) => {
          (e.currentTarget as HTMLElement).style.opacity = '0.8';
          (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)';
          if (isNovaTalkScript(obj.script || '')) {
            sendNovaTalkMessage('mouseDown', obj);
          }
        } : undefined}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLElement).style.opacity = '1';
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
        }}
        onMouseEnter={sendNovaTalkMessage ? () => {
          if (isNovaTalkScript(obj.script || '')) {
            sendNovaTalkMessage('mouseEnter', obj);
          }
        } : undefined}
        onMouseLeave={sendNovaTalkMessage ? () => {
          if (isNovaTalkScript(obj.script || '')) {
            sendNovaTalkMessage('mouseLeave', obj);
          }
        } : undefined}
      >
        {obj.label}
      </div>
    );
  }

  if (obj.type === 'text') {
    const hasScript = !!(obj as { script?: string }).script;
    return (
      <div
        key={obj.id}
        data-hn-obj={obj.id}
        style={{ ...style, cursor: hasScript ? 'pointer' : 'default' }}
        onClick={hasScript && handleObjectClick ? () => handleObjectClick(obj) : undefined}
      >
        {obj.text}
      </div>
    );
  }

  if (obj.type === 'image') {
    if (!obj.asset) return null;
    const hasScript = !!(obj as { script?: string }).script;
    return (
      <img
        key={obj.id}
        data-hn-obj={obj.id}
        src={obj.asset}
        alt=""
        style={{
          position: 'absolute',
          left: obj.x,
          top: obj.y,
          width: obj.width,
          height: obj.height,
          objectFit: 'contain',
          cursor: hasScript ? 'pointer' : 'default',
        }}
        onClick={hasScript && handleObjectClick ? () => handleObjectClick(obj) : undefined}
      />
    );
  }

  // rect
  {
    const hasScript = !!(obj as { script?: string }).script;
    return (
      <div
        key={obj.id}
        data-hn-obj={obj.id}
        style={{ ...style, cursor: hasScript ? 'pointer' : 'default' }}
        onClick={hasScript && handleObjectClick ? () => handleObjectClick(obj) : undefined}
      />
    );
  }
}
