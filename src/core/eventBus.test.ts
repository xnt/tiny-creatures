import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, GameEvents } from './eventBus';
import { ItemType } from './types';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('on (permanent subscription)', () => {
    it('should call handler when event is emitted', () => {
      const handler = vi.fn();
      bus.on('battle:won', handler);

      bus.emit('battle:won', {
        defeatedCreature: {} as any,
        levelsGained: 2,
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        defeatedCreature: {} as any,
        levelsGained: 2,
      });
    });

    it('should call handler multiple times for multiple emits', () => {
      const handler = vi.fn();
      bus.on('battle:fled', handler);

      bus.emit('battle:fled', {});
      bus.emit('battle:fled', {});
      bus.emit('battle:fled', {});

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should support multiple handlers for the same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      bus.on('menu:opened', handler1);
      bus.on('menu:opened', handler2);

      bus.emit('menu:opened', { menuType: 'main' });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('once (one-time subscription)', () => {
    it('should call handler only once', () => {
      const handler = vi.fn();
      bus.once('battle:lost', handler);

      bus.emit('battle:lost', { blackout: true });
      bus.emit('battle:lost', { blackout: true });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should receive the correct payload', () => {
      const handler = vi.fn();
      bus.once('item:used', handler);

      bus.emit('item:used', { itemType: ItemType.FishingRod, success: true });

      expect(handler).toHaveBeenCalledWith({
        itemType: ItemType.FishingRod,
        success: true,
      });
    });
  });

  describe('off (unsubscribe via token)', () => {
    it('should remove handler when unsubscribed', () => {
      const handler = vi.fn();
      const subscription = bus.on('save:changed', handler);

      bus.emit('save:changed', { save: {} as any });
      expect(handler).toHaveBeenCalledTimes(1);

      bus.off(subscription);

      bus.emit('save:changed', { save: {} as any });
      expect(handler).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should not affect other handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const sub1 = bus.on('menu:closed', handler1);
      bus.on('menu:closed', handler2);

      bus.off(sub1);

      bus.emit('menu:closed', { menuType: 'main' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('offHandler (unsubscribe via handler reference)', () => {
    it('should remove specific handler', () => {
      const handler = vi.fn();
      bus.on('creature:switched', handler);

      bus.emit('creature:switched', { from: {} as any, to: {} as any });
      expect(handler).toHaveBeenCalledTimes(1);

      bus.offHandler('creature:switched', handler);

      bus.emit('creature:switched', { from: {} as any, to: {} as any });
      expect(handler).toHaveBeenCalledTimes(1); // Not called again
    });
  });

  describe('emit', () => {
    it('should not throw if no handlers registered', () => {
      expect(() => {
        bus.emit('battle:caught', { creature: {} as any, sentToBox: false });
      }).not.toThrow();
    });

    it('should pass payload to all handlers', () => {
      const results: number[] = [];
      bus.on('player:moved', (p) => results.push(p.x));
      bus.on('player:moved', (p) => results.push(p.y));

      bus.emit('player:moved', { x: 100, y: 200 });

      expect(results).toEqual([100, 200]);
    });
  });

  describe('clear', () => {
    it('should remove all handlers', () => {
      const handler = vi.fn();
      bus.on('battle:won', handler);
      bus.on('battle:lost', handler);

      bus.clear();

      bus.emit('battle:won', { defeatedCreature: {} as any, levelsGained: 1 });
      bus.emit('battle:lost', { blackout: true });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('should return 0 for events with no handlers', () => {
      expect(bus.listenerCount('battle:won')).toBe(0);
    });

    it('should return correct count of handlers', () => {
      bus.on('menu:opened', () => {});
      bus.on('menu:opened', () => {});
      bus.once('menu:opened', () => {});

      expect(bus.listenerCount('menu:opened')).toBe(3);
    });

    it('should decrease after once handler fires', () => {
      bus.once('battle:fled', () => {});

      expect(bus.listenerCount('battle:fled')).toBe(1);
      bus.emit('battle:fled', {});
      expect(bus.listenerCount('battle:fled')).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle handlers that emit different events', () => {
      const handler2 = vi.fn();

      // When battle is won, emit player:moved
      bus.on('battle:won', () => {
        bus.emit('player:moved', { x: 100, y: 200 });
      });
      bus.on('player:moved', handler2);

      bus.emit('battle:won', { defeatedCreature: {} as any, levelsGained: 1 });

      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledWith({ x: 100, y: 200 });
    });

    it('should allow handler to unsubscribe itself', () => {
      let callCount = 0;
      let subscription: ReturnType<typeof bus.on>;

      const handler = () => {
        callCount++;
        if (callCount === 1) {
          bus.off(subscription);
        }
      };

      subscription = bus.on('battle:won', handler);

      bus.emit('battle:won', { defeatedCreature: {} as any, levelsGained: 1 });
      bus.emit('battle:won', { defeatedCreature: {} as any, levelsGained: 1 });

      expect(callCount).toBe(1);
    });
  });
});
