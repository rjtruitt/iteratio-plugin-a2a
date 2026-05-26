/**
 * BaseCoordinationMemory - Abstract base for coordination pattern storage
 *
 * Provides common functionality for storing and retrieving coordination patterns
 * (successful multi-agent strategies). Subclasses implement storage backends.
 *
 * @example
 * ```typescript
 * class MyVectorStore extends BaseCoordinationMemory {
 *   protected async storeImpl(pattern: CoordinationPattern): Promise<string> {
 *     // Your vector store logic
 *   }
 *   protected async searchImpl(query: string, options?: MemorySearchOptions): Promise<CoordinationPattern[]> {
 *     // Your search logic
 *   }
 * }
 * ```
 */

import type { ICoordinationMemory } from '../../types/interfaces.js';
import type { CoordinationPattern, MemorySearchOptions } from '../../types/memory.js';

export interface MemoryMetrics {
    patternsStored: number;
    patternsSearched: number;
    patternsRetrieved: number;
    patternsDeleted: number;
    cacheHits: number;
    cacheMisses: number;
    averageSearchTimeMs: number;
}

export interface MemoryConfig {
    /** Memory name for debugging */
    name?: string;
    /** Enable caching of recently accessed patterns */
    enableCache?: boolean;
    /** Cache size (number of patterns) */
    cacheSize?: number;
    /** Enable metrics collection */
    collectMetrics?: boolean;
    /** Validate patterns before storage */
    validate?: boolean;
}

/**
 * Abstract base class for coordination memory implementations
 */
export abstract class BaseCoordinationMemory implements ICoordinationMemory {
    protected readonly config: Required<MemoryConfig>;
    protected metrics: MemoryMetrics;
    protected cache: Map<string, CoordinationPattern>;
    private searchTimes: number[];

    constructor(config: MemoryConfig = {}) {
        this.config = {
            name: config.name || this.constructor.name,
            enableCache: config.enableCache ?? true,
            cacheSize: config.cacheSize ?? 100,
            collectMetrics: config.collectMetrics ?? true,
            validate: config.validate ?? true
        };

        this.metrics = {
            patternsStored: 0,
            patternsSearched: 0,
            patternsRetrieved: 0,
            patternsDeleted: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageSearchTimeMs: 0
        };

        this.cache = new Map();
        this.searchTimes = [];
    }

    /**
     * Store coordination pattern
     */
    async store(pattern: CoordinationPattern): Promise<string> {
        // Validate pattern
        if (this.config.validate) {
            this.validatePattern(pattern);
        }

        // Store implementation
        const id = await this.storeImpl(pattern);

        // Update cache
        if (this.config.enableCache) {
            this.addToCache(id, pattern);
        }

        // Update metrics
        if (this.config.collectMetrics) {
            this.metrics.patternsStored++;
        }

        return id;
    }

    /**
     * Search for similar patterns
     */
    async search(query: string, options?: MemorySearchOptions): Promise<CoordinationPattern[]> {
        const startTime = Date.now();

        // Execute search
        const results = await this.searchImpl(query, options);

        // Update cache with results
        if (this.config.enableCache) {
            for (const pattern of results) {
                this.addToCache(pattern.id, pattern);
            }
        }

        // Update metrics
        if (this.config.collectMetrics) {
            this.metrics.patternsSearched++;
            this.updateAverageSearchTime(Date.now() - startTime);
        }

        return results;
    }

    /**
     * Get pattern by ID
     */
    async get(id: string): Promise<CoordinationPattern | null> {
        // Check cache first
        if (this.config.enableCache) {
            const cached = this.cache.get(id);
            if (cached) {
                if (this.config.collectMetrics) {
                    this.metrics.cacheHits++;
                    this.metrics.patternsRetrieved++;
                }
                return cached;
            }
            if (this.config.collectMetrics) {
                this.metrics.cacheMisses++;
            }
        }

        // Get from storage
        const pattern = await this.getImpl(id);

        // Add to cache
        if (pattern && this.config.enableCache) {
            this.addToCache(id, pattern);
        }

        // Update metrics
        if (this.config.collectMetrics && pattern) {
            this.metrics.patternsRetrieved++;
        }

        return pattern;
    }

    /**
     * Update existing pattern
     */
    async update(id: string, updates: Partial<CoordinationPattern>): Promise<void> {
        // Get existing pattern
        const existing = await this.get(id);
        if (!existing) {
            throw new Error(`Pattern not found: ${id}`);
        }

        // Merge updates
        const updated = { ...existing, ...updates, id }; // Ensure ID doesn't change

        // Validate merged pattern
        if (this.config.validate) {
            this.validatePattern(updated);
        }

        // Update implementation
        await this.updateImpl(id, updates);

        // Update cache
        if (this.config.enableCache) {
            this.cache.set(id, updated);
        }
    }

    /**
     * Delete pattern
     */
    async delete(id: string): Promise<void> {
        // Delete from storage
        await this.deleteImpl(id);

        // Remove from cache
        if (this.config.enableCache) {
            this.cache.delete(id);
        }

        // Update metrics
        if (this.config.collectMetrics) {
            this.metrics.patternsDeleted++;
        }
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Get metrics
     */
    getMetrics(): MemoryMetrics {
        return { ...this.metrics };
    }

    /**
     * Reset metrics
     */
    resetMetrics(): void {
        this.metrics = {
            patternsStored: 0,
            patternsSearched: 0,
            patternsRetrieved: 0,
            patternsDeleted: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageSearchTimeMs: 0
        };
        this.searchTimes = [];
    }

    /**
     * Get memory name
     */
    getName(): string {
        return this.config.name;
    }

    // Template methods - subclasses must implement

    /**
     * Store pattern implementation
     */
    protected abstract storeImpl(pattern: CoordinationPattern): Promise<string>;

    /**
     * Search patterns implementation
     */
    protected abstract searchImpl(query: string, options?: MemorySearchOptions): Promise<CoordinationPattern[]>;

    /**
     * Get pattern implementation
     */
    protected abstract getImpl(id: string): Promise<CoordinationPattern | null>;

    /**
     * Update pattern implementation
     */
    protected abstract updateImpl(id: string, updates: Partial<CoordinationPattern>): Promise<void>;

    /**
     * Delete pattern implementation
     */
    protected abstract deleteImpl(id: string): Promise<void>;

    // Helper methods

    /**
     * Validate coordination pattern
     */
    protected validatePattern(pattern: CoordinationPattern): void {
        if (!pattern || typeof pattern !== 'object') {
            throw new Error('Invalid pattern: must be object');
        }
        if (!pattern.id || typeof pattern.id !== 'string') {
            throw new Error('Invalid pattern: id must be non-empty string');
        }
        if (!pattern.scenario || typeof pattern.scenario !== 'string') {
            throw new Error('Invalid pattern: scenario must be string');
        }
        if (!pattern.approach || typeof pattern.approach !== 'string') {
            throw new Error('Invalid pattern: approach must be string');
        }
        if (!pattern.outcome || !['success', 'failure', 'partial'].includes(pattern.outcome)) {
            throw new Error('Invalid pattern: outcome must be success, failure, or partial');
        }
    }

    /**
     * Add pattern to cache with LRU eviction
     */
    protected addToCache(id: string, pattern: CoordinationPattern): void {
        // Remove if already exists (for LRU)
        if (this.cache.has(id)) {
            this.cache.delete(id);
        }

        // Add to end (most recent)
        this.cache.set(id, pattern);

        // Evict oldest if cache full
        if (this.cache.size > this.config.cacheSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
    }

    /**
     * Update average search time
     */
    private updateAverageSearchTime(searchTime: number): void {
        this.searchTimes.push(searchTime);

        // Keep last 100 measurements
        if (this.searchTimes.length > 100) {
            this.searchTimes.shift();
        }

        // Calculate average
        const sum = this.searchTimes.reduce((a, b) => a + b, 0);
        this.metrics.averageSearchTimeMs = Math.round(sum / this.searchTimes.length);
    }
}
