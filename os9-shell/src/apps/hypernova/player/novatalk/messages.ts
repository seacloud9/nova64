// NovaTalk – Message Passing & Event System
// Implements HyperCard's message hierarchy:
//   Object → Card → Stack → HyperNova (bubbles up if not handled)

import type { Card, CardObject, Stack } from '../../shared/schema';
import type { NovaTalkHostAPI } from './interpreter';
import { Interpreter } from './interpreter';

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export type NovaTalkEvent =
  | 'mouseUp'
  | 'mouseDown'
  | 'mouseEnter'
  | 'mouseLeave'
  | 'openCard'
  | 'closeCard'
  | 'keyDown'
  | 'idle';

// ---------------------------------------------------------------------------
// Message Dispatcher
// ---------------------------------------------------------------------------

export class MessageDispatcher {
  private interpreterCache = new Map<string, Interpreter>();
  private api: NovaTalkHostAPI;

  constructor(api: NovaTalkHostAPI) {
    this.api = api;
  }

  /** Update the API reference (e.g. when card changes) */
  updateAPI(api: NovaTalkHostAPI): void {
    this.api = api;
  }

  /** Clear cached interpreters (e.g. when switching cards) */
  clearCache(): void {
    this.interpreterCache.clear();
  }

  /**
   * Send a message following the HyperCard hierarchy:
   * 1. Target object script
   * 2. Current card script  
   * 3. Stack script
   * Returns true if the message was handled at any level.
   */
  sendMessage(
    message: string,
    targetObject: CardObject | null,
    card: Card,
    stack: Stack,
    args: string[] = [],
  ): boolean {
    // 1. Try the target object's script
    if (targetObject?.script) {
      const handled = this.runHandler(
        targetObject.script,
        `obj:${targetObject.id}`,
        message,
        args,
        targetObject.id,
      );
      if (handled) return true;
    }

    // 2. Try the card script
    const cardScript = (card as Card & { script?: string }).script;
    if (cardScript) {
      const handled = this.runHandler(
        cardScript,
        `card:${card.id}`,
        message,
        args,
        null,
      );
      if (handled) return true;
    }

    // 3. Try the stack script  
    const stackScript = (stack as Stack & { script?: string }).script;
    if (stackScript) {
      const handled = this.runHandler(
        stackScript,
        `stack:${stack.id}`,
        message,
        args,
        null,
      );
      if (handled) return true;
    }

    return false;
  }

  /**
   * Send a message directly to a specific object (for "send X to Y")
   */
  sendDirectMessage(
    message: string,
    targetObjectId: string,
    card: Card,
  ): boolean {
    const obj = card.objects.find((o) => o.id === targetObjectId);
    if (!obj?.script) return false;

    return this.runHandler(
      obj.script,
      `obj:${obj.id}`,
      message,
      [],
      obj.id,
    );
  }

  // ---- Internal ------------------------------------------------------------

  private runHandler(
    script: string,
    cacheKey: string,
    message: string,
    args: string[],
    meObjectId: string | null,
  ): boolean {
    // Get or create interpreter for this script
    let interp = this.interpreterCache.get(cacheKey);
    if (!interp) {
      const api = { ...this.api, meObjectId, targetObjectId: this.api.targetObjectId };
      interp = new Interpreter(api);
      const err = interp.loadScript(script);
      if (err) {
        console.warn(`[NovaTalk] Parse error in ${cacheKey}:`, err);
        return false;
      }
      this.interpreterCache.set(cacheKey, interp);
    }

    try {
      return interp.executeHandler(message, args);
    } catch (e) {
      console.warn(`[NovaTalk] Runtime error in ${cacheKey} handler '${message}':`, e);
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Helper: detect if a script is NovaTalk vs JavaScript
// ---------------------------------------------------------------------------

export function isNovaTalkScript(script: string): boolean {
  if (!script || !script.trim()) return false;
  const trimmed = script.trim();

  // If it starts with "on " or "function ", it's NovaTalk
  if (/^on\s+/i.test(trimmed)) return true;
  if (/^function\s+/i.test(trimmed)) return true;
  // If it starts with a comment "--", it's NovaTalk
  if (trimmed.startsWith('--')) return true;

  // If it contains JS-specific syntax, it's JavaScript
  if (trimmed.includes('=>') || trimmed.includes('const ') || trimmed.includes('let ') ||
      trimmed.includes('var ') || /\bfunction\s*\(/.test(trimmed) || trimmed.includes('{')) {
    return false;
  }

  // Default: assume JavaScript for backward compatibility
  return false;
}

// ---------------------------------------------------------------------------
// Helper: build the NovaTalkHostAPI from CardPlayer state
// ---------------------------------------------------------------------------

export function buildNovaTalkAPI(
  currentCardId: string,
  cards: Card[],
  goToCard: (id: string) => void,
  fieldValues: Record<string, string>,
  setFieldValue: (id: string, value: string) => void,
  targetObjectId: string | null,
): NovaTalkHostAPI {
  const idx = cards.findIndex((c) => c.id === currentCardId);
  const currentCard = cards[idx];

  return {
    currentCardId,
    targetObjectId,
    meObjectId: targetObjectId,

    goToCard,
    goNext: () => {
      if (idx < cards.length - 1) goToCard(cards[idx + 1].id);
    },
    goPrev: () => {
      if (idx > 0) goToCard(cards[idx - 1].id);
    },
    goFirst: () => {
      if (cards.length > 0) goToCard(cards[0].id);
    },
    goLast: () => {
      if (cards.length > 0) goToCard(cards[cards.length - 1].id);
    },

    setField: (id, value) => setFieldValue(id, value),
    getField: (id) => fieldValues[id] ?? '',

    findObject: (type: string, identifier) => {
      if (!currentCard) return null;
      const normalizedType = type === 'btn' ? 'button' : type === 'fld' ? 'field' : type;

      for (let i = 0; i < currentCard.objects.length; i++) {
        const obj = currentCard.objects[i];
        if (obj.type !== normalizedType && normalizedType !== 'card') continue;

        // Match by name (label for buttons, placeholder for fields, text for text)
        if (typeof identifier === 'string') {
          const objName = getObjectName(obj);
          if (objName.toLowerCase() === identifier.toLowerCase()) {
            return { id: obj.id, type: obj.type };
          }
          // Also match by id
          if (obj.id === identifier) {
            return { id: obj.id, type: obj.type };
          }
        }

        // Match by number (1-based index within type)
        if (typeof identifier === 'number') {
          const sameType = currentCard.objects.filter((o) => o.type === obj.type);
          const typeIdx = sameType.indexOf(obj);
          if (typeIdx + 1 === identifier) {
            return { id: obj.id, type: obj.type };
          }
        }
      }
      return null;
    },

    setObjectProperty: (objId, property, value) => {
      // Text / value
      if (property === 'text' || property === 'value') {
        setFieldValue(objId, String(value ?? ''));
      }
      // Other properties would need store integration
    },

    getObjectProperty: (objId, property) => {
      if (property === 'text' || property === 'value') {
        return fieldValues[objId] ?? '';
      }
      // Look up in card objects
      if (currentCard) {
        const obj = currentCard.objects.find((o) => o.id === objId);
        if (obj) {
          if (property === 'name' || property === 'label') return getObjectName(obj);
          if (property === 'type') return obj.type;
          if (property === 'id') return obj.id;
          if (property === 'x' || property === 'left') return obj.x;
          if (property === 'y' || property === 'top') return obj.y;
          if (property === 'width') return obj.width;
          if (property === 'height') return obj.height;
        }
      }
      return null;
    },

    alert: (msg) => window.alert(msg),
    log: (...args) => console.log('[NovaTalk]', ...args),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getObjectName(obj: CardObject): string {
  if (obj.type === 'button') return obj.label;
  if (obj.type === 'field') return obj.placeholder;
  if (obj.type === 'text') return obj.text;
  return obj.id;
}
