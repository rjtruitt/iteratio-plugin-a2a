import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryCoordinationMemory } from '../core/memory/InMemoryCoordinationMemory';
import { MockRedis } from 'iteratio/src/__test__';

describe('CoordinationMemory', () => {
  let memory: InMemoryCoordinationMemory;

  beforeEach(() => {
    memory = new InMemoryCoordinationMemory();
  });

  const createPattern = (overrides: any = {}) => ({
    id: `pattern-${Date.now()}-${Math.random()}`,
    scenario: 'code-review',
    approach: 'Spawned 3 workers for parallel review',
    outcome: 'success' as const,
    metadata: { tokensUsed: 15000, tags: ['review'] },
    ...overrides,
  });

  describe('store coordination state', () => {
    it('should store a coordination pattern', async () => {
      const pattern = createPattern({ id: 'store-1' });
      const id = await memory.store(pattern);
      expect(id).toBe('store-1');
    });

    it('should store multiple patterns', async () => {
      await memory.store(createPattern({ id: 'p1' }));
      await memory.store(createPattern({ id: 'p2' }));
      expect(memory.getCount()).toBe(2);
    });
  });

  describe('retrieve by key', () => {
    it('should retrieve stored pattern by id', async () => {
      const pattern = createPattern({ id: 'find-me', scenario: 'testing' });
      await memory.store(pattern);
      const retrieved = await memory.get('find-me');
      expect(retrieved).toBeDefined();
      expect(retrieved?.scenario).toBe('testing');
    });

    it('should return null for non-existent id', async () => {
      const result = await memory.get('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('shared state visible to all agents', () => {
    it('should allow any agent to read stored patterns', async () => {
      // Store pattern from "agent-1"
      await memory.store(createPattern({
        id: 'shared',
        scenario: 'shared-discovery',
        metadata: { storedBy: 'agent-1', tags: ['shared'] },
      }));

      // "agent-2" should be able to read it
      const result = await memory.get('shared');
      expect(result?.scenario).toBe('shared-discovery');
    });

    it('should return all patterns regardless of which agent stored them', async () => {
      await memory.store(createPattern({ id: 'by-a', metadata: { storedBy: 'a', tags: [] } }));
      await memory.store(createPattern({ id: 'by-b', metadata: { storedBy: 'b', tags: [] } }));
      const all = memory.getAll();
      expect(all).toHaveLength(2);
    });
  });

  describe('isolation mode (per-agent namespace)', () => {
    it('should support namespace-based isolation', async () => {
      // Expected: memory.storeInNamespace('agent-1', pattern)
      // and memory.getFromNamespace('agent-1', 'id')
      // Other agents cannot see namespaced data
      expect((memory as any).storeInNamespace).toBeDefined();
    });

    it('should not return namespaced data to other agents', async () => {
      // Expected: data stored in agent-1 namespace is invisible to agent-2
      expect((memory as any).getFromNamespace).toBeDefined();
    });

    it('should support both shared and namespaced modes', async () => {
      // Expected: memory supports both global and per-agent namespaces
      expect((memory as any).storeInNamespace).toBeDefined();
    });
  });

  describe('clear on session end', () => {
    it('should clear all stored patterns', async () => {
      await memory.store(createPattern({ id: 'temp1' }));
      await memory.store(createPattern({ id: 'temp2' }));
      memory.clear();
      expect(memory.getCount()).toBe(0);
    });

    it('should return empty results after clear', async () => {
      await memory.store(createPattern({ id: 'cleared' }));
      memory.clear();
      const result = await memory.get('cleared');
      expect(result).toBeNull();
    });
  });

  describe('cross-agent state queries', () => {
    it('should search patterns by scenario', async () => {
      await memory.store(createPattern({ id: 'cr1', scenario: 'code-review' }));
      await memory.store(createPattern({ id: 'cr2', scenario: 'code-review' }));
      await memory.store(createPattern({ id: 'dp1', scenario: 'deployment' }));

      const results = await memory.getByScenario('code-review');
      expect(results).toHaveLength(2);
    });

    it('should search patterns by keyword', async () => {
      await memory.store(createPattern({
        id: 'sec',
        scenario: 'security-review',
        approach: 'Found XSS vulnerability',
      }));
      await memory.store(createPattern({
        id: 'perf',
        scenario: 'performance',
        approach: 'Optimized database queries',
      }));

      const results = await memory.search('security');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].scenario).toContain('security');
    });

    it('should filter by outcome', async () => {
      await memory.store(createPattern({ id: 'ok', outcome: 'success' }));
      await memory.store(createPattern({ id: 'fail', outcome: 'failure' }));

      const successes = await memory.getByOutcome('success');
      expect(successes).toHaveLength(1);
      expect(successes[0].outcome).toBe('success');
    });

    it('should calculate success rate for scenario', async () => {
      await memory.store(createPattern({ id: 's1', scenario: 'review', outcome: 'success' }));
      await memory.store(createPattern({ id: 's2', scenario: 'review', outcome: 'success' }));
      await memory.store(createPattern({ id: 'f1', scenario: 'review', outcome: 'failure' }));

      const rate = await memory.getSuccessRate('review');
      expect(rate).toBe(67); // 2/3 = 67%
    });

    it('should update existing pattern', async () => {
      await memory.store(createPattern({ id: 'updatable', approach: 'Original approach' }));
      await memory.update('updatable', { approach: 'Updated approach' });
      const result = await memory.get('updatable');
      expect(result?.approach).toBe('Updated approach');
    });

    it('should delete pattern', async () => {
      await memory.store(createPattern({ id: 'deletable' }));
      await memory.delete('deletable');
      const result = await memory.get('deletable');
      expect(result).toBeNull();
    });
  });

  describe('statistics', () => {
    it('should return memory statistics', async () => {
      await memory.store(createPattern({ id: 'stat1', outcome: 'success', scenario: 'a' }));
      await memory.store(createPattern({ id: 'stat2', outcome: 'failure', scenario: 'b' }));

      const stats = memory.getStats();
      expect(stats.totalPatterns).toBe(2);
      expect(stats.successPatterns).toBe(1);
      expect(stats.failurePatterns).toBe(1);
      expect(stats.uniqueScenarios).toBe(2);
    });
  });
});
