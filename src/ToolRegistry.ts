/**
 * Instance-based ToolRegistry for test isolation.
 *
 * Mirrors the singleton API from core/tools/ToolRegistry but avoids global
 * state, so tests can register/clear tools independently.
 */

export interface ToolEntry {
  name: string;
  category: string;
  tags: string[];
  handler: (...args: unknown[]) => unknown;
  [key: string]: unknown;
}

/** Registry that maps tool names to their handlers and adapters in the A2A network. */
export interface ToolRegistryConfig {
  maxTools?: number;
  enableMetrics?: boolean;
}

export class ToolRegistry {
  private tools: Map<string, ToolEntry> = new Map();
  private _config: ToolRegistryConfig = {};
  private _invocations: number = 0;

  register(tool: ToolEntry): void {
    this.tools.set(tool.name, { ...tool });
  }

  unregister(toolName: string): boolean {
    return this.tools.delete(toolName);
  }

  get(name: string): ToolEntry | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  getAll(): ToolEntry[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: string): ToolEntry[] {
    return this.getAll().filter(t => t.category === category);
  }

  getByTag(tag: string): ToolEntry[] {
    return this.getAll().filter(t => t.tags.includes(tag));
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    for (const tool of this.tools.values()) {
      categories.add(tool.category);
    }
    return Array.from(categories);
  }

  getTags(): string[] {
    const tags = new Set<string>();
    for (const tool of this.tools.values()) {
      for (const tag of tool.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags);
  }

  search(criteria: { category?: string; tag?: string; name?: string }): ToolEntry[] {
    return this.getAll().filter(tool => {
      if (criteria.category && tool.category !== criteria.category) return false;
      if (criteria.tag && !tool.tags.includes(criteria.tag)) return false;
      if (criteria.name && !tool.name.includes(criteria.name)) return false;
      return true;
    });
  }

  clear(): void {
    this.tools.clear();
  }

  getMetrics(): { totalTools: number; invocations: number } {
    return { totalTools: this.tools.size, invocations: this._invocations };
  }

  resetMetrics(): void {
    this._invocations = 0;
  }

  configure(config: ToolRegistryConfig): void {
    this._config = { ...this._config, ...config };
  }
}
