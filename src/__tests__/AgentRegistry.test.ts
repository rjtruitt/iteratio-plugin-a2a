import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRegistry } from '../AgentRegistry';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  describe('register(agent)', () => {
    it('should register an agent', () => {
      const agent = { id: 'agent-1', name: 'Agent One', role: 'worker', status: 'idle' };
      (registry as any).register(agent);
      // Agent should be retrievable after registration
      expect((registry as any).get('agent-1')).toBeDefined();
    });
  });

  describe('unregister(agentId)', () => {
    it('should remove an agent', () => {
      const agent = { id: 'agent-1', name: 'Agent One', role: 'worker', status: 'idle' };
      (registry as any).register(agent);
      (registry as any).unregister('agent-1');
      // Agent should no longer exist in registry
      expect((registry as any).has('agent-1')).toBe(false);
    });
  });

  describe('updateStatus(agentId, status)', () => {
    it('should update agent status', () => {
      const agent = { id: 'agent-1', name: 'Agent One', role: 'worker', status: 'idle' };
      (registry as any).register(agent);
      (registry as any).updateStatus('agent-1', 'busy');
      // Agent status should now be 'busy'
      expect((registry as any).get('agent-1').status).toBe('busy');
    });
  });

  describe('get(agentId)', () => {
    it('should return the agent by id', () => {
      const agent = { id: 'agent-1', name: 'Agent One', role: 'worker', status: 'idle' };
      (registry as any).register(agent);
      const result = (registry as any).get('agent-1');
      // Should return the registered agent
      expect(result.id).toBe('agent-1');
      expect(result.name).toBe('Agent One');
    });
  });

  describe('has(agentId)', () => {
    it('should return true for registered agent', () => {
      const agent = { id: 'agent-1', name: 'Agent One', role: 'worker', status: 'idle' };
      (registry as any).register(agent);
      const exists = (registry as any).has('agent-1');
      // Should return true
      expect(exists).toBe(true);
    });

    it('should return false for unregistered agent', () => {
      const exists = (registry as any).has('nonexistent');
      // Should return false
      expect(exists).toBe(false);
    });
  });

  describe('getAll()', () => {
    it('should return all agents', () => {
      (registry as any).register({ id: 'a1', name: 'A1', role: 'worker', status: 'idle' });
      (registry as any).register({ id: 'a2', name: 'A2', role: 'manager', status: 'busy' });
      const all = (registry as any).getAll();
      // Should return both agents
      expect(all).toHaveLength(2);
    });
  });

  describe('getByRole(role)', () => {
    it('should filter agents by role', () => {
      (registry as any).register({ id: 'a1', name: 'A1', role: 'worker', status: 'idle' });
      (registry as any).register({ id: 'a2', name: 'A2', role: 'manager', status: 'idle' });
      (registry as any).register({ id: 'a3', name: 'A3', role: 'worker', status: 'busy' });
      const workers = (registry as any).getByRole('worker');
      // Should return only agents with role 'worker'
      expect(workers).toHaveLength(2);
      expect(workers.every((a: any) => a.role === 'worker')).toBe(true);
    });
  });

  describe('getByStatus(status)', () => {
    it('should filter agents by status', () => {
      (registry as any).register({ id: 'a1', name: 'A1', role: 'worker', status: 'idle' });
      (registry as any).register({ id: 'a2', name: 'A2', role: 'manager', status: 'busy' });
      (registry as any).register({ id: 'a3', name: 'A3', role: 'worker', status: 'idle' });
      const idle = (registry as any).getByStatus('idle');
      // Should return only agents with status 'idle'
      expect(idle).toHaveLength(2);
      expect(idle.every((a: any) => a.status === 'idle')).toBe(true);
    });
  });

  describe('getRoles()', () => {
    it('should list all unique roles', () => {
      (registry as any).register({ id: 'a1', name: 'A1', role: 'worker', status: 'idle' });
      (registry as any).register({ id: 'a2', name: 'A2', role: 'manager', status: 'idle' });
      (registry as any).register({ id: 'a3', name: 'A3', role: 'worker', status: 'busy' });
      const roles = (registry as any).getRoles();
      // Should return ['worker', 'manager'] (unique roles)
      expect(roles).toHaveLength(2);
      expect(roles).toContain('worker');
      expect(roles).toContain('manager');
    });
  });

  describe('getStatuses()', () => {
    it('should list all unique statuses', () => {
      (registry as any).register({ id: 'a1', name: 'A1', role: 'worker', status: 'idle' });
      (registry as any).register({ id: 'a2', name: 'A2', role: 'manager', status: 'busy' });
      const statuses = (registry as any).getStatuses();
      // Should return ['idle', 'busy'] (unique statuses)
      expect(statuses).toHaveLength(2);
      expect(statuses).toContain('idle');
      expect(statuses).toContain('busy');
    });
  });

  describe('search(criteria)', () => {
    it('should search with criteria', () => {
      (registry as any).register({ id: 'a1', name: 'Alpha Worker', role: 'worker', status: 'idle' });
      (registry as any).register({ id: 'a2', name: 'Beta Manager', role: 'manager', status: 'busy' });
      const results = (registry as any).search({ name: 'Alpha' });
      // Should return agents matching the criteria
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Alpha Worker');
    });
  });

  describe('clear()', () => {
    it('should remove all agents', () => {
      (registry as any).register({ id: 'a1', name: 'A1', role: 'worker', status: 'idle' });
      (registry as any).register({ id: 'a2', name: 'A2', role: 'manager', status: 'busy' });
      (registry as any).clear();
      const all = (registry as any).getAll();
      // Should return empty after clear
      expect(all).toHaveLength(0);
    });
  });

  describe('getMetrics()', () => {
    it('should return registry metrics', () => {
      (registry as any).register({ id: 'a1', name: 'A1', role: 'worker', status: 'idle' });
      (registry as any).register({ id: 'a2', name: 'A2', role: 'manager', status: 'busy' });
      const metrics = (registry as any).getMetrics();
      // Should return metrics about the registry (e.g., total agents, by role, by status)
      expect(metrics.totalAgents).toBe(2);
    });
  });

  describe('configure(config)', () => {
    it('should apply configuration', () => {
      const config = { maxAgents: 100, heartbeatTimeout: 30000 };
      (registry as any).configure(config);
      // Configuration should be applied to the registry
      expect((registry as any)._config.maxAgents).toBe(100);
    });
  });
});
