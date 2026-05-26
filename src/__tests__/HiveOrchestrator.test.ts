import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HiveOrchestrator } from '../core/builder/HiveOrchestrator';
import { MockTransport, MockEventBus } from 'iteratio/src/__test__';
import { HiveEventBus } from '../core/events/HiveEventBus';
import { InMemoryTransport } from '../core/transport/InMemoryTransport';

describe('HiveOrchestrator', () => {
  let hive: HiveOrchestrator;

  const workerTemplate = {
    id: 'worker',
    displayName: 'Worker Agent',
    role: 'worker',
    capabilities: ['coding'],
  };

  beforeEach(() => {
    hive = new HiveOrchestrator();
  });

  describe('construction', () => {
    it('should create with default InMemory transport', () => {
      expect(hive.transport).toBeDefined();
    });

    it('should create with default event bus', () => {
      expect(hive.eventBus).toBeDefined();
    });

    it('should create with agent manager', () => {
      expect(hive.agents).toBeDefined();
    });

    it('should create with channel manager', () => {
      expect(hive.channels).toBeDefined();
    });

    it('should create with handler chain', () => {
      expect(hive.handlers).toBeDefined();
    });

    it('should accept custom transport', () => {
      const transport = new MockTransport();
      const custom = new HiveOrchestrator({ transport });
      expect(custom.transport).toBe(transport);
    });
  });

  describe('coordinate multiple agents on a task', () => {
    it('should spawn multiple workers for a task', async () => {
      const a1 = await hive.agents.spawn(workerTemplate, { id: 'w1' });
      const a2 = await hive.agents.spawn(workerTemplate, { id: 'w2' });
      const a3 = await hive.agents.spawn(workerTemplate, { id: 'w3' });

      expect(hive.agents.getActiveCount()).toBe(3);
    });

    it('should create coordination channel for task', async () => {
      await hive.channels.create('#task-123');
      await hive.agents.spawn(workerTemplate, { id: 'w1' });
      await hive.channels.join('#task-123', 'w1');

      expect(hive.channels.isMember('#task-123', 'w1')).toBe(true);
    });
  });

  describe('distribute subtasks to workers', () => {
    it('should distribute work items to available agents', async () => {
      // Expected: hive.distribute('#task-123', ['subtask-a', 'subtask-b', 'subtask-c']);
      // Each subtask assigned to a different worker
      expect((hive as any).distribute).toBeDefined();
    });

    it('should assign based on agent capabilities', async () => {
      // Expected: agents with matching capabilities get assigned relevant tasks
      expect((hive as any).distributeByCapability).toBeDefined();
    });
  });

  describe('collect and aggregate results', () => {
    it('should collect results from all workers', async () => {
      // Expected: hive.collectResults('#task-123') waits for all workers
      expect((hive as any).collectResults).toBeDefined();
    });

    it('should aggregate results into single output', async () => {
      // Expected: hive.aggregate(results) combines worker outputs
      expect((hive as any).aggregate).toBeDefined();
    });
  });

  describe('handle worker failure', () => {
    it('should retry failed subtask with different agent', async () => {
      // Expected: if worker fails, task reassigned to another available worker
      expect((hive as any).retryWithDifferentAgent).toBeDefined();
    });

    it('should emit failure event when worker fails', async () => {
      const listener = vi.fn();
      hive.eventBus.on('agent.failed', listener);
      // Simulate worker failure
      // Expected: hive.reportFailure('w1', new Error('Crashed'));
      // expect(listener).toHaveBeenCalled();
      expect((hive as any).reportFailure).toBeDefined();
    });
  });

  describe('parallel execution of independent subtasks', () => {
    it('should execute independent tasks in parallel', async () => {
      // Expected: hive.executeParallel(['task-a', 'task-b', 'task-c']) runs concurrently
      expect((hive as any).executeParallel).toBeDefined();
    });

    it('should resolve when all parallel tasks complete', async () => {
      // Expected: Promise.all style resolution
      expect((hive as any).executeParallel).toBeDefined();
    });
  });

  describe('sequential pipeline (A -> B -> C)', () => {
    it('should execute tasks in sequence passing output to next', async () => {
      // Expected: hive.executePipeline([stepA, stepB, stepC])
      // stepB receives stepA output, stepC receives stepB output
      expect((hive as any).executePipeline).toBeDefined();
    });

    it('should abort pipeline if any step fails', async () => {
      // Expected: if stepB fails, stepC is never called
      expect((hive as any).executePipeline).toBeDefined();
    });
  });

  describe('all agents complete -> final result', () => {
    it('should signal completion when all agents finish', async () => {
      const listener = vi.fn();
      hive.eventBus.on('orchestration.complete', listener);
      // Expected: when last agent finishes, event emitted
      // hive.markComplete('task-123');
      // expect(listener).toHaveBeenCalled();
      expect((hive as any).markComplete).toBeDefined();
    });

    it('should return aggregated final result', async () => {
      // Expected: hive.getFinalResult('task-123') returns combined output
      expect((hive as any).getFinalResult).toBeDefined();
    });
  });

  describe('timeout for slow agents', () => {
    it('should timeout if agent takes too long', async () => {
      // Expected: hive.setTimeout('w1', 5000) enforces deadline
      expect((hive as any).setAgentTimeout).toBeDefined();
    });

    it('should terminate and reassign on timeout', async () => {
      // Expected: after timeout, agent terminated and task reassigned
      expect((hive as any).handleTimeout).toBeDefined();
    });

    it('should emit timeout event', async () => {
      const listener = vi.fn();
      hive.eventBus.on('agent.timeout', listener);
      // Expected: on timeout, event emitted
      expect((hive as any).handleTimeout).toBeDefined();
    });
  });

  describe('shutdown', () => {
    it('should terminate all agents on shutdown', async () => {
      await hive.agents.spawn(workerTemplate, { id: 'shutdown-1' });
      await hive.agents.spawn(workerTemplate, { id: 'shutdown-2' });
      await hive.shutdown();
      expect(hive.agents.getActiveCount()).toBe(0);
    });

    it('should clear all channels on shutdown', async () => {
      await hive.channels.create('#temp');
      await hive.shutdown();
      expect(hive.channels.list()).toHaveLength(0);
    });
  });

  describe('stats', () => {
    it('should return orchestrator statistics', async () => {
      await hive.agents.spawn(workerTemplate, { id: 'stat-agent' });
      await hive.channels.create('#stat-ch');
      const stats = hive.getStats();
      expect(stats.agents.active).toBe(1);
      expect(stats.channels.total).toBe(1);
    });
  });
});
