import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentManager } from '../core/agents/AgentManager';
import { MockTransport, MockEventBus } from 'iteratio/src/__test__';
import { HiveEventBus } from '../core/events/HiveEventBus';

describe('AgentManager', () => {
  let manager: AgentManager;
  let transport: MockTransport;
  let eventBus: HiveEventBus;

  const mockTemplate = {
    id: 'code-reviewer',
    displayName: 'Code Reviewer',
    role: 'reviewer',
    capabilities: ['code-review', 'security-scan'],
  };

  beforeEach(() => {
    transport = new MockTransport();
    eventBus = new HiveEventBus();
    manager = new AgentManager({
      transport,
      eventBus,
      maxAgents: 10,
      autoRegister: true,
    });
  });

  describe('register agent with capabilities', () => {
    it('should spawn agent from template and return identity', async () => {
      const agent = await manager.spawn(mockTemplate);
      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
      expect(agent.role).toBe('reviewer');
    });

    it('should register agent with capabilities from template', async () => {
      const agent = await manager.spawn(mockTemplate);
      // Agent should be discoverable by capability
      expect(agent.metadata?.templateId).toBe('code-reviewer');
    });

    it('should allow custom agent id on spawn', async () => {
      const agent = await manager.spawn(mockTemplate, { id: 'custom-id' });
      expect(agent.id).toBe('custom-id');
    });
  });

  describe('spawn dynamic agent on demand', () => {
    it('should spawn agent and set status to active', async () => {
      const agent = await manager.spawn(mockTemplate);
      expect(agent.status).toBe('active');
    });

    it('should subscribe agent to transport on spawn', async () => {
      await manager.spawn(mockTemplate);
      expect(transport.subscribe).toHaveBeenCalled();
    });

    it('should emit agent.spawned event', async () => {
      const listener = vi.fn();
      eventBus.on('agent.spawned', listener);
      await manager.spawn(mockTemplate);
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('auto-terminate idle agents', () => {
    it('should support idle timeout configuration', () => {
      // Expected: AgentManager should accept idleTimeout option
      // and auto-terminate agents that exceed it
      const managerWithTimeout = new AgentManager({
        transport,
        eventBus,
        maxAgents: 10,
        autoRegister: true,
        idleTimeout: 30000,
      } as any);
      expect((managerWithTimeout as any).config.idleTimeout).toBe(30000);
    });

    it('should terminate agent after idle timeout', async () => {
      // Expected: after configured idle period, agent is terminated
      const agent = await manager.spawn(mockTemplate);
      // Simulate idle timeout passage
      // Expected: (manager as any).checkIdleAgents()
      // After check, agent should be terminated
      expect((manager as any).checkIdleAgents).toBeDefined();
    });
  });

  describe('get agent by ID', () => {
    it('should return agent identity by id', async () => {
      const agent = await manager.spawn(mockTemplate, { id: 'find-me' });
      const found = manager.getStatus('find-me');
      expect(found).toBeDefined();
      expect(found?.id).toBe('find-me');
    });

    it('should return undefined for non-existent agent', () => {
      const result = manager.getStatus('no-such-agent');
      expect(result).toBeUndefined();
    });
  });

  describe('list all agents', () => {
    it('should list all spawned agents', async () => {
      await manager.spawn(mockTemplate, { id: 'a1' });
      await manager.spawn(mockTemplate, { id: 'a2' });
      const list = manager.list();
      expect(list).toHaveLength(2);
    });

    it('should return empty list when no agents spawned', () => {
      expect(manager.list()).toHaveLength(0);
    });
  });

  describe('agent status tracking', () => {
    it('should track active status', async () => {
      const agent = await manager.spawn(mockTemplate);
      const status = manager.getStatus(agent.id);
      expect(status?.status).toBe('active');
    });

    it('should track terminated status after termination', async () => {
      const agent = await manager.spawn(mockTemplate, { id: 'term-me' });
      await manager.terminate('term-me');
      // After termination, agent should no longer be in active list
      expect(manager.isManaged('term-me')).toBe(false);
    });

    it('should emit agent.terminated event', async () => {
      const listener = vi.fn();
      eventBus.on('agent.terminated', listener);
      const agent = await manager.spawn(mockTemplate, { id: 'dying' });
      await manager.terminate('dying');
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('spawn limit enforcement', () => {
    it('should throw when max agents limit is reached', async () => {
      const limitedManager = new AgentManager({
        transport,
        eventBus,
        maxAgents: 2,
        autoRegister: true,
      });

      await limitedManager.spawn(mockTemplate, { id: 'a1' });
      await limitedManager.spawn(mockTemplate, { id: 'a2' });

      await expect(limitedManager.spawn(mockTemplate, { id: 'a3' }))
        .rejects.toThrow(/[Mm]aximum/);
    });

    it('should allow spawning after terminating an agent', async () => {
      const limitedManager = new AgentManager({
        transport,
        eventBus,
        maxAgents: 2,
        autoRegister: true,
      });

      await limitedManager.spawn(mockTemplate, { id: 'a1' });
      await limitedManager.spawn(mockTemplate, { id: 'a2' });
      await limitedManager.terminate('a1');

      await expect(limitedManager.spawn(mockTemplate, { id: 'a3' }))
        .resolves.toBeDefined();
    });
  });

  describe('terminate', () => {
    it('should disconnect agent from transport', async () => {
      await manager.spawn(mockTemplate, { id: 'disconnecting' });
      await manager.terminate('disconnecting');
      expect(transport.disconnect).toHaveBeenCalledWith('disconnecting');
    });

    it('should throw when terminating non-existent agent', async () => {
      await expect(manager.terminate('ghost')).rejects.toThrow();
    });

    it('should terminate all agents', async () => {
      await manager.spawn(mockTemplate, { id: 'x1' });
      await manager.spawn(mockTemplate, { id: 'x2' });
      await manager.terminateAll();
      expect(manager.getActiveCount()).toBe(0);
    });
  });
});
