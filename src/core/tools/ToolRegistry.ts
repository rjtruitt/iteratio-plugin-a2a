/**
 * ToolRegistry - Central registry for tool discovery and management
 *
 * Provides a global registry for tool definitions with discovery by name,
 * category, and tags. Similar to a service registry pattern.
 *
 * @example
 * ```typescript
 * // Register tool
 * ToolRegistry.register({
 *   name: 'search_docs',
 *   description: 'Search documentation',
 *   parameters: { ... },
 *   handler: async (args) => ({ success: true, data: results }),
 *   metadata: { category: 'search', tags: ['docs', 'search'] }
 * });
 *
 * // Discover tools
 * const searchTools = ToolRegistry.getByCategory('search');
 * const allTools = ToolRegistry.getAll();
 * ```
 */

import type { HiveTool } from '../../types/interfaces.js';

export interface RegistryMetrics {
    totalTools: number;
    toolsByCategory: Map<string, number>;
    toolsByTag: Map<string, number>;
    registrations: number;
    unregistrations: number;
}

export interface RegistryConfig {
    /** Enable metrics collection */
    collectMetrics?: boolean;
    /** Allow duplicate tool names (last registration wins) */
    allowDuplicates?: boolean;
    /** Validate tool definitions on registration */
    validate?: boolean;
}

/**
 * Global tool registry for discovery and management
 */
export class ToolRegistry {
    private static instance: ToolRegistry;
    private tools: Map<string, HiveTool>;
    private config: Required<RegistryConfig>;
    private metrics: RegistryMetrics;

    private constructor(config: RegistryConfig = {}) {
        this.tools = new Map();
        this.config = {
            collectMetrics: config.collectMetrics ?? true,
            allowDuplicates: config.allowDuplicates ?? false,
            validate: config.validate ?? true
        };
        this.metrics = {
            totalTools: 0,
            toolsByCategory: new Map(),
            toolsByTag: new Map(),
            registrations: 0,
            unregistrations: 0
        };
    }

    /**
     * Get singleton instance
     */
    private static getInstance(): ToolRegistry {
        if (!ToolRegistry.instance) {
            ToolRegistry.instance = new ToolRegistry();
        }
        return ToolRegistry.instance;
    }

    /**
     * Register tool
     */
    static register(tool: HiveTool): void {
        const registry = this.getInstance();

        // Validate tool
        if (registry.config.validate) {
            registry.validateTool(tool);
        }

        // Check for duplicates
        if (!registry.config.allowDuplicates && registry.tools.has(tool.name)) {
            throw new Error(`Tool already registered: ${tool.name}`);
        }

        // Register tool
        registry.tools.set(tool.name, tool);

        // Update metrics
        if (registry.config.collectMetrics) {
            registry.metrics.totalTools = registry.tools.size;
            registry.metrics.registrations++;

            // Update category metrics
            if (tool.metadata?.category) {
                const count = registry.metrics.toolsByCategory.get(tool.metadata.category) || 0;
                registry.metrics.toolsByCategory.set(tool.metadata.category, count + 1);
            }

            // Update tag metrics
            if (tool.metadata?.tags) {
                for (const tag of tool.metadata.tags) {
                    const count = registry.metrics.toolsByTag.get(tag) || 0;
                    registry.metrics.toolsByTag.set(tag, count + 1);
                }
            }
        }
    }

    /**
     * Unregister tool
     */
    static unregister(name: string): boolean {
        const registry = this.getInstance();
        const tool = registry.tools.get(name);

        if (!tool) {
            return false;
        }

        registry.tools.delete(name);

        // Update metrics
        if (registry.config.collectMetrics) {
            registry.metrics.totalTools = registry.tools.size;
            registry.metrics.unregistrations++;

            // Update category metrics
            if (tool.metadata?.category) {
                const count = registry.metrics.toolsByCategory.get(tool.metadata.category) || 0;
                if (count > 1) {
                    registry.metrics.toolsByCategory.set(tool.metadata.category, count - 1);
                } else {
                    registry.metrics.toolsByCategory.delete(tool.metadata.category);
                }
            }

            // Update tag metrics
            if (tool.metadata?.tags) {
                for (const tag of tool.metadata.tags) {
                    const count = registry.metrics.toolsByTag.get(tag) || 0;
                    if (count > 1) {
                        registry.metrics.toolsByTag.set(tag, count - 1);
                    } else {
                        registry.metrics.toolsByTag.delete(tag);
                    }
                }
            }
        }

        return true;
    }

    /**
     * Get tool by name
     */
    static get(name: string): HiveTool | undefined {
        return this.getInstance().tools.get(name);
    }

    /**
     * Check if tool exists
     */
    static has(name: string): boolean {
        return this.getInstance().tools.has(name);
    }

    /**
     * Get all tools
     */
    static getAll(): HiveTool[] {
        return Array.from(this.getInstance().tools.values());
    }

    /**
     * Get tools by category
     */
    static getByCategory(category: string): HiveTool[] {
        const registry = this.getInstance();
        return Array.from(registry.tools.values()).filter(
            tool => tool.metadata?.category === category
        );
    }

    /**
     * Get tools by tag
     */
    static getByTag(tag: string): HiveTool[] {
        const registry = this.getInstance();
        return Array.from(registry.tools.values()).filter(
            tool => tool.metadata?.tags?.includes(tag)
        );
    }

    /**
     * Get all categories
     */
    static getCategories(): string[] {
        const registry = this.getInstance();
        const categories = new Set<string>();
        for (const tool of registry.tools.values()) {
            if (tool.metadata?.category) {
                categories.add(tool.metadata.category);
            }
        }
        return Array.from(categories);
    }

    /**
     * Get all tags
     */
    static getTags(): string[] {
        const registry = this.getInstance();
        const tags = new Set<string>();
        for (const tool of registry.tools.values()) {
            if (tool.metadata?.tags) {
                for (const tag of tool.metadata.tags) {
                    tags.add(tag);
                }
            }
        }
        return Array.from(tags);
    }

    /**
     * Search tools by name pattern
     */
    static search(pattern: string): HiveTool[] {
        const registry = this.getInstance();
        const regex = new RegExp(pattern, 'i');
        return Array.from(registry.tools.values()).filter(
            tool => regex.test(tool.name) || regex.test(tool.description)
        );
    }

    /**
     * Clear all tools
     */
    static clear(): void {
        const registry = this.getInstance();
        registry.tools.clear();
        if (registry.config.collectMetrics) {
            registry.metrics.totalTools = 0;
            registry.metrics.toolsByCategory.clear();
            registry.metrics.toolsByTag.clear();
        }
    }

    /**
     * Get registry metrics
     */
    static getMetrics(): RegistryMetrics {
        const registry = this.getInstance();
        return {
            ...registry.metrics,
            toolsByCategory: new Map(registry.metrics.toolsByCategory),
            toolsByTag: new Map(registry.metrics.toolsByTag)
        };
    }

    /**
     * Reset metrics
     */
    static resetMetrics(): void {
        const registry = this.getInstance();
        registry.metrics = {
            totalTools: registry.tools.size,
            toolsByCategory: new Map(),
            toolsByTag: new Map(),
            registrations: 0,
            unregistrations: 0
        };

        // Recalculate category and tag metrics
        for (const tool of registry.tools.values()) {
            if (tool.metadata?.category) {
                const count = registry.metrics.toolsByCategory.get(tool.metadata.category) || 0;
                registry.metrics.toolsByCategory.set(tool.metadata.category, count + 1);
            }
            if (tool.metadata?.tags) {
                for (const tag of tool.metadata.tags) {
                    const count = registry.metrics.toolsByTag.get(tag) || 0;
                    registry.metrics.toolsByTag.set(tag, count + 1);
                }
            }
        }
    }

    /**
     * Configure registry
     */
    static configure(config: RegistryConfig): void {
        const registry = this.getInstance();
        registry.config = {
            collectMetrics: config.collectMetrics ?? registry.config.collectMetrics,
            allowDuplicates: config.allowDuplicates ?? registry.config.allowDuplicates,
            validate: config.validate ?? registry.config.validate
        };
    }

    /**
     * Validate tool definition
     */
    private validateTool(tool: HiveTool): void {
        if (!tool || typeof tool !== 'object') {
            throw new Error('Invalid tool: must be object');
        }
        if (!tool.name || typeof tool.name !== 'string' || tool.name.trim().length === 0) {
            throw new Error('Invalid tool: name must be non-empty string');
        }
        if (!tool.description || typeof tool.description !== 'string') {
            throw new Error('Invalid tool: description must be string');
        }
        if (!tool.parameters || typeof tool.parameters !== 'object') {
            throw new Error('Invalid tool: parameters must be object');
        }
        if (tool.parameters.type !== 'object') {
            throw new Error('Invalid tool: parameters.type must be "object"');
        }
        if (!tool.parameters.properties || typeof tool.parameters.properties !== 'object') {
            throw new Error('Invalid tool: parameters.properties must be object');
        }
        if (typeof tool.handler !== 'function') {
            throw new Error('Invalid tool: handler must be function');
        }
    }
}
