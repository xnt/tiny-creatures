import { CreatureInstance, ItemType, SaveData } from './types';

/**
 * Map of all game events to their payload types.
 * Add new events here to get type safety across the codebase.
 */
export interface GameEvents {
  // Encounter events
  'encounter:started': { 
    playerX: number; 
    playerY: number; 
    wildCreature: CreatureInstance;
    isWaterEncounter: boolean;
  };
  
  // Battle events
  'battle:won': { 
    defeatedCreature: CreatureInstance;
    levelsGained: number;
  };
  'battle:lost': { 
    blackout: boolean;
  };
  'battle:caught': { 
    creature: CreatureInstance;
    sentToBox: boolean;
  };
  'battle:fled': {};
  
  // Save events
  'save:changed': { 
    save: SaveData;
  };
  
  // Menu events
  'menu:opened': { 
    menuType: 'main' | 'items' | 'switch';
  };
  'menu:closed': { 
    menuType: 'main' | 'items' | 'switch';
  };
  
  // Item events
  'item:used': { 
    itemType: ItemType;
    success: boolean;
  };
  'item:collected': { 
    itemType: ItemType;
    x: number;
    y: number;
  };
  
  // Player events
  'player:moved': { 
    x: number; 
    y: number;
  };
  'creature:switched': { 
    from: CreatureInstance;
    to: CreatureInstance;
  };
  'creature:fainted': { 
    creature: CreatureInstance;
    isPlayer: boolean;
  };
}

/**
 * Event handler function type.
 */
export type EventHandler<T> = (payload: T) => void;

/**
 * Subscription token returned from subscribe methods.
 * Used to unsubscribe from events.
 */
export interface Subscription {
  eventId: string;
  handlerId: number;
}

/**
 * A small, typed event bus for decoupled module communication.
 * 
 * Features:
 * - Type-safe event payloads
 * - Subscribe (permanent) and subscribeOnce (one-time)
 * - Unsubscribe via token or handler reference
 * - Publish with typed payload
 */
export class EventBus {
  private handlers: Map<string, Map<number, EventHandler<unknown>>> = new Map();
  private nextHandlerId = 0;

  /**
   * Subscribe to an event. Handler will be called every time the event is published.
   * @param eventId - The event to subscribe to
   * @param handler - Function to call when event is published
   * @returns Subscription token for unsubscribing
   */
  on<K extends keyof GameEvents>(
    eventId: K,
    handler: EventHandler<GameEvents[K]>,
  ): Subscription {
    return this.subscribe(eventId, handler, false);
  }

  /**
   * Subscribe to an event once. Handler will be called only the next time the event is published.
   * @param eventId - The event to subscribe to
   * @param handler - Function to call when event is published
   * @returns Subscription token for unsubscribing
   */
  once<K extends keyof GameEvents>(
    eventId: K,
    handler: EventHandler<GameEvents[K]>,
  ): Subscription {
    return this.subscribe(eventId, handler, true);
  }

  /**
   * Unsubscribe from an event using the subscription token.
   * @param subscription - The token returned from on() or once()
   */
  off(subscription: Subscription): void {
    const eventHandlers = this.handlers.get(subscription.eventId);
    if (eventHandlers) {
      eventHandlers.delete(subscription.handlerId);
    }
  }

  /**
   * Unsubscribe a specific handler from an event.
   * @param eventId - The event to unsubscribe from
   * @param handler - The handler function to remove
   */
  offHandler<K extends keyof GameEvents>(
    eventId: K,
    handler: EventHandler<GameEvents[K]>,
  ): void {
    const eventHandlers = this.handlers.get(eventId);
    if (eventHandlers) {
      for (const [id, h] of eventHandlers) {
        if (h === handler) {
          eventHandlers.delete(id);
          break;
        }
      }
    }
  }

  /**
   * Publish an event to all subscribers.
   * @param eventId - The event to publish
   * @param payload - The event payload
   */
  emit<K extends keyof GameEvents>(
    eventId: K,
    payload: GameEvents[K],
  ): void {
    const eventHandlers = this.handlers.get(eventId);
    if (!eventHandlers) return;

    // Copy handlers to avoid issues if a handler modifies the map
    const handlersToCall = [...eventHandlers];
    
    for (const [id, handler] of handlersToCall) {
      handler(payload);
    }
  }

  /**
   * Remove all handlers for all events.
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Get the number of handlers for a specific event.
   */
  listenerCount<K extends keyof GameEvents>(eventId: K): number {
    return this.handlers.get(eventId)?.size ?? 0;
  }

  private subscribe<K extends keyof GameEvents>(
    eventId: K,
    handler: EventHandler<GameEvents[K]>,
    once: boolean,
  ): Subscription {
    if (!this.handlers.has(eventId)) {
      this.handlers.set(eventId, new Map());
    }

    const handlerId = this.nextHandlerId++;
    const eventHandlers = this.handlers.get(eventId)!;

    if (once) {
      // Wrap the handler to auto-unsubscribe after first call
      const wrappedHandler: EventHandler<GameEvents[K]> = (payload) => {
        eventHandlers.delete(handlerId);
        handler(payload);
      };
      eventHandlers.set(handlerId, wrappedHandler as EventHandler<unknown>);
    } else {
      eventHandlers.set(handlerId, handler as EventHandler<unknown>);
    }

    return { eventId, handlerId };
  }
}

/** Global event bus instance */
export const gameEvents = new EventBus();
