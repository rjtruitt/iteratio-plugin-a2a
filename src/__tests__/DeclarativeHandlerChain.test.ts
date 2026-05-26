import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeclarativeHandlerChain } from '../core/handlers/DeclarativeHandlerChain';

describe('DeclarativeHandlerChain', () => {
  let chain: DeclarativeHandlerChain;

  function createHandler(name: string, canHandleResult: boolean = true) {
    return {
      canHandle: vi.fn().mockReturnValue(canHandleResult),
      handle: vi.fn().mockResolvedValue(undefined),
      getName: () => name,
    };
  }

  function createMessage(type: string = 'test', content: any = {}) {
    return { type, content, timestamp: Date.now() };
  }

  beforeEach(() => {
    chain = new DeclarativeHandlerChain();
  });

  describe('chain of handlers executed in order', () => {
    it('should execute first matching handler', async () => {
      const h1 = createHandler('first');
      const h2 = createHandler('second');
      chain.addHandler(h1 as any).addHandler(h2 as any);

      await chain.handle(createMessage() as any);

      expect(h1.handle).toHaveBeenCalled();
    });

    it('should try handlers in registration order', async () => {
      const order: string[] = [];
      const h1 = {
        canHandle: vi.fn().mockReturnValue(false),
        handle: vi.fn().mockImplementation(() => { order.push('h1'); }),
      };
      const h2 = {
        canHandle: vi.fn().mockReturnValue(true),
        handle: vi.fn().mockImplementation(() => { order.push('h2'); }),
      };
      chain.addHandler(h1 as any).addHandler(h2 as any);

      await chain.handle(createMessage() as any);

      expect(h1.canHandle).toHaveBeenCalled();
      expect(h2.handle).toHaveBeenCalled();
      expect(order).toEqual(['h2']);
    });

    it('should pass message to handler', async () => {
      const h = createHandler('receiver');
      chain.addHandler(h as any);
      const msg = createMessage('custom', { data: 'payload' });

      await chain.handle(msg as any);

      expect(h.handle).toHaveBeenCalledWith(msg);
    });
  });

  describe('handler can short-circuit (stop chain)', () => {
    it('should stop after first handler when stopOnFirst is true', async () => {
      chain = new DeclarativeHandlerChain({ stopOnFirst: true });
      const h1 = createHandler('stopper');
      const h2 = createHandler('skipped');
      chain.addHandler(h1 as any).addHandler(h2 as any);

      await chain.handle(createMessage() as any);

      expect(h1.handle).toHaveBeenCalled();
      expect(h2.handle).not.toHaveBeenCalled();
    });
  });

  describe('handler can pass through to next', () => {
    it('should continue to next handler when stopOnFirst is false', async () => {
      chain = new DeclarativeHandlerChain({ stopOnFirst: false });
      const h1 = createHandler('first');
      const h2 = createHandler('second');
      chain.addHandler(h1 as any).addHandler(h2 as any);

      await chain.handle(createMessage() as any);

      expect(h1.handle).toHaveBeenCalled();
      expect(h2.handle).toHaveBeenCalled();
    });

    it('should skip handlers that cannot handle the message', async () => {
      const cantHandle = createHandler('skipper', false);
      const canHandle = createHandler('handler', true);
      chain.addHandler(cantHandle as any).addHandler(canHandle as any);

      await chain.handle(createMessage() as any);

      expect(cantHandle.handle).not.toHaveBeenCalled();
      expect(canHandle.handle).toHaveBeenCalled();
    });
  });

  describe('priority-based ordering', () => {
    it('should support priority-based handler ordering', () => {
      // Expected: handlers with higher priority execute first
      // Currently handlers are ordered by registration order
      // A priority-based system would sort before executing
      const h1 = { ...createHandler('low'), priority: 10 };
      const h2 = { ...createHandler('high'), priority: 100 };
      chain.addHandler(h1 as any).addHandler(h2 as any);

      // Expected: chain sorts by priority before executing
      const handlers = chain.getHandlers();
      expect(handlers).toHaveLength(2);
      // Expected: handlers[0] should be the high-priority one
      // This will FAIL because current implementation doesn't sort by priority
      expect((handlers[0] as any).priority).toBeGreaterThan((handlers[1] as any).priority);
    });
  });

  describe('add/remove handlers dynamically', () => {
    it('should add handler to chain', () => {
      const h = createHandler('added');
      chain.addHandler(h as any);
      expect(chain.getHandlers()).toHaveLength(1);
    });

    it('should add multiple handlers at once', () => {
      const h1 = createHandler('a');
      const h2 = createHandler('b');
      chain.addHandlers(h1 as any, h2 as any);
      expect(chain.getHandlers()).toHaveLength(2);
    });

    it('should remove handler from chain', () => {
      const h = createHandler('removable');
      chain.addHandler(h as any);
      const removed = chain.removeHandler(h as any);
      expect(removed).toBe(true);
      expect(chain.getHandlers()).toHaveLength(0);
    });

    it('should return false when removing non-existent handler', () => {
      const h = createHandler('ghost');
      const removed = chain.removeHandler(h as any);
      expect(removed).toBe(false);
    });

    it('should clear all handlers', () => {
      chain.addHandlers(createHandler('a') as any, createHandler('b') as any);
      chain.clear();
      expect(chain.getHandlers()).toHaveLength(0);
    });
  });

  describe('metrics', () => {
    it('should track total messages processed', async () => {
      const h = createHandler('tracker');
      chain.addHandler(h as any);
      await chain.handle(createMessage() as any);
      await chain.handle(createMessage() as any);

      const metrics = chain.getMetrics();
      expect(metrics.totalMessages).toBe(2);
    });

    it('should track handled vs unhandled messages', async () => {
      const h = createHandler('selective', false);
      chain.addHandler(h as any);
      await chain.handle(createMessage() as any);

      const metrics = chain.getMetrics();
      expect(metrics.messagesUnhandled).toBe(1);
    });

    it('should throw on unhandled when configured', async () => {
      chain = new DeclarativeHandlerChain({ throwOnUnhandled: true });
      await expect(chain.handle(createMessage() as any))
        .rejects.toThrow(/[Nn]o handler/);
    });
  });

  describe('canHandle query', () => {
    it('should return true if any handler can process message', () => {
      chain.addHandler(createHandler('able', true) as any);
      expect(chain.canHandle(createMessage() as any)).toBe(true);
    });

    it('should return false if no handler can process message', () => {
      chain.addHandler(createHandler('unable', false) as any);
      expect(chain.canHandle(createMessage() as any)).toBe(false);
    });
  });
});
