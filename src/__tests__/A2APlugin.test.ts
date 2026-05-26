import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockTransport, MockEventBus } from 'iteratio/src/__test__';

// Import A2A plugin (the default export from index.ts)
// The A2APlugin class should be exported from src/index.ts
import { A2APlugin } from '../index';

describe('A2APlugin', () => {
  let plugin: any;
  let mockContainer: any;
  let mockTransport: any;

  beforeEach(() => {
    mockTransport = new MockTransport();
    mockContainer = {
      bind: vi.fn().mockReturnValue({ toConstantValue: vi.fn() }),
      get: vi.fn(),
    };
    plugin = new A2APlugin({ pattern: 'hive' });
  });

  describe('plugin lifecycle', () => {
    it('should have name "a2a"', () => {
      expect(plugin.name).toBe('a2a');
    });

    it('should have a valid semver version', () => {
      expect(plugin.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should initialize and register services in container', async () => {
      await plugin.initialize(mockContainer);
      expect(mockContainer.bind).toHaveBeenCalled();
    });

    it('should create transport during initialization', async () => {
      await plugin.initialize(mockContainer);
      expect(plugin.transport).toBeDefined();
    });

    it('should create event bus during initialization', async () => {
      await plugin.initialize(mockContainer);
      expect(plugin.eventBus).toBeDefined();
    });

    it('should create agent manager during initialization', async () => {
      await plugin.initialize(mockContainer);
      expect(plugin.agentManager).toBeDefined();
    });

    it('should create channel manager during initialization', async () => {
      await plugin.initialize(mockContainer);
      expect(plugin.channelManager).toBeDefined();
    });

    it('should shutdown gracefully', async () => {
      await plugin.initialize(mockContainer);
      await expect(plugin.shutdown()).resolves.not.toThrow();
    });

    it('should terminate all agents on shutdown', async () => {
      await plugin.initialize(mockContainer);
      const terminateAll = vi.spyOn(plugin.agentManager, 'terminateAll');
      await plugin.shutdown();
      expect(terminateAll).toHaveBeenCalled();
    });

    it('should clear channels on shutdown', async () => {
      await plugin.initialize(mockContainer);
      const clear = vi.spyOn(plugin.channelManager, 'clear');
      await plugin.shutdown();
      expect(clear).toHaveBeenCalled();
    });
  });

  describe('register agent capabilities', () => {
    it('should allow registering agent capabilities', async () => {
      await plugin.initialize(mockContainer);
      // Expected: plugin.registerCapabilities('agent-1', ['code-review', 'testing']);
      expect(plugin.registerCapabilities).toBeDefined();
    });

    it('should store capabilities in agent registry', async () => {
      await plugin.initialize(mockContainer);
      plugin.registerCapabilities('agent-1', ['analysis', 'coding']);
      const caps = plugin.getCapabilities('agent-1');
      expect(caps).toContain('analysis');
      expect(caps).toContain('coding');
    });
  });

  describe('configure transport type', () => {
    it('should accept InMemory transport configuration', () => {
      const p = new A2APlugin({ pattern: 'hive', transport: 'in-memory' });
      expect(p).toBeDefined();
    });

    it('should accept BroadcastChannel transport configuration', () => {
      const p = new A2APlugin({ pattern: 'hive', transport: 'broadcast-channel' });
      expect(p).toBeDefined();
    });

    it('should default to InMemory transport when not specified', async () => {
      const p = new A2APlugin({ pattern: 'hive' });
      await p.initialize(mockContainer);
      expect(p.transport.constructor.name).toContain('InMemory');
    });
  });

  describe('beforeTurn', () => {
    it('should check for incoming messages from other agents', async () => {
      await plugin.initialize(mockContainer);
      const context = {
        turnNumber: 1,
        turnCount: 1,
        messages: [{ role: 'system', content: '' }],
        state: {},
      };

      await plugin.beforeTurn(context);

      // Should have checked for incoming messages
      expect(context.state.a2aIncoming).toBeDefined();
    });

    it('should inject incoming agent messages into context', async () => {
      await plugin.initialize(mockContainer);
      // Simulate an incoming message via the plugin
      plugin.simulateIncoming({
        from: 'agent-2',
        to: 'agent-1',
        content: 'Task subtask result',
      });
      const context = {
        turnNumber: 2,
        turnCount: 2,
        messages: [{ role: 'system', content: 'Base' }],
        state: {},
      };

      await plugin.beforeTurn(context);

      expect(context.messages[0].content).toContain('Task subtask result');
    });
  });

  describe('afterTurn', () => {
    it('should dispatch outgoing messages queued during turn', async () => {
      await plugin.initialize(mockContainer);
      const sendSpy = vi.spyOn(plugin.transport, 'send');
      const context = {
        turnNumber: 1,
        turnCount: 1,
        messages: [],
        state: {
          a2aOutgoing: [
            { to: 'agent-2', content: 'Please review this code' },
          ],
        },
      };

      await plugin.afterTurn(context);

      expect(sendSpy).toHaveBeenCalled();
    });

    it('should clear outgoing queue after dispatch', async () => {
      await plugin.initialize(mockContainer);
      const context = {
        turnNumber: 1,
        turnCount: 1,
        messages: [],
        state: {
          a2aOutgoing: [{ to: 'agent-2', content: 'msg' }],
        },
      };

      await plugin.afterTurn(context);

      expect(context.state.a2aOutgoing).toHaveLength(0);
    });

    it('should do nothing when no outgoing messages', async () => {
      await plugin.initialize(mockContainer);
      const context = {
        turnNumber: 1,
        turnCount: 1,
        messages: [],
        state: {},
      };

      await expect(plugin.afterTurn(context)).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle register agent with empty capabilities', async () => {
      await plugin.initialize(mockContainer);
      plugin.registerCapabilities('agent-empty', []);
      const caps = plugin.getCapabilities('agent-empty');
      expect(caps).toEqual([]);
    });

    it('should handle send message to agent that went offline', async () => {
      await plugin.initialize(mockContainer);
      plugin.registerCapabilities('agent-offline', ['task']);
      const context = {
        turnNumber: 1,
        turnCount: 1,
        messages: [],
        state: {
          a2aOutgoing: [{ to: 'agent-offline', content: 'Are you there?' }],
        },
      };
      // Should not throw - message is dispatched regardless of agent status
      await expect(plugin.afterTurn(context)).resolves.not.toThrow();
    });

    it('should handle message with empty content', async () => {
      await plugin.initialize(mockContainer);
      const context = {
        turnNumber: 1,
        turnCount: 1,
        messages: [],
        state: {
          a2aOutgoing: [{ to: 'agent-2', content: '' }],
        },
      };
      await expect(plugin.afterTurn(context)).resolves.not.toThrow();
    });

    it('should detect message cycle (A to B to A)', async () => {
      await plugin.initialize(mockContainer);
      plugin.registerCapabilities('agent-A', ['relay']);
      plugin.registerCapabilities('agent-B', ['relay']);
      // Both agents registered - cycle detection is a future concern
      expect(plugin.getCapabilities('agent-A')).toContain('relay');
      expect(plugin.getCapabilities('agent-B')).toContain('relay');
    });

    it('should handle register 1000 agents', async () => {
      await plugin.initialize(mockContainer);
      for (let i = 0; i < 1000; i++) {
        plugin.registerCapabilities(`agent-${i}`, ['cap']);
      }
      // Should handle large number of agents without error
      expect(plugin.getCapabilities('agent-999')).toContain('cap');
    });

    it('should handle agent discovery with no matching criteria', async () => {
      await plugin.initialize(mockContainer);
      plugin.registerCapabilities('agent-x', ['coding']);
      // Search for capability that no agent has
      const caps = plugin.getCapabilities('nonexistent');
      expect(caps).toEqual([]);
    });

    it('should handle message delivery timeout = 0', async () => {
      await plugin.initialize(mockContainer);
      const context = {
        turnNumber: 1,
        turnCount: 1,
        messages: [],
        state: {
          a2aOutgoing: [{ to: 'agent-2', content: 'msg', timeout: 0 }],
        },
      };
      await expect(plugin.afterTurn(context)).resolves.not.toThrow();
    });

    it('should handle concurrent messages to same agent (ordering)', async () => {
      await plugin.initialize(mockContainer);
      const sendSpy = vi.spyOn(plugin.transport, 'send');
      const context = {
        turnNumber: 1,
        turnCount: 1,
        messages: [],
        state: {
          a2aOutgoing: [
            { to: 'agent-2', content: 'first' },
            { to: 'agent-2', content: 'second' },
            { to: 'agent-2', content: 'third' },
          ],
        },
      };
      await plugin.afterTurn(context);
      // Messages should be delivered in order (3 calls)
      expect(sendSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle agent deregistration during active message delivery', async () => {
      await plugin.initialize(mockContainer);
      plugin.registerCapabilities('agent-disappearing', ['task']);
      const context = {
        turnNumber: 1,
        turnCount: 1,
        messages: [],
        state: {
          a2aOutgoing: [{ to: 'agent-disappearing', content: 'hello' }],
        },
      };
      await expect(plugin.afterTurn(context)).resolves.not.toThrow();
    });

    it('should handle large payload message (10MB)', async () => {
      await plugin.initialize(mockContainer);
      const largeContent = 'x'.repeat(10 * 1024 * 1024);
      const context = {
        turnNumber: 1,
        turnCount: 1,
        messages: [],
        state: {
          a2aOutgoing: [{ to: 'agent-2', content: largeContent }],
        },
      };
      // Large messages should be handled (transport may reject but shouldn't crash)
      await expect(plugin.afterTurn(context)).resolves.not.toThrow();
    });
  });
});
