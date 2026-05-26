/**
 * BaseToolAdapter - Abstract base for framework tool adapters
 *
 * Converts universal HiveTool format to framework-specific formats
 * (OpenAI, Anthropic, LangChain, etc.) with validation and error handling.
 *
 * @example
 * ```typescript
 * class MyFrameworkAdapter extends BaseToolAdapter<MyFrameworkTool> {
 *   protected adaptImpl(tool: HiveTool): MyFrameworkTool {
 *     return {
 *       name: tool.name,
 *       // Framework-specific conversion
 *     };
 *   }
 * }
 * ```
 */

import type { IToolAdapter, HiveTool, HiveToolResult } from '../../types/interfaces.js';

export interface AdapterMetrics {
    toolsAdapted: number;
    adaptationErrors: number;
    lastError?: Error;
    averageAdaptTimeMs: number;
}

export interface AdapterConfig {
    /** Adapter name for debugging */
    name?: string;
    /** Validate tools before adaptation */
    validate?: boolean;
    /** Enable metrics collection */
    collectMetrics?: boolean;
    /** Apply tool format compression */
    toolFormat?: 'proto' | 'compact' | 'standard' | 'verbose';
}

/**
 * Abstract base class for tool adapters
 */
export abstract class BaseToolAdapter<TFrameworkTool = unknown> implements IToolAdapter<TFrameworkTool> {
    protected readonly config: Required<Omit<AdapterConfig, 'toolFormat'>> & { toolFormat?: AdapterConfig['toolFormat'] };
    protected metrics: AdapterMetrics;
    private adaptTimes: number[];

    constructor(config: AdapterConfig = {}) {
        this.config = {
            name: config.name || this.constructor.name,
            validate: config.validate ?? true,
            collectMetrics: config.collectMetrics ?? true,
            toolFormat: config.toolFormat
        };

        this.metrics = {
            toolsAdapted: 0,
            adaptationErrors: 0,
            averageAdaptTimeMs: 0
        };

        this.adaptTimes = [];
    }

    /**
     * Adapt multiple tools to framework format
     */
    adapt(hiveTools: HiveTool[]): TFrameworkTool[] {
        if (!Array.isArray(hiveTools)) {
            throw new Error('Invalid input: hiveTools must be array');
        }

        const results: TFrameworkTool[] = [];

        for (const tool of hiveTools) {
            try {
                const adapted = this.adaptSingle(tool);
                results.push(adapted);
            } catch (error) {
                this.handleError(error as Error);
                // Re-throw to fail fast
                throw error;
            }
        }

        return results;
    }

    /**
     * Adapt single tool with validation and metrics
     */
    protected adaptSingle(tool: HiveTool): TFrameworkTool {
        const startTime = Date.now();

        // Validate tool
        if (this.config.validate) {
            this.validateTool(tool);
        }

        // Apply tool format compression if configured
        const processedTool = this.config.toolFormat
            ? this.applyToolFormat(tool, this.config.toolFormat)
            : tool;

        // Execute adaptation
        const adapted = this.adaptImpl(processedTool);

        // Update metrics
        if (this.config.collectMetrics) {
            this.metrics.toolsAdapted++;
            this.updateAverageAdaptTime(Date.now() - startTime);
        }

        return adapted;
    }

    /**
     * Convert framework result back to universal format (optional)
     */
    adaptResult?(frameworkResult: unknown): HiveToolResult;

    /**
     * Get adapter metrics
     */
    getMetrics(): AdapterMetrics {
        return { ...this.metrics };
    }

    /**
     * Reset metrics
     */
    resetMetrics(): void {
        this.metrics = {
            toolsAdapted: 0,
            adaptationErrors: 0,
            averageAdaptTimeMs: 0
        };
        this.adaptTimes = [];
    }

    /**
     * Get adapter name
     */
    getName(): string {
        return this.config.name;
    }

    // Template methods - subclasses must implement

    /**
     * Adapt tool implementation (framework-specific)
     */
    protected abstract adaptImpl(tool: HiveTool): TFrameworkTool;

    // Helper methods

    /**
     * Validate tool structure
     */
    protected validateTool(tool: HiveTool): void {
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

    /**
     * Apply tool format compression (stub -- delegates to ToolFormats when integrated)
     */
    protected applyToolFormat(
        tool: HiveTool,
        _format: 'proto' | 'compact' | 'standard' | 'verbose'
    ): HiveTool {
        return tool;
    }

    /**
     * Create standard error response
     */
    protected createErrorResult(error: Error): HiveToolResult {
        return {
            success: false,
            error: {
                code: 'ADAPTATION_ERROR',
                message: error.message
            }
        };
    }

    /**
     * Update average adaptation time
     */
    private updateAverageAdaptTime(adaptTime: number): void {
        this.adaptTimes.push(adaptTime);

        // Keep last 100 measurements
        if (this.adaptTimes.length > 100) {
            this.adaptTimes.shift();
        }

        // Calculate average
        const sum = this.adaptTimes.reduce((a, b) => a + b, 0);
        this.metrics.averageAdaptTimeMs = Math.round(sum / this.adaptTimes.length);
    }

    /**
     * Handle error
     */
    protected handleError(error: Error): void {
        if (this.config.collectMetrics) {
            this.metrics.adaptationErrors++;
            this.metrics.lastError = error;
        }
    }
}
