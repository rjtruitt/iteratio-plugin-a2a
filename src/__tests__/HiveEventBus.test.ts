import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HiveEventBus } from '../HiveEventBus';

describe('HiveEventBus', () => {
  let eventBus: HiveEventBus;

  beforeEach(() => {
    eventBus = new HiveEventBus();
  });

  describe('on(event, handler)', () => {
    it('should subscribe to an event', () => {
      const handler = vi.fn();
      (eventBus as any).on('test-event', handler);
      (eventBus as any).emit('test-event', { data: 'hello' });
      // Handler should be called when event is emitted
      expect(handler).toHaveBeenCalledWith({ data: 'hello' });
    });
  });

  describe('once(event, handler)', () => {
    it('should subscribe once and auto-unsubscribe after first emission', () => {
      const handler = vi.fn();
      (eventBus as any).once('one-time', handler);
      (eventBus as any).emit('one-time', { data: 'first' });
      (eventBus as any).emit('one-time', { data: 'second' });
      // Handler should be called only once
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ data: 'first' });
    });
  });

  describe('off(event, handler)', () => {
    it('should unsubscribe a handler', () => {
      const handler = vi.fn();
      (eventBus as any).on('removable', handler);
      (eventBus as any).off('removable', handler);
      (eventBus as any).emit('removable', {});
      // Handler should not be called after unsubscribe
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('removeAllListeners(event?)', () => {
    it('should remove all listeners for a specific event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      (eventBus as any).on('target', handler1);
      (eventBus as any).on('target', handler2);
      (eventBus as any).removeAllListeners('target');
      (eventBus as any).emit('target', {});
      // Neither handler should be called
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should remove all listeners when no event specified', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      (eventBus as any).on('event-a', handler1);
      (eventBus as any).on('event-b', handler2);
      (eventBus as any).removeAllListeners();
      (eventBus as any).emit('event-a', {});
      (eventBus as any).emit('event-b', {});
      // No handlers should be called
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('emit(event, data)', () => {
    it('should emit event with data to all subscribers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      (eventBus as any).on('broadcast', handler1);
      (eventBus as any).on('broadcast', handler2);
      (eventBus as any).emit('broadcast', { payload: 'test' });
      // Both handlers should receive the data
      expect(handler1).toHaveBeenCalledWith({ payload: 'test' });
      expect(handler2).toHaveBeenCalledWith({ payload: 'test' });
    });
  });

  describe('waitFor(event, timeout)', () => {
    it('should wait for an event with timeout', async () => {
      const promise = (eventBus as any).waitFor('delayed-event', 5000);
      setTimeout(() => (eventBus as any).emit('delayed-event', { result: 'done' }), 10);
      const result = await promise;
      // Should resolve with the event data
      expect(result).toEqual({ result: 'done' });
    });

    it('should reject if timeout is exceeded', async () => {
      const promise = (eventBus as any).waitFor('never-event', 50);
      // Should reject with timeout error
      await expect(promise).rejects.toThrow();
    });
  });

  describe('listenerCount(event)', () => {
    it('should count listeners for an event', () => {
      (eventBus as any).on('counted', vi.fn());
      (eventBus as any).on('counted', vi.fn());
      (eventBus as any).on('counted', vi.fn());
      const count = (eventBus as any).listenerCount('counted');
      // Should return 3
      expect(count).toBe(3);
    });
  });

  describe('eventNames()', () => {
    it('should list all subscribed event names', () => {
      (eventBus as any).on('alpha', vi.fn());
      (eventBus as any).on('beta', vi.fn());
      (eventBus as any).on('gamma', vi.fn());
      const names = (eventBus as any).eventNames();
      // Should return ['alpha', 'beta', 'gamma']
      expect(names).toContain('alpha');
      expect(names).toContain('beta');
      expect(names).toContain('gamma');
      expect(names).toHaveLength(3);
    });
  });

  describe('getMetrics()', () => {
    it('should return event bus metrics', () => {
      (eventBus as any).on('metric-event', vi.fn());
      (eventBus as any).emit('metric-event', {});
      const metrics = (eventBus as any).getMetrics();
      // Should return metrics (e.g., total events emitted, listener counts)
      expect(metrics.totalEmitted).toBe(1);
    });
  });

  describe('resetMetrics()', () => {
    it('should reset event bus metrics', () => {
      (eventBus as any).on('metric-event', vi.fn());
      (eventBus as any).emit('metric-event', {});
      (eventBus as any).resetMetrics();
      const metrics = (eventBus as any).getMetrics();
      // All counters should be zero after reset
      expect(metrics.totalEmitted).toBe(0);
    });
  });
});
