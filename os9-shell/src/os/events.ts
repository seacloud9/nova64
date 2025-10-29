// Event bus for nova64 OS
import type { NovaEvent, EventHandler } from '../types';

class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  on(type: string, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(type);
        }
      }
    };
  }

  emit(evt: NovaEvent): void {
    const handlers = this.handlers.get(evt.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(evt);
        } catch (error) {
          console.error(`Error in event handler for ${evt.type}:`, error);
        }
      });
    }

    // Also notify wildcard handlers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => {
        try {
          handler(evt);
        } catch (error) {
          console.error(`Error in wildcard event handler:`, error);
        }
      });
    }
  }

  once(type: string, handler: EventHandler): void {
    const wrappedHandler: EventHandler = (evt) => {
      handler(evt);
      this.off(type, wrappedHandler);
    };
    this.on(type, wrappedHandler);
  }

  off(type: string, handler: EventHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  clear(type?: string): void {
    if (type) {
      this.handlers.delete(type);
    } else {
      this.handlers.clear();
    }
  }
}

export const eventBus = new EventBus();

// Helper function to create typed events
export function createEvent(type: string, payload?: any): NovaEvent {
  return {
    type,
    payload,
    timestamp: Date.now(),
  };
}
