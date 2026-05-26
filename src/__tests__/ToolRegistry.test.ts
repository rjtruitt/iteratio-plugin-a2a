import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolRegistry } from '../ToolRegistry';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('register(tool)', () => {
    it('should register a tool', () => {
      const tool = { name: 'read_file', category: 'filesystem', tags: ['io', 'read'], handler: vi.fn() };
      (registry as any).register(tool);
      // Tool should be retrievable after registration
      expect((registry as any).get('read_file')).toBeDefined();
    });
  });

  describe('unregister(toolName)', () => {
    it('should remove a tool', () => {
      const tool = { name: 'read_file', category: 'filesystem', tags: ['io'], handler: vi.fn() };
      (registry as any).register(tool);
      (registry as any).unregister('read_file');
      // Tool should no longer exist
      expect((registry as any).has('read_file')).toBe(false);
    });
  });

  describe('get(name)', () => {
    it('should return a tool by name', () => {
      const tool = { name: 'read_file', category: 'filesystem', tags: ['io'], handler: vi.fn() };
      (registry as any).register(tool);
      const result = (registry as any).get('read_file');
      // Should return the registered tool
      expect(result.name).toBe('read_file');
    });
  });

  describe('has(name)', () => {
    it('should return true for registered tool', () => {
      const tool = { name: 'read_file', category: 'filesystem', tags: ['io'], handler: vi.fn() };
      (registry as any).register(tool);
      const exists = (registry as any).has('read_file');
      // Should return true
      expect(exists).toBe(true);
    });

    it('should return false for unregistered tool', () => {
      const exists = (registry as any).has('nonexistent');
      // Should return false
      expect(exists).toBe(false);
    });
  });

  describe('getAll()', () => {
    it('should return all tools', () => {
      (registry as any).register({ name: 'tool_a', category: 'cat1', tags: [], handler: vi.fn() });
      (registry as any).register({ name: 'tool_b', category: 'cat2', tags: [], handler: vi.fn() });
      const all = (registry as any).getAll();
      // Should return both tools
      expect(all).toHaveLength(2);
    });
  });

  describe('getByCategory(cat)', () => {
    it('should filter tools by category', () => {
      (registry as any).register({ name: 'tool_a', category: 'filesystem', tags: [], handler: vi.fn() });
      (registry as any).register({ name: 'tool_b', category: 'network', tags: [], handler: vi.fn() });
      (registry as any).register({ name: 'tool_c', category: 'filesystem', tags: [], handler: vi.fn() });
      const fsTools = (registry as any).getByCategory('filesystem');
      // Should return only filesystem tools
      expect(fsTools).toHaveLength(2);
      expect(fsTools.every((t: any) => t.category === 'filesystem')).toBe(true);
    });
  });

  describe('getByTag(tag)', () => {
    it('should filter tools by tag', () => {
      (registry as any).register({ name: 'tool_a', category: 'fs', tags: ['io', 'read'], handler: vi.fn() });
      (registry as any).register({ name: 'tool_b', category: 'net', tags: ['io', 'network'], handler: vi.fn() });
      (registry as any).register({ name: 'tool_c', category: 'fs', tags: ['write'], handler: vi.fn() });
      const ioTools = (registry as any).getByTag('io');
      // Should return tools tagged with 'io'
      expect(ioTools).toHaveLength(2);
      expect(ioTools.every((t: any) => t.tags.includes('io'))).toBe(true);
    });
  });

  describe('getCategories()', () => {
    it('should list all unique categories', () => {
      (registry as any).register({ name: 'tool_a', category: 'filesystem', tags: [], handler: vi.fn() });
      (registry as any).register({ name: 'tool_b', category: 'network', tags: [], handler: vi.fn() });
      (registry as any).register({ name: 'tool_c', category: 'filesystem', tags: [], handler: vi.fn() });
      const categories = (registry as any).getCategories();
      // Should return ['filesystem', 'network']
      expect(categories).toHaveLength(2);
      expect(categories).toContain('filesystem');
      expect(categories).toContain('network');
    });
  });

  describe('getTags()', () => {
    it('should list all unique tags', () => {
      (registry as any).register({ name: 'tool_a', category: 'fs', tags: ['io', 'read'], handler: vi.fn() });
      (registry as any).register({ name: 'tool_b', category: 'net', tags: ['io', 'network'], handler: vi.fn() });
      const tags = (registry as any).getTags();
      // Should return ['io', 'read', 'network'] (unique tags)
      expect(tags).toHaveLength(3);
      expect(tags).toContain('io');
      expect(tags).toContain('read');
      expect(tags).toContain('network');
    });
  });

  describe('search(criteria)', () => {
    it('should search tools with criteria', () => {
      (registry as any).register({ name: 'read_file', category: 'filesystem', tags: ['io'], handler: vi.fn() });
      (registry as any).register({ name: 'write_file', category: 'filesystem', tags: ['io'], handler: vi.fn() });
      (registry as any).register({ name: 'http_get', category: 'network', tags: ['http'], handler: vi.fn() });
      const results = (registry as any).search({ category: 'filesystem', tag: 'io' });
      // Should return matching tools
      expect(results).toHaveLength(2);
      expect(results.every((t: any) => t.category === 'filesystem')).toBe(true);
    });
  });

  describe('clear()', () => {
    it('should remove all tools', () => {
      (registry as any).register({ name: 'tool_a', category: 'cat1', tags: [], handler: vi.fn() });
      (registry as any).register({ name: 'tool_b', category: 'cat2', tags: [], handler: vi.fn() });
      (registry as any).clear();
      const all = (registry as any).getAll();
      // Should return empty after clear
      expect(all).toHaveLength(0);
    });
  });

  describe('getMetrics()', () => {
    it('should return tool usage metrics', () => {
      (registry as any).register({ name: 'tool_a', category: 'cat1', tags: [], handler: vi.fn() });
      const metrics = (registry as any).getMetrics();
      // Should return metrics (e.g., total tools, invocation counts)
      expect(metrics.totalTools).toBe(1);
    });
  });

  describe('resetMetrics()', () => {
    it('should reset all metrics', () => {
      (registry as any).register({ name: 'tool_a', category: 'cat1', tags: [], handler: vi.fn() });
      (registry as any).resetMetrics();
      const metrics = (registry as any).getMetrics();
      // All counters should be zero after reset
      expect(metrics.invocations).toBe(0);
    });
  });

  describe('configure(config)', () => {
    it('should apply configuration', () => {
      const config = { maxTools: 500, enableMetrics: true };
      (registry as any).configure(config);
      // Configuration should be applied
      expect((registry as any)._config.maxTools).toBe(500);
    });
  });
});
