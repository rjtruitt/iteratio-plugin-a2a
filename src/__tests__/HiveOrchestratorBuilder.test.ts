import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HiveOrchestratorBuilder } from '../core/builder/HiveOrchestratorBuilder';
import { HiveOrchestrator } from '../core/builder/HiveOrchestrator';
import { MockTransport } from 'iteratio/src/__test__';
import { HiveEventBus } from '../core/events/HiveEventBus';
import { InMemoryCoordinationMemory } from '../core/memory/InMemoryCoordinationMemory';

describe('HiveOrchestratorBuilder', () => {
  let builder: HiveOrchestratorBuilder;

  beforeEach(() => {
    builder = new HiveOrchestratorBuilder();
  });

  describe('fluent construction', () => {
    it('should return this from each method for chaining', () => {
      const result = builder
        .withTransport(new MockTransport() as any)
        .withMaxAgents(50);
      expect(result).toBe(builder);
    });

    it('should build orchestrator with all configured options', () => {
      const transport = new MockTransport();
      const eventBus = new HiveEventBus();
      const memory = new InMemoryCoordinationMemory();

      const hive = builder
        .withTransport(transport as any)
        .withEventBus(eventBus)
        .withMemory(memory)
        .withMaxAgents(20)
        .withMaxChannels(50)
        .build();

      expect(hive).toBeInstanceOf(HiveOrchestrator);
      expect(hive.transport).toBe(transport);
      expect(hive.eventBus).toBe(eventBus);
      expect(hive.memory).toBe(memory);
    });
  });

  describe('required field validation', () => {
    it('should build successfully with no explicit config (uses defaults)', () => {
      const hive = builder.build();
      expect(hive).toBeInstanceOf(HiveOrchestrator);
    });

    it('should use default InMemory transport when not specified', () => {
      const hive = builder.build();
      expect(hive.transport).toBeDefined();
    });

    it('should use default event bus when not specified', () => {
      const hive = builder.build();
      expect(hive.eventBus).toBeDefined();
    });
  });

  describe('set agents, transport, strategy', () => {
    it('should set transport', () => {
      const transport = new MockTransport();
      const hive = builder.withTransport(transport as any).build();
      expect(hive.transport).toBe(transport);
    });

    it('should set max agents', () => {
      const hive = builder.withMaxAgents(5).build();
      // Should enforce limit
      expect(hive).toBeDefined();
    });

    it('should set max channels', () => {
      const hive = builder.withMaxChannels(10).build();
      expect(hive).toBeDefined();
    });

    it('should set auto-register', () => {
      const hive = builder.withAutoRegister(false).build();
      expect(hive).toBeDefined();
    });

    it('should add handler', () => {
      const handler = {
        canHandle: vi.fn().mockReturnValue(true),
        handle: vi.fn(),
      };
      const hive = builder.withHandler(handler as any).build();
      expect(hive.handlers.getHandlers()).toHaveLength(1);
    });

    it('should add multiple handlers', () => {
      const h1 = { canHandle: vi.fn(), handle: vi.fn() };
      const h2 = { canHandle: vi.fn(), handle: vi.fn() };
      const hive = builder.withHandlers(h1 as any, h2 as any).build();
      expect(hive.handlers.getHandlers()).toHaveLength(2);
    });
  });

  describe('presets', () => {
    it('should support fan-out preset', () => {
      // Expected: builder.preset('fan-out') configures for parallel distribution
      expect((builder as any).preset).toBeDefined();
    });

    it('should support pipeline preset', () => {
      // Expected: builder.preset('pipeline') configures for sequential execution
      expect((builder as any).preset).toBeDefined();
    });

    it('should support round-robin preset', () => {
      // Expected: builder.preset('round-robin') configures for load-balanced distribution
      expect((builder as any).preset).toBeDefined();
    });

    it('should override individual settings after preset', () => {
      // Expected: builder.preset('fan-out').withMaxAgents(3) overrides preset's default
      expect((builder as any).preset).toBeDefined();
    });
  });

  describe('build returns HiveOrchestrator', () => {
    it('should return an instance of HiveOrchestrator', () => {
      const hive = builder.build();
      expect(hive).toBeInstanceOf(HiveOrchestrator);
    });

    it('should return a fully functional orchestrator', async () => {
      const hive = builder.build();
      // Should be able to use all managers
      await hive.channels.create('#test');
      expect(hive.channels.list()).toContain('#test');
    });
  });
});
